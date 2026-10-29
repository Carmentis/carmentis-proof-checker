export type TrustLevel =
    | 'untrusted'
    | 'authenticated'
    | 'onchain'
    | 'onchain-signed'
    | 'failed'

export type EvidenceKind =
    | 'onchain'
    | 'signed'
    | 'digest'
    | 'credential'
    | 'certificate'

export interface TrustEvidence {
    kind: EvidenceKind
    title: string
    reason: string
    /** Path of the JSON object the evidence is attached to. */
    attachedAt: (string | number)[]
    /** True when the evidence is inherited from an ancestor rather than attached to the value itself. */
    inherited: boolean
    /** Set when the evidence turned out to be invalid when re-checked locally. */
    failed?: boolean
    details: { label: string; value: string }[]
}

export interface TrustTreeNode {
    key: string | number | null
    path: (string | number)[]
    type: 'object' | 'array' | 'leaf'
    value?: unknown
    children: TrustTreeNode[]
    level: TrustLevel
    /** Evidence attached exactly at this path (the origin of this subtree). */
    own: TrustEvidence[]
    /** Every evidence applying to this path, own and inherited. */
    evidence: TrustEvidence[]
}

export interface UnresolvedTag {
    tag: string
    path: (string | number)[]
    reason: string
}

export interface Mismatch {
    path: (string | number)[]
    claimed: unknown
    recomputed: unknown
}

export type Verdict = 'verified' | 'limited' | 'failed'

export interface TrustReport {
    root: TrustTreeNode
    unresolved: UnresolvedTag[]
    mismatches: Mismatch[]
    counts: Record<TrustLevel, number>
    totalLeaves: number
    verdict: Verdict
}

export const LEVEL_META: Record<
    TrustLevel,
    { label: string; short: string; description: string; icon: string }
> = {
    untrusted: {
        label: 'Not verified',
        short: 'Not verified',
        description:
            'This value comes from the linked JSON only. It is neither signed nor read from the blockchain, so whoever produced this file could have written anything here.',
        icon: 'pi-exclamation-triangle',
    },
    authenticated: {
        label: 'Authenticated',
        short: 'Authenticated',
        description:
            'This value is protected by a signature, a credential or a digest, but it is not anchored on the blockchain. It proves who vouched for it (a key), not when or whether it was recorded.',
        icon: 'pi-pencil',
    },
    onchain: {
        label: 'On-chain',
        short: 'On-chain',
        description:
            'This value was read from a microblock and checked against the Merkle root recorded on the blockchain.',
        icon: 'pi-link',
    },
    'onchain-signed': {
        label: 'On-chain and signed',
        short: 'On-chain + signed',
        description:
            'This value is recorded on the blockchain and also covered by a valid signature. The signing key is not yet linked to an identity.',
        icon: 'pi-verified',
    },
    failed: {
        label: 'Check failed',
        short: 'Check failed',
        description:
            'A verification attached to this value did not pass, so the value must not be relied upon.',
        icon: 'pi-times-circle',
    },
}
