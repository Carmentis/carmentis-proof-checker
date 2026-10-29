import {
    ResolverNodeMapper,
    ResolverPath,
    X509,
    type JsonObject,
    type MappedNode,
    type Provider,
    type ResolverReport,
} from '@cmts-dev/carmentis-sdk-core'
import { identifyParties } from './PartyIdentifier'
import { checkSdJwt, type SdJwtCheck } from './SdJwtChecker'
import type {
    CertificateInfo,
    CertificateView,
    DistinguishedNameEntry,
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

/** The raw tag key that stands in the data for a node of a given type, until the tag is resolved. */
const TYPE_TAG: Record<string, string> = {
    microblock: '__link__',
    section: '__link__',
    signature: '__signature__',
    vc: '__vc__',
    vp: '__vp__',
    digestData: '__digest__',
    certificate: '__certificate__',
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
    /** When given, the anchoring parties are identified through the chain. */
    provider?: Provider
}

interface SignatureTag {
    publicKey?: string
    context?: Record<string, unknown>
    payload?: unknown
}

interface CredentialCheck extends SdJwtCheck {
    certificates: CertificateInfo[]
}

interface Context {
    /** Keys, per parent path, that carry a credential node: they all come from the same credential. */
    vcKeysByParent: Map<string, string[]>
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
                checkSdJwt(jwt).then(async (check) => {
                    credentials.push({ ...check, certificates: await describeCertificates(check.issuerJwk?.x5c) })
                }),
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
                origin: { vbId: node.vbId, height: node.height },
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
                origin: { vbId: node.vbId, height: node.height },
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
            // All keys a tag produced share one credential: pick the one matching most of them, so a key
            // whose value happens to be identical in two credentials (iss, vct...) cannot split the card.
            const parent = mapped.path.slice(0, -1)
            const siblingKeys = ctx.vcKeysByParent.get(JSON.stringify(parent)) ?? [String(key)]
            const score = (c: CredentialCheck) =>
                siblingKeys.filter((k) => sameValue(c.claims[k], getAt(ctx.resolvedJson, [...parent, k]))).length
            const match = ctx.credentials
                .filter((c) => score(c) > 0)
                .sort((a, b) => score(b) - score(a) || Number(b.valid) - Number(a.valid))[0]
            const failed = match !== undefined && !match.valid
            const details: { label: string; value: string }[] = []
            if (match?.issuer) details.push({ label: 'Issuer', value: match.issuer })
            if (match?.subject) details.push({ label: 'Subject', value: match.subject })
            const validFrom = formatDate(match?.validFrom)
            const validUntil = formatDate(match?.validUntil)
            if (validFrom) details.push({ label: 'Valid from', value: validFrom })
            if (validUntil) details.push({ label: 'Valid until', value: validUntil })
            if (match?.keyBinding === 'valid') details.push({ label: 'Holder key binding', value: 'Valid' })
            if (match?.hasStatus) details.push({ label: 'Revocation status', value: 'Not verified' })
            return {
                ...base,
                kind: 'credential',
                title,
                failed,
                reason: failed
                    ? match?.problem === 'key-binding'
                        ? 'The holder key binding of this presentation did not verify when checked locally.'
                        : 'The issuer signature of this credential did not verify when checked locally.'
                    : match
                      ? `These are claims disclosed by an SD-JWT. The issuer signature${match.keyBinding === 'valid' ? ' and the holder key binding were' : ' was'} checked locally and ${match.keyBinding === 'valid' ? 'are' : 'is'} valid.${match.hasStatus ? ' The revocation status was not verified, so this credential may have been revoked.' : ''}`
                      : 'These are claims disclosed by an SD-JWT. The issuer signature could not be re-checked locally.',
                details,
                party: match?.issuer ? { id: match.issuer, kind: 'issuer', role: 'issuer' } : undefined,
                certificates: match?.certificates,
                subject: match?.subject,
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
function toSegments(children: TrustTreeNode[], nextId: () => string, layer = 0): TrustSegment[] {
    const segments: TrustSegment[] = []
    const cards = new Map<string, TrustCard>()
    for (const child of children) {
        // Evidence is ordered outermost first: layer N is the Nth tag wrapping this value.
        const evidence = child.own[layer]
        if (!evidence) {
            segments.push({ type: 'node', node: child })
            continue
        }
        const signature = JSON.stringify([
            evidence.kind,
            evidence.title,
            evidence.details,
            evidence.party?.id,
            evidence.failed ?? false,
        ])
        let card = cards.get(signature)
        if (!card) {
            card = {
                type: 'card',
                id: nextId(),
                evidence: [evidence],
                level: child.level,
                children: [],
                segments: [],
                paths: [],
            }
            cards.set(signature, card)
            segments.push(card)
        }
        card.children.push(child)
        card.paths.push(child.path.join('.'))
    }
    for (const card of cards.values()) card.segments = toSegments(card.children, nextId, layer + 1)
    return segments
}

function toDistinguishedName(value: unknown): DistinguishedNameEntry[] {
    if (!isRecord(value)) return []
    return Object.values(value).flatMap((entry) =>
        isRecord(entry) && Array.isArray(entry.values)
            ? [{ name: String(entry.shortName ?? ''), value: entry.values.join(', ') }]
            : [],
    )
}

function toCertificateView(value: unknown): CertificateView | null {
    if (!isRecord(value) || !isRecord(value.info) || !isRecord(value.subject)) return null
    const subject = toDistinguishedName(value.subject)
    return {
        commonName: subject.find((e) => e.name === 'CN')?.value,
        subject,
        issuer: toDistinguishedName(value.issuer),
        notBefore: String(value.info.notBefore ?? ''),
        notAfter: String(value.info.notAfter ?? ''),
        serialNumber: String(value.info.serialNumber ?? ''),
        selfSigned: value.info.selfSigned === true,
    }
}

/** `x509Chain` (array) and `x509` (object) are the shapes certificates take in resolved JSON. */
function findCertificates(key: string | number | null, value: unknown): CertificateView[] | undefined {
    const candidates = key === 'x509Chain' && Array.isArray(value) ? value : key === 'x509' ? [value] : null
    if (!candidates || candidates.length === 0) return undefined
    const views = candidates.map(toCertificateView)
    return views.every((v): v is CertificateView => v !== null) ? views : undefined
}

/** Prefer what the chain tells us (organization), then a certificate subject. */
function nameOf(party: Party): string | undefined {
    if (party.identity?.isOrganizationAccount && party.identity.organization) {
        return party.identity.organization.name
    }
    const commonName = party.certificates[0]?.commonName
    if (commonName) return commonName
    if (party.identity?.organization) return `Key of ${party.identity.organization.name}`
    return undefined
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
                origin: evidence.origin,
            })
        }
        segment.segments.forEach(visitSegment)
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
    const vcKeysByParent = new Map<string, string[]>()
    for (const [serialized, nodes] of input.report.nodes) {
        if (!nodes.some((n) => n.type === 'vc' || n.type === 'vp')) continue
        const path = JSON.parse(serialized) as Path
        const parent = JSON.stringify(path.slice(0, -1))
        vcKeysByParent.set(parent, [...(vcKeysByParent.get(parent) ?? []), String(path[path.length - 1])])
    }
    const ctx: Context = { vcKeysByParent, resolvedJson: input.resolvedJson, signatures, credentials }
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

    /**
     * A tag nested in the output of another one (a certificate inside a linked section, say) leaves the
     * outer node on the raw tag key, which is replaced by the inner output. Recover those outer nodes so
     * the inner values are wrapped by them.
     */
    const outerNodesOf = (parent: Path, innerTypes: string[]): MappedNode[] => {
        const outer: MappedNode[] = []
        let types = innerTypes
        for (let guard = 0; guard < 4 && types.length > 0; guard++) {
            const found = types.flatMap((type) => {
                const tag = TYPE_TAG[type]
                return tag ? mapper.map(new ResolverPath([...parent, tag])).filter((m) => m.depth === 0) : []
            })
            if (found.length === 0) break
            outer.unshift(...found)
            types = found.map((m) => m.node.type as string)
        }
        return outer
    }

    const evidenceAt = (path: Path): TrustEvidence[] => {
        const mapped = mapper.map(new ResolverPath([...path])).sort((a, b) => a.depth - b.depth)
        // Wrapping nodes of every node that applies here; for values deeper than the tag they are inherited too.
        const seen = new Set<string>()
        const outer = mapped
            .flatMap((m) =>
                outerNodesOf(m.path.slice(0, -1), [m.node.type as string]).map((o) => ({ ...o, depth: m.depth })),
            )
            .filter((o) => {
                const id = JSON.stringify([o.path, o.node])
                return !seen.has(id) && seen.add(id)
            })
        return [...outer, ...mapped].map((m) => toEvidence(m, ctx))
    }

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
                    certificates: findCertificates(key, value),
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

    const parties = collectParties(root)
    const vbIdentities = input.provider ? await identifyParties(parties, input.provider) : {}
    for (const party of parties) party.name = nameOf(party)

    return { root, parties, vbIdentities, unresolved, mismatches, counts, totalLeaves, verdict }
}
