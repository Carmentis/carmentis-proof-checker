<template>
    <article
        :id="card.id"
        class="my-2 overflow-hidden rounded-2xl border bg-white transition-shadow motion-reduce:transition-none dark:bg-gray-800"
        :class="[
            highlighted
                ? 'border-blue-500 shadow-md ring-2 ring-blue-500/40'
                : 'border-gray-200 shadow-sm dark:border-gray-700',
        ]"
    >
        <header class="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-3 pb-2">
            <div class="flex min-w-0 items-start gap-3">
                <div
                    class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    :class="card.level === 'failed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'"
                >
                    <i class="pi" :class="KIND_ICON[primary.kind]" aria-hidden="true"></i>
                </div>
                <div class="min-w-0">
                    <h4 class="text-sm font-semibold leading-snug text-gray-900 dark:text-gray-100">
                        {{ primary.title }}
                        <span
                            v-for="(extra, i) in card.evidence.slice(1)"
                            :key="i"
                            class="ml-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                        >
                            + {{ extra.title }}
                        </span>
                    </h4>
                    <p v-if="parties.length" class="mt-0.5 flex flex-wrap items-center gap-x-1 text-xs text-gray-600 dark:text-gray-400">
                        <template v-for="(ref, i) in parties" :key="ref.id + ref.role">
                            <span v-if="i > 0">·</span>
                            <span>{{ ROLE_VERB[ref.role] }}</span>
                            <button
                                type="button"
                                class="rounded-md px-1 font-mono text-gray-800 underline decoration-dotted underline-offset-2 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                                :title="ref.id"
                                @click="selected = selected === ref.id ? null : ref.id"
                            >
                                {{ shorten(ref.id) }}
                            </button>
                        </template>
                    </p>
                    <p v-else class="mt-0.5 text-xs text-gray-500">{{ summary }}</p>
                </div>
            </div>
            <button
                type="button"
                class="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition active:scale-95 motion-reduce:transition-none"
                :class="LEVEL_BADGE[card.level]"
                :aria-expanded="why"
                @click="why = !why"
            >
                <i class="pi text-[0.7rem]" :class="LEVEL_META[card.level].icon" aria-hidden="true"></i>
                {{ LEVEL_META[card.level].short }}
                <i
                    class="pi pi-chevron-down text-[0.6rem] transition-transform motion-reduce:transition-none"
                    :class="{ 'rotate-180': why }"
                    aria-hidden="true"
                ></i>
            </button>
        </header>

        <div v-if="why" class="space-y-2 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {{ LEVEL_META[card.level].description }}
            </p>
            <EvidenceCard v-for="(item, i) in card.evidence" :key="i" :evidence="item" />
        </div>

        <div class="border-t border-gray-100 dark:border-gray-700">
            <button
                type="button"
                class="flex min-h-9 w-full items-center gap-2 px-4 text-left text-xs font-medium text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                :aria-expanded="open"
                @click="open = !open"
            >
                <i
                    class="pi pi-chevron-right text-[0.6rem] transition-transform motion-reduce:transition-none"
                    :class="{ 'rotate-90': open }"
                    aria-hidden="true"
                ></i>
                {{ open ? 'Hide content' : `Show content (${card.children.length})` }}
            </button>
            <div v-if="open" class="px-4 pb-3">
                <slot />
            </div>
        </div>
    </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { LEVEL_META, type EvidenceKind, type TrustCard } from '@/classes/trust/types'
import { LEVEL_BADGE } from './levelStyles'
import { useSelectedParty } from './partyContext'
import EvidenceCard from './EvidenceCard.vue'

const props = defineProps<{ card: TrustCard }>()

const KIND_ICON: Record<EvidenceKind, string> = {
    onchain: 'pi-link',
    signed: 'pi-pencil',
    digest: 'pi-hashtag',
    credential: 'pi-id-card',
    certificate: 'pi-shield',
}

const ROLE_VERB = { signer: 'Signed by', issuer: 'Issued by', author: 'Recorded by' } as const

const selected = useSelectedParty()
const primary = computed(() => props.card.evidence[0]!)
const parties = computed(() => props.card.evidence.flatMap((e) => (e.party ? [e.party] : [])))
const highlighted = computed(() => selected.value !== null && parties.value.some((p) => p.id === selected.value))
const summary = computed(() => props.card.paths.length === 1 ? props.card.paths[0] : `${props.card.paths.length} values`)

const why = ref(false)
// Certificates are long and rarely the point: keep them closed until asked for.
const open = ref(props.card.evidence.every((e) => e.kind !== 'certificate'))

function shorten(id: string) {
    return id.length > 24 ? `${id.slice(0, 14)}…${id.slice(-6)}` : id
}
</script>
