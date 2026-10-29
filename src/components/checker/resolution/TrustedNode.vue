<template>
    <!-- Leaf value -->
    <div v-if="node.type === 'leaf'" class="py-1.5">
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div class="min-w-0 flex-1 text-sm">
                <span v-if="node.key !== null" class="mr-2 font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {{ node.key }}
                </span>
                <span class="break-all font-mono text-gray-700 dark:text-gray-300">{{ display }}</span>
            </div>
            <button
                type="button"
                class="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition active:scale-95 motion-reduce:transition-none"
                :class="LEVEL_BADGE[node.level]"
                :aria-expanded="open"
                @click="open = !open"
            >
                <i class="pi text-[0.7rem]" :class="LEVEL_META[node.level].icon" aria-hidden="true"></i>
                {{ LEVEL_META[node.level].short }}
                <i
                    class="pi pi-chevron-down text-[0.6rem] transition-transform motion-reduce:transition-none"
                    :class="{ 'rotate-180': open }"
                    aria-hidden="true"
                ></i>
            </button>
        </div>
        <div v-if="open" class="mt-2 space-y-2 pb-1">
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {{ LEVEL_META[node.level].description }}
            </p>
            <EvidenceCard v-for="(item, i) in node.evidence" :key="i" :evidence="item" />
        </div>
    </div>

    <!-- Object or array -->
    <div v-else class="py-1">
        <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <button
                type="button"
                class="flex min-h-8 items-center gap-2 text-left text-sm"
                :aria-expanded="expanded"
                @click="expanded = !expanded"
            >
                <i
                    class="pi pi-chevron-right text-[0.65rem] text-gray-400 transition-transform motion-reduce:transition-none"
                    :class="{ 'rotate-90': expanded }"
                    aria-hidden="true"
                ></i>
                <span class="font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {{ node.key ?? 'document' }}
                </span>
                <span class="text-xs text-gray-500">
                    {{ node.type === 'array' ? `${node.children.length} items` : `${node.children.length} fields` }}
                </span>
            </button>
            <button
                v-if="node.own.length"
                type="button"
                class="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition active:scale-95 motion-reduce:transition-none"
                :class="LEVEL_BADGE[originLevel]"
                :aria-expanded="originOpen"
                @click="originOpen = !originOpen"
            >
                <i class="pi text-[0.7rem]" :class="LEVEL_META[originLevel].icon" aria-hidden="true"></i>
                {{ node.own.map((e) => e.title).join(' · ') }}
                <i
                    class="pi pi-chevron-down text-[0.6rem] transition-transform motion-reduce:transition-none"
                    :class="{ 'rotate-180': originOpen }"
                    aria-hidden="true"
                ></i>
            </button>
        </div>
        <div v-if="originOpen" class="mt-1 space-y-2 pb-2 pl-5">
            <p class="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Everything inside this block comes from the source below, unless a nested block says otherwise.
            </p>
            <EvidenceCard v-for="(item, i) in node.own" :key="i" :evidence="item" />
        </div>
        <div
            v-if="expanded"
            class="ml-1.5 border-l-2 pl-4"
            :class="node.own.length ? 'border-blue-200 dark:border-blue-800/60' : 'border-gray-200 dark:border-gray-700'"
        >
            <TrustedNode v-for="child in node.children" :key="String(child.key)" :node="child" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { LEVEL_META, type TrustLevel, type TrustTreeNode } from '@/classes/trust/types'
import { LEVEL_BADGE } from './levelStyles'
import EvidenceCard from './EvidenceCard.vue'

const props = defineProps<{ node: TrustTreeNode }>()

const open = ref(false)
const originOpen = ref(false)
// Certificate dumps are long and rarely the point: keep them closed until asked for.
const expanded = ref(!props.node.own.every((e) => e.kind === 'certificate') || props.node.own.length === 0)

const display = computed(() => {
    const value = props.node.value
    if (typeof value === 'string') return `"${value}"`
    if (Array.isArray(value)) return '[]'
    if (value !== null && typeof value === 'object') return '{}'
    return String(value)
})

const originLevel = computed<TrustLevel>(() => props.node.level)
</script>
