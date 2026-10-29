<template>
    <section
        class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
        aria-labelledby="trust-verdict"
    >
        <div class="flex items-start gap-4 p-6">
            <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                :class="meta.tone"
            >
                <i class="pi text-xl" :class="meta.icon" aria-hidden="true"></i>
            </div>
            <div>
                <h2
                    id="trust-verdict"
                    class="text-2xl font-semibold leading-tight tracking-tight text-gray-900 dark:text-gray-100"
                >
                    {{ meta.title }}
                </h2>
                <p class="mt-1 max-w-prose leading-relaxed text-gray-600 dark:text-gray-400">
                    {{ meta.description }}
                </p>
            </div>
        </div>

        <ul class="grid grid-cols-2 gap-3 px-6 pb-6 md:grid-cols-4">
            <li
                v-for="level in visibleLevels"
                :key="level"
                class="rounded-xl bg-gray-50 p-4 dark:bg-gray-900/40"
            >
                <p class="text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100">
                    {{ report.counts[level] }}
                    <span class="text-sm font-normal text-gray-500">/ {{ report.totalLeaves }}</span>
                </p>
                <p class="mt-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span class="h-2 w-2 rounded-full" :class="LEVEL_DOT[level]"></span>
                    {{ LEVEL_META[level].label }}
                </p>
            </li>
        </ul>

        <details class="group border-t border-gray-200 dark:border-gray-700">
            <summary
                class="flex min-h-11 cursor-pointer list-none items-center justify-between px-6 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
                How to read these labels
                <i class="pi pi-chevron-down text-xs transition-transform group-open:rotate-180 motion-reduce:transition-none"></i>
            </summary>
            <dl class="space-y-3 px-6 pb-6">
                <div v-for="level in levels" :key="level">
                    <dt>
                        <span
                            class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset"
                            :class="LEVEL_BADGE[level]"
                        >
                            <i class="pi text-[0.7rem]" :class="LEVEL_META[level].icon" aria-hidden="true"></i>
                            {{ LEVEL_META[level].label }}
                        </span>
                    </dt>
                    <dd class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                        {{ LEVEL_META[level].description }}
                    </dd>
                </div>
            </dl>
        </details>
    </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { LEVEL_META, type TrustLevel, type TrustReport } from '@/classes/trust/types'
import { LEVEL_BADGE, LEVEL_DOT, VERDICT_META } from './levelStyles'

const props = defineProps<{ report: TrustReport }>()

const levels: TrustLevel[] = ['onchain-signed', 'onchain', 'authenticated', 'untrusted', 'failed']
const meta = computed(() => VERDICT_META[props.report.verdict])
// Only show levels that are present, so the summary stays short; failures always matter.
const visibleLevels = computed(() => levels.filter((level) => props.report.counts[level] > 0))
</script>
