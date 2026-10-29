<template>
    <!-- Leaf value -->
    <div
        v-if="node.type === 'leaf'"
        :id="mismatch ? mismatchId(node.path) : undefined"
        class="py-1.5"
        :class="mismatch ? 'my-1 scroll-mt-24 rounded-lg bg-red-50 px-3 ring-1 ring-red-300 dark:bg-red-900/20 dark:ring-red-700/60' : ''"
    >
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div class="min-w-0 flex-1 text-sm">
                <i v-if="mismatch" class="pi pi-times-circle mr-1.5 text-red-600 dark:text-red-400" aria-hidden="true"></i>
                <span
                    v-if="node.key !== null"
                    class="mr-2 font-mono font-semibold"
                    :class="mismatch ? 'text-red-800 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'"
                >
                    {{ node.key }}
                </span>
                <span
                    class="break-all font-mono"
                    :class="mismatch ? 'font-semibold text-red-700 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'"
                >{{ display }}</span>
                <p v-if="mismatch" class="mt-1 text-xs text-red-700 dark:text-red-300">
                    Does not match the file, which claims
                    <code class="break-all font-mono font-semibold">{{ claimed }}</code>
                </p>
            </div>
            <!-- Inside a card the card already states the confidence, so only show differences. -->
            <button
                v-if="node.level !== parentLevel"
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

    <!-- Certificates found in the data: shown as certificate cards instead of raw JSON -->
    <div v-else-if="node.certificates" class="py-1">
        <p class="mb-1 font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{{ node.key }}</p>
        <CertificateChainCard :certificates="node.certificates" />
    </div>

    <!-- Object or array -->
    <div v-else class="py-1">
        <button
            v-if="node.key !== null"
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
            <span
                class="font-mono font-semibold"
                :class="mismatch || mismatchInside ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-gray-100'"
            >{{ node.key }}</span>
            <span v-if="mismatch || mismatchInside" class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300">
                <i class="pi pi-times-circle text-[0.65rem]" aria-hidden="true"></i>
                {{ mismatch ? 'Does not match the file' : 'Contains mismatches' }}
            </span>
            <span class="text-xs text-gray-500">
                {{ node.type === 'array' ? `${node.children.length} items` : `${node.children.length} fields` }}
            </span>
        </button>
        <div
            v-if="expanded"
            :class="node.key !== null ? ['ml-1.5 border-l-2 pl-4', mismatch || mismatchInside ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'] : ''"
        >
            <SegmentList :segments="node.segments" :parent-level="parentLevel" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { LEVEL_META, type TrustLevel, type TrustTreeNode } from '@/classes/trust/types'
import { LEVEL_BADGE } from './levelStyles'
import EvidenceCard from './EvidenceCard.vue'
import SegmentList from './SegmentList.vue'
import { mismatchId, pathKey, useMismatches } from './partyContext'
import CertificateChainCard from './CertificateChainCard.vue'

const props = defineProps<{ node: TrustTreeNode; parentLevel?: TrustLevel | null }>()

const mismatches = useMismatches()
const mismatch = computed(() => mismatches.value.exact.get(pathKey(props.node.path)))
const mismatchInside = computed(() => mismatches.value.ancestors.has(pathKey(props.node.path)))
const claimed = computed(() => {
    const value = mismatch.value?.claimed
    return value === undefined ? '(absent)' : JSON.stringify(value)
})

const open = ref(false)
const expanded = ref(true)

const display = computed(() => {
    const value = props.node.value
    if (typeof value === 'string') return `"${value}"`
    if (Array.isArray(value)) return '[]'
    if (value !== null && typeof value === 'object') return '{}'
    return String(value)
})
</script>
