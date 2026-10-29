import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import type { Mismatch, TrustCard, VbIdentity } from '@/classes/trust/types'

const KEY: InjectionKey<Ref<string | null>> = Symbol('selectedParty')

/** Shared selection so a party card can highlight the tree cards it is involved in. */
export function provideSelectedParty() {
    const selected = ref<string | null>(null)
    provide(KEY, selected)
    return selected
}

export function useSelectedParty() {
    return inject(KEY, ref<string | null>(null))
}

const IDENTITIES_KEY: InjectionKey<Ref<Record<string, VbIdentity>>> = Symbol('vbIdentities')

/** Application / organization behind each on-chain origin, filled in once the chain was queried. */
export function provideVbIdentities() {
    const identities = ref<Record<string, VbIdentity>>({})
    provide(IDENTITIES_KEY, identities)
    return identities
}

export function useVbIdentities() {
    return inject(IDENTITIES_KEY, ref<Record<string, VbIdentity>>({}))
}

const NAMES_KEY: InjectionKey<Ref<Record<string, string>>> = Symbol('partyNames')

/** Convenient names by party id (public key), for places that would otherwise show a raw key. */
export function providePartyNames() {
    const names = ref<Record<string, string>>({})
    provide(NAMES_KEY, names)
    return names
}

export function usePartyNames() {
    return inject(NAMES_KEY, ref<Record<string, string>>({}))
}

interface MismatchIndex {
    /** Mismatches by serialized path. */
    exact: Map<string, Mismatch>
    /** Every serialized path that has a mismatch somewhere below it. */
    ancestors: Set<string>
}

const MISMATCH_KEY: InjectionKey<Ref<MismatchIndex>> = Symbol('mismatches')

export function pathKey(path: (string | number)[]) {
    return JSON.stringify(path)
}

/** DOM id of the highlighted value, so the problems list can scroll to it. */
export function mismatchId(path: (string | number)[]) {
    return `mismatch-${path.join('.')}`
}

/** Values whose recomputed content differs from what the proof file claims, to highlight in the tree. */
export function provideMismatches() {
    const index = ref<MismatchIndex>({ exact: new Map(), ancestors: new Set() })
    provide(MISMATCH_KEY, index)
    return {
        index,
        set(mismatches: Mismatch[]) {
            const exact = new Map<string, Mismatch>()
            const ancestors = new Set<string>()
            for (const mismatch of mismatches) {
                exact.set(pathKey(mismatch.path), mismatch)
                for (let i = 0; i < mismatch.path.length; i++) ancestors.add(pathKey(mismatch.path.slice(0, i)))
            }
            index.value = { exact, ancestors }
        },
    }
}

export function useMismatches() {
    return inject(MISMATCH_KEY, ref<MismatchIndex>({ exact: new Map(), ancestors: new Set() }))
}

const FOCUS_KEY: InjectionKey<Ref<TrustCard | null>> = Symbol('focusedCard')

/** The card the user clicked: the parties involved in it are brought to the top of the parties panel. */
export function provideFocusedCard() {
    const focused = ref<TrustCard | null>(null)
    provide(FOCUS_KEY, focused)
    return focused
}

export function useFocusedCard() {
    return inject(FOCUS_KEY, ref<TrustCard | null>(null))
}

export interface PartyRoleInfo {
    partyId: string
    caption: string
    description: string
}

/** Who played which part in a card, in reading order (issuer before holder). */
export function rolesOfCard(card: TrustCard): PartyRoleInfo[] {
    const roles: PartyRoleInfo[] = []
    for (const evidence of card.evidence) {
        const party = evidence.party
        if (party?.role === 'issuer') {
            roles.push({
                partyId: party.id,
                caption: 'Credential issuer',
                description: 'Issued and signed this credential, vouching for the claims it contains.',
            })
        } else if (party?.role === 'signer') {
            roles.push({
                partyId: party.id,
                caption: 'Signer',
                description: 'Holds the key that produced this signature over the data below.',
            })
        } else if (party?.role === 'author') {
            roles.push({
                partyId: party.id,
                caption: 'Microblock publisher',
                description: 'Paid the fees to record this data on the blockchain.',
            })
        }
        if (evidence.subject) {
            roles.push({
                partyId: evidence.subject,
                caption: 'Credential holder',
                description: 'The party this credential was issued to, and whose claims it discloses.',
            })
        }
    }
    return roles
}

export function scrollToCard(id: string) {
    const element = document.getElementById(id)
    if (!element) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
}
