<template>
    <section
        class="rounded-2xl border border-red-200 bg-red-50 p-6 dark:border-red-800/60 dark:bg-red-900/10"
        aria-labelledby="trust-failures"
    >
        <h3 id="trust-failures" class="flex items-center gap-2 text-lg font-semibold text-red-800 dark:text-red-300">
            <i class="pi pi-exclamation-circle" aria-hidden="true"></i>
            Problems found
        </h3>

        <div v-if="report.unresolved.length" class="mt-4">
            <h4 class="text-sm font-semibold text-red-800 dark:text-red-300">Elements that could not be verified</h4>
            <ul class="mt-2 space-y-2">
                <li
                    v-for="(item, i) in report.unresolved"
                    :key="i"
                    class="rounded-xl bg-white/70 p-3 text-sm dark:bg-gray-900/40"
                >
                    <p class="text-gray-900 dark:text-gray-100">
                        <code class="font-mono font-semibold">{{ item.tag }}</code>
                        at
                        <code class="font-mono">{{ formatPath(item.path) }}</code>
                    </p>
                    <p class="mt-1 leading-relaxed text-gray-600 dark:text-gray-400">{{ item.reason }}</p>
                </li>
            </ul>
        </div>

        <div v-if="report.mismatches.length" class="mt-4">
            <h4 class="text-sm font-semibold text-red-800 dark:text-red-300">
                The file does not match what the checker recomputed
            </h4>
            <p class="mt-1 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                The values shown on this page are the ones recomputed here. The file claims something else at these locations.
            </p>
            <ul class="mt-2 space-y-2">
                <li
                    v-for="(item, i) in report.mismatches"
                    :key="i"
                    class="rounded-xl bg-white/70 p-3 text-sm dark:bg-gray-900/40"
                >
                    <code class="font-mono font-semibold text-gray-900 dark:text-gray-100">{{ formatPath(item.path) }}</code>
                    <p class="mt-1 break-all font-mono text-xs text-gray-600 dark:text-gray-400">
                        file claims: {{ show(item.claimed) }}
                    </p>
                    <p class="break-all font-mono text-xs text-gray-600 dark:text-gray-400">
                        recomputed: {{ show(item.recomputed) }}
                    </p>
                </li>
            </ul>
        </div>

        <p v-if="report.counts.failed" class="mt-4 text-sm text-gray-700 dark:text-gray-300">
            {{ report.counts.failed }} value(s) are marked “Check failed” in the document below.
        </p>
    </section>
</template>

<script setup lang="ts">
import type { TrustReport } from '@/classes/trust/types'

defineProps<{ report: TrustReport }>()

function formatPath(path: (string | number)[]) {
    return path.length === 0 ? '(root)' : path.join('.')
}

function show(value: unknown) {
    return value === undefined ? '(absent)' : JSON.stringify(value)
}
</script>
