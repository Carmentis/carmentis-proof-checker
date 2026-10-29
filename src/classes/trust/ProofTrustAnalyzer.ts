import {
    ResolverNodeMapper,
    ResolverPath,
    SdJwt,
    X509,
    type JsonObject,
    type MappedNode,
    type ResolverReport,
} from '@cmts-dev/carmentis-sdk-core'
import type {
    CertificateInfo,
    EvidenceKind,
    Mismatch,
    Party,
    TrustCard,
    TrustEvidence,
    TrustLevel,
    TrustReport,
    TrustSegment,
    TrustTreeNode,
    UnresolvedTag,
    Verdict,
} from './types'

type Path = (string | number)[]

/** Tags that must leave a resolution node behind when they resolve successfully. */
const TAG_NODE_TYPES: Record<string, string[]> = {
    __link__: ['microblock', 'section'],
    __signature__: ['signature'],
    __digest__: ['digestData'],
    __vc__: ['vc'],
    __vp__: ['vp'],
    __certificate__: ['certificate'],
}

const MAX_MISMATCHES = 20

export interface AnalyzerInput {
    linkedJson: JsonObject
    /** The JSON recomputed locally by the checker. */
    resolvedJson: JsonObject
    /** The resolved JSON as claimed by the proof file. */
    claimedResolvedJson: JsonObject
    report: ResolverReport
    /** Raw record data of the microblocks reached through links (tags still unresolved inside). */
    hydrated?: unknown[]
}

interface SignatureTag {
    publicKey?: string
    context?: Record<string, unknown>
    payload?: unknown
}

interface CredentialCheck {
    valid: boolean
    issuer?: string
    claims: Record<string, unknown>
    validFrom?: Date | null
    validUntil?: Date | null
    certificates: CertificateInfo[]
}

