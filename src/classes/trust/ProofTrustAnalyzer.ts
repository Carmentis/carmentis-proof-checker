import {
    ResolverNodeMapper,
    ResolverPath,
    SdJwt,
    type JsonObject,
    type MappedNode,
    type ResolverReport,
} from '@cmts-dev/carmentis-sdk-core'
import type {
    EvidenceKind,
    Mismatch,
    TrustEvidence,
    TrustLevel,
    TrustReport,
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
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Local re-check of the SD-JWT carried by __vc__ / __vp__ tags: the SDK discards this result. */
async function checkCredentials(linkedJson: unknown): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    const jobs: Promise<void>[] = []

    const visit = (value: unknown, path: Path) => {
        if (Array.isArray(value)) {
            value.forEach((item, i) => visit(item, [...path, i]))
            return
        }
        if (!isRecord(value)) return
        for (const tag of ['__vc__', '__vp__']) {
            const payload = value[tag]
            if (!isRecord(payload)) continue
            const jwt = payload.sdjwt_ietf ?? payload.__sdjwt_ietf__
            if (typeof jwt !== 'string') continue
            jobs.push(
                new SdJwt(jwt)
                    .decode()
                    .then((decoded) => {
                        results.set(JSON.stringify(path), decoded.valid)
                    })
                    .catch(() => {
                        results.set(JSON.stringify(path), false)
                    }),
            )
        }
        for (const [key, child] of Object.entries(value)) visit(child, [...path, key])
    }

    visit(linkedJson, [])
    await Promise.all(jobs)
    return results
}

function toEvidence(mapped: MappedNode, credentialChecks: Map<string, boolean>): TrustEvidence {
    const node = mapped.node
    const base = { attachedAt: mapped.path, inherited: mapped.depth > 0 }
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
            }
        case 'signature':
            return {
                ...base,
                kind: 'signed',
                title: 'Signature',
                reason:
                    'This data is the payload of a signature that verified against the public key below. The owner of this key is not identified yet: the signature shows that the holder of the key vouched for the data.',
                details: [{ label: 'Public key', value: node.publicKey }],
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
            const label = node.type === 'vc' ? 'Verifiable credential' : 'Verifiable presentation'
            const check =
                credentialChecks.get(JSON.stringify(mapped.path)) ??
                credentialChecks.get(JSON.stringify(mapped.path.slice(0, -1)))
            const failed = check === false
            return {
                ...base,
                kind: 'credential',
                title: label,
                failed,
                reason: failed
                    ? 'The issuer signature of this credential did not verify when checked locally.'
                    : check === true
                      ? 'These are claims disclosed by an SD-JWT. The issuer signature was checked locally and is valid.'
                      : 'These are claims disclosed by an SD-JWT. The issuer signature could not be re-checked locally.',
                details: [],
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
    if (JSON.stringify(claimed) !== JSON.stringify(recomputed)) {
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

export async function analyzeProof(input: AnalyzerInput): Promise<TrustReport> {
    const mapper = new ResolverNodeMapper(input.report.nodes)
    const credentialChecks = await checkCredentials(input.linkedJson)
    const counts: Record<TrustLevel, number> = {
        untrusted: 0,
        authenticated: 0,
        onchain: 0,
        'onchain-signed': 0,
        failed: 0,
    }
    let totalLeaves = 0

    const evidenceAt = (path: Path): TrustEvidence[] => {
        const mapped = mapper.map(new ResolverPath([...path]))
        return mapped
            .slice()
            .sort((a, b) => a.depth - b.depth)
            .map((m) => toEvidence(m, credentialChecks))
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
                }
            }
        }
        totalLeaves++
        counts[level]++
        return { key, path, type: 'leaf', value, children: [], level, own, evidence }
    }

    const root = build(input.resolvedJson, [], null)

    const mismatches: Mismatch[] = []
    deepDiff(input.claimedResolvedJson, input.resolvedJson, [], mismatches)
    const unresolved = findUnresolvedTags(input.linkedJson, input.report)

    let verdict: Verdict = 'verified'
    if (counts.untrusted > 0) verdict = 'limited'
    if (mismatches.length > 0 || unresolved.length > 0 || counts.failed > 0) verdict = 'failed'

    return { root, unresolved, mismatches, counts, totalLeaves, verdict }
}
