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
    /** The party (key or issuer) this evidence is attributed to, when known. */
    party?: PartyRef
    /** X.509 chain announced by the issuer of a credential, when any. */
    certificates?: CertificateInfo[]
    /** Where on-chain evidence was read from. */
    origin?: MicroblockOrigin
    /** Who a credential or presentation was issued to (its `sub` claim). */
    subject?: string
    /** Claims a credential or presentation discloses about its subject. */
    disclosed?: DisclosedClaim[]
    verification: Verification
    /** True when the check was left out because the covered data does not match the proof file. */
    skipped?: boolean
    /** Shown prominently on the card, e.g. why a check was skipped. */
    warning?: string
}

export interface MicroblockOrigin {
    vbId: string
    height: number
}

export interface ApplicationInfo {
    id: string
    name: string
    homepageUrl: string
    logoUrl: string
    description: string
}

export interface OrganizationInfo {
    id: string
    name: string
    website: string
    city: string
    countryCode: string
    accountId: string
}

/** What the chain says about the application ledger a microblock belongs to. */
export interface VbIdentity {
    application?: ApplicationInfo
    organization?: OrganizationInfo
}

export interface DistinguishedNameEntry {
    name: string
    value: string
}

/** A certificate found in the resolved data, ready to be displayed. */
export interface CertificateView {
    commonName?: string
    subject: DistinguishedNameEntry[]
    issuer: DistinguishedNameEntry[]
    notBefore: string
    notAfter: string
    serialNumber: string
    selfSigned: boolean
}

export interface PartyIdentity {
    /** Account that paid for the microblocks this key anchored. */
    accountId?: string
    /** True when that account is the one declared by the organization. */
    isOrganizationAccount: boolean
    organization?: OrganizationInfo
    applications: ApplicationInfo[]
}

export type PartyRole = 'signer' | 'issuer' | 'author' | 'subject'

export interface DisclosedClaim {
    name: string
    value: string
}

/** Outcome of the check run on the tag itself, shown next to the trust level. */
export interface Verification {
    status: 'verified' | 'failed' | 'unchecked'
    label: string
    /** A check that was left out, e.g. credential revocation. */
    caveat?: string
}

export interface PartyRef {
    id: string
    kind: 'key' | 'issuer'
    role: PartyRole
}

export interface CertificateInfo {
    subject: string
    commonName?: string
    issuer: string
    notBefore: string
    notAfter: string
    selfSigned: boolean
}

/** A group of sibling values that come from one tag (signature, presentation, link, ...). */
export interface TrustCard {
    type: 'card'
    id: string
    evidence: TrustEvidence[]
    level: TrustLevel
    children: TrustTreeNode[]
    /** The card content, itself grouped: a nested tag (e.g. a certificate in a section) becomes a card inside. */
    segments: TrustSegment[]
    /** Dot paths of the values the card covers. */
    paths: string[]
}

export type TrustSegment = { type: 'node'; node: TrustTreeNode } | TrustCard

export interface PartyAppearance {
    cardId: string
    role: PartyRole
    title: string
    covers: string[]
    level: TrustLevel
    origin?: MicroblockOrigin
}

export interface Party {
    id: string
    kind: 'key' | 'issuer'
    label: string
    /** Convenient name derived from the chain, disclosed claims or a certificate, when known. */
    name?: string
    /** Claims disclosed about this party when it is the subject of a credential. */
    claims: DisclosedClaim[]
    appearances: PartyAppearance[]
    certificates: CertificateInfo[]
    identity?: PartyIdentity
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
    /** Children regrouped so that values produced by the same tag form one card. */
    segments: TrustSegment[]
    /** Set when this node holds X.509 certificate(s), so it can be shown as certificate cards. */
    certificates?: CertificateView[]
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
    parties: Party[]
    /** Identity of the application ledger behind each on-chain origin, by virtual blockchain id. */
    vbIdentities: Record<string, VbIdentity>
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