interface Context {
    resolvedJson: unknown
    signatures: SignatureTag[]
    credentials: CredentialCheck[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getAt(root: unknown, path: Path): unknown {
    let current = root
    for (const segment of path) {
        if (Array.isArray(current) || isRecord(current)) {
            current = (current as Record<string | number, unknown>)[segment]
        } else {
            return undefined
        }
    }
    return current
}

function sameValue(a: unknown, b: unknown) {
    return JSON.stringify(a) === JSON.stringify(b)
}

function formatDate(date: Date | null | undefined) {
    return date ? date.toLocaleDateString() : undefined
}

async function describeCertificates(x5c: unknown): Promise<CertificateInfo[]> {
    if (!Array.isArray(x5c)) return []
    try {
        const certificates = X509.fromX5c(x5c as string[])
        return await Promise.all(
            certificates.map(async (certificate) => {
                const info = await certificate.getInformation()
                return {
                    subject: certificate.getSubject(),
                    commonName: certificate.getSubjectDN()['2.5.4.3']?.values?.[0],
                    issuer: certificate.getIssuer(),
                    notBefore: info.notBefore,
                    notAfter: info.notAfter,
                    selfSigned: info.selfSigned,
                }
            }),
        )
    } catch {
        return []
    }
}

/**
 * Collect the signature and credential tags found in the given sources. Credentials are decoded and
 * their issuer signature is re-checked here, since the SDK discards that result.
 */
async function collectTags(sources: unknown[]) {
    const signatures: SignatureTag[] = []
    const credentials: CredentialCheck[] = []
    const seenJwts = new Set<string>()
    const jobs: Promise<void>[] = []

    const visit = (value: unknown) => {
        if (Array.isArray(value)) {
            value.forEach(visit)
            return
        }
        if (!isRecord(value)) return
        const signature = value.__signature__
        if (isRecord(signature)) {
            signatures.push({
                publicKey: typeof signature.publicKey === 'string' ? signature.publicKey : undefined,
                context: isRecord(signature.context) ? signature.context : undefined,
                payload: signature.payload,
            })
        }
        for (const tag of ['__vc__', '__vp__']) {
            const payload = value[tag]
            if (!isRecord(payload)) continue
            const jwt = payload.sdjwt_ietf ?? payload.__sdjwt_ietf__
            if (typeof jwt !== 'string' || seenJwts.has(jwt)) continue
            seenJwts.add(jwt)
            jobs.push(
                (async () => {
                    const sdJwt = new SdJwt(jwt)
                    try {
                        const decoded = await sdJwt.decode()
                        credentials.push({
                            valid: decoded.valid,
                            issuer: await sdJwt.getIssuer().catch(() => undefined),
                            claims: decoded.claims,
                            validFrom: decoded.info.validFrom,
                            validUntil: decoded.info.validUntil,
                            certificates: await describeCertificates(decoded.issuerJwk?.x5c),
                        })
                    } catch {
                        credentials.push({ valid: false, claims: {}, certificates: [] })
                    }
                })(),
            )
        }
        for (const child of Object.values(value)) visit(child)
    }

    sources.forEach(visit)
    await Promise.all(jobs)
    return { signatures, credentials }
}

function toEvidence(mapped: MappedNode, ctx: Context): TrustEvidence {
    const node = mapped.node
    const base = { attachedAt: mapped.path, inherited: mapped.depth > 0 }
    const key = mapped.path[mapped.path.length - 1] ?? ''
    const value = getAt(ctx.resolvedJson, mapped.path)
    switch (node.type) {
        case 'microblock':
            return {
                ...base,
                kind: 'onchain',
                title: `Microblock #${node.height}`,
                reason:
                    'This data was read from a microblock of the blockchain. Its fields were rebuilt from the proof and checked against the Merkle root stored on-chain, so they cannot have been altered after being recorded.',
                details: [
                    { label: 'Virtual blockchain', value: node.vbId },
                    { label: 'Height', value: String(node.height) },
                    { label: 'Microblock hash', value: node.hash },
                ],
                party: { id: node.publicKey, kind: 'key', role: 'author' },
            }
        case 'section':
            return {
                ...base,
                kind: 'onchain',
                title: `Section ${node.index} of microblock #${node.height}`,
                reason:
                    'This data is the content of a section of a microblock found on the blockchain.',
                details: [
                    { label: 'Virtual blockchain', value: node.vbId },
                    { label: 'Height', value: String(node.height) },
                    { label: 'Section', value: String(node.index) },
                    { label: 'Microblock hash', value: node.microblockHash },
                ],
                party: { id: node.publicKey, kind: 'key', role: 'author' },
            }
        case 'signature': {
            const candidates = ctx.signatures.filter((s) => s.publicKey === node.publicKey)
            const tag =
                candidates.find(
                    (s) => isRecord(s.payload) && key in s.payload && sameValue(s.payload[key], value),
                ) ?? candidates[0]
            const details = [{ label: 'Public key', value: node.publicKey }]
            if (typeof tag?.context?.purpose === 'string') {
                details.push({ label: 'Purpose', value: tag.context.purpose })
            }
            if (typeof tag?.context?.signedAt === 'number') {
                details.push({
                    label: 'Signed at',
                    value: new Date(tag.context.signedAt).toLocaleString(),
                })
            }
            return {
                ...base,
                kind: 'signed',
                title: 'Signature',
                reason:
                    'This data is the payload of a signature that verified against the public key below. The owner of this key is not identified yet: the signature shows that the holder of the key vouched for the data.',
                details,
                party: { id: node.publicKey, kind: 'key', role: 'signer' },
            }
        }
        case 'digestData':
            return {
                ...base,
                kind: 'digest',
                title: 'Digest match',
                reason:
                    'This data hashes to the digest it was linked with, so it is exactly the data the digest refers to. The digest itself only adds trust if it is anchored on-chain or signed.',
                details: [{ label: 'Digest', value: node.digest }],
            }
        case 'vc':
        case 'vp': {
            const title = node.type === 'vc' ? 'Verifiable credential' : 'Verifiable presentation'
            const candidates = ctx.credentials.filter((c) => sameValue(c.claims[String(key)], value))
            const failed = candidates.length > 0 && candidates.every((c) => !c.valid)
            const match = candidates.find((c) => c.valid) ?? candidates[0]
            const details: { label: string; value: string }[] = []
            if (match?.issuer) details.push({ label: 'Issuer', value: match.issuer })
            const validFrom = formatDate(match?.validFrom)
            const validUntil = formatDate(match?.validUntil)
            if (validFrom) details.push({ label: 'Valid from', value: validFrom })
            if (validUntil) details.push({ label: 'Valid until', value: validUntil })
            return {
                ...base,
                kind: 'credential',
                title,
                failed,
                reason: failed
                    ? 'The issuer signature of this credential did not verify when checked locally.'
                    : match
                      ? 'These are claims disclosed by an SD-JWT. The issuer signature was checked locally and is valid.'
                      : 'These are claims disclosed by an SD-JWT. The issuer signature could not be re-checked locally.',
                details,
                party: match?.issuer ? { id: match.issuer, kind: 'issuer', role: 'issuer' } : undefined,
                certificates: match?.certificates,
            }
        }
        case 'certificate':
            return {
                ...base,
                kind: 'certificate',
                title: 'Certificate',
                reason:
                    'This is the content of an X.509 certificate. It was parsed, but its chain of trust is not evaluated yet.',
                details: [],
            }
    }
}

function computeLevel(evidence: TrustEvidence[]): TrustLevel {
    if (evidence.some((e) => e.failed)) return 'failed'
    const has = (kind: EvidenceKind) => evidence.some((e) => e.kind === kind)
    if (has('onchain') && has('signed')) return 'onchain-signed'
    if (has('onchain')) return 'onchain'
    if (has('signed') || has('credential')) return 'authenticated'
    return 'untrusted'
}

function deepDiff(claimed: unknown, recomputed: unknown, path: Path, out: Mismatch[]) {
    if (out.length >= MAX_MISMATCHES) return
    if (Array.isArray(claimed) && Array.isArray(recomputed)) {
        const length = Math.max(claimed.length, recomputed.length)
        for (let i = 0; i < length; i++) deepDiff(claimed[i], recomputed[i], [...path, i], out)
        return
    }
    if (isRecord(claimed) && isRecord(recomputed)) {
        const keys = new Set([...Object.keys(claimed), ...Object.keys(recomputed)])
        for (const key of keys) deepDiff(claimed[key], recomputed[key], [...path, key], out)
        return
    }
    if (!sameValue(claimed, recomputed)) {
        out.push({ path, claimed, recomputed })
    }
}

function findUnresolvedTags(linkedJson: unknown, report: ResolverReport): UnresolvedTag[] {
    const entries = [...report.nodes.entries()].map(([key, nodes]) => ({
        path: JSON.parse(key) as Path,
        types: nodes.map((n) => n.type as string),
    }))
    const unresolved: UnresolvedTag[] = []

    const visit = (value: unknown, path: Path) => {
        if (Array.isArray(value)) {
            value.forEach((item, i) => visit(item, [...path, i]))
            return
        }
        if (!isRecord(value)) return
        for (const [tag, expected] of Object.entries(TAG_NODE_TYPES)) {
            if (!(tag in value)) continue
            const resolved = entries.some(
                (entry) =>
                    entry.path.length === path.length + 1 &&
                    path.every((segment, i) => entry.path[i] === segment) &&
                    entry.types.some((type) => expected.includes(type)),
            )
            if (!resolved) {
                unresolved.push({
                    tag,
                    path,
                    reason:
                        'The checker could not resolve this element: the link may be unreachable, the proof for it may be missing or invalid, or a signature or digest did not match. Its content is not part of the verified data.',
                })
            }
        }
        for (const [key, child] of Object.entries(value)) {
            if (key in TAG_NODE_TYPES) continue
            visit(child, [...path, key])
        }
    }

    visit(linkedJson, [])
    return unresolved
}

/**
 * The SDK attaches a resolution node to every key a tag produced, not to the object holding the
 * tag. Siblings sharing the same evidence therefore come from one tag: group them into a card.
 */
function toSegments(children: TrustTreeNode[], nextId: () => string): TrustSegment[] {
    const segments: TrustSegment[] = []
    const cards = new Map<string, TrustCard>()
    for (const child of children) {
        if (child.own.length === 0) {
            segments.push({ type: 'node', node: child })
            continue
        }
        const signature = JSON.stringify(
            child.own.map((e) => [e.kind, e.title, e.details, e.party?.id, e.failed ?? false]),
        )
        let card = cards.get(signature)
        if (!card) {
            card = {
                type: 'card',
                id: nextId(),
                evidence: child.own,
                level: child.level,
                children: [],
                paths: [],
            }
            cards.set(signature, card)
            segments.push(card)
        }
        card.children.push(child)
        card.paths.push(child.path.join('.'))
    }
    return segments
}

function shortId(id: string) {
    return id.length > 24 ? `${id.slice(0, 14)}…${id.slice(-6)}` : id
}

function collectParties(root: TrustTreeNode): Party[] {
    const parties = new Map<string, Party>()
    const visitNode = (node: TrustTreeNode) => node.segments.forEach(visitSegment)
    const visitSegment = (segment: TrustSegment) => {
        if (segment.type === 'node') {
            visitNode(segment.node)
            return
        }
        for (const evidence of segment.evidence) {
            const ref = evidence.party
            if (!ref) continue
            let party = parties.get(ref.id)
            if (!party) {
                party = {
                    id: ref.id,
                    kind: ref.kind,
                    label: shortId(ref.id),
                    appearances: [],
                    certificates: [],
                }
                parties.set(ref.id, party)
            }
            if (evidence.certificates?.length && party.certificates.length === 0) {
                party.certificates = evidence.certificates
            }
            party.appearances.push({
                cardId: segment.id,
                role: ref.role,
                title: evidence.title,
                covers: segment.paths,
                level: segment.level,
            })
        }
        segment.children.forEach(visitNode)
    }
    visitNode(root)
    return [...parties.values()]
}

export async function analyzeProof(input: AnalyzerInput): Promise<TrustReport> {
    const mapper = new ResolverNodeMapper(input.report.nodes)
    const { signatures, credentials } = await collectTags([
        input.linkedJson,
        ...(input.hydrated ?? []),
    ])
    const ctx: Context = { resolvedJson: input.resolvedJson, signatures, credentials }
    const counts: Record<TrustLevel, number> = {
        untrusted: 0,
        authenticated: 0,
        onchain: 0,
        'onchain-signed': 0,
        failed: 0,
    }
    let totalLeaves = 0
    let cardCount = 0
    const nextId = () => `trust-card-${++cardCount}`

    const evidenceAt = (path: Path): TrustEvidence[] =>
        mapper
            .map(new ResolverPath([...path]))
            .sort((a, b) => a.depth - b.depth)
            .map((m) => toEvidence(m, ctx))

    const build = (value: unknown, path: Path, key: string | number | null): TrustTreeNode => {
        const evidence = evidenceAt(path)
        const own = evidence.filter((e) => !e.inherited)
        const level = computeLevel(evidence)
        if (Array.isArray(value) || isRecord(value)) {
            const entries: [string | number, unknown][] = Array.isArray(value)
                ? value.map((v, i) => [i, v])
                : Object.entries(value)
            const children = entries.map(([k, v]) => build(v, [...path, k], k))
            if (children.length > 0) {
                return {
                    key,
                    path,
                    type: Array.isArray(value) ? 'array' : 'object',
                    children,
                    level,
                    own,
                    evidence,
                    segments: toSegments(children, nextId),
                }
            }
        }
        totalLeaves++
        counts[level]++
        return { key, path, type: 'leaf', value, children: [], level, own, evidence, segments: [] }
    }

    const root = build(input.resolvedJson, [], null)

    const mismatches: Mismatch[] = []
    deepDiff(input.claimedResolvedJson, input.resolvedJson, [], mismatches)
    const unresolved = findUnresolvedTags(input.linkedJson, input.report)

    let verdict: Verdict = 'verified'
    if (counts.untrusted > 0) verdict = 'limited'
    if (mismatches.length > 0 || unresolved.length > 0 || counts.failed > 0) verdict = 'failed'

    return { root, parties: collectParties(root), unresolved, mismatches, counts, totalLeaves, verdict }
}
