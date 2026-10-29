import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import type { VbIdentity } from '@/classes/trust/types'

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

export function scrollToCard(id: string) {
    const element = document.getElementById(id)
    if (!element) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
}
