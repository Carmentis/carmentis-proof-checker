import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

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

export function scrollToCard(id: string) {
    const element = document.getElementById(id)
    if (!element) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
}
