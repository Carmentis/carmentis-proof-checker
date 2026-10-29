<template>
    <div
        class="rounded-xl border px-4 py-3 text-sm"
        :class="
            evidence.failed
                ? 'border-red-200 bg-red-50/60 dark:border-red-800/60 dark:bg-red-900/10'
                : 'border-gray-200 bg-gray-50/70 dark:border-gray-700 dark:bg-gray-900/40'
        "
    >
        <p class="font-semibold text-gray-900 dark:text-gray-100">{{ evidence.title }}</p>
        <p class="mt-1 leading-relaxed text-gray-600 dark:text-gray-400">{{ evidence.reason }}</p>
        <p v-if="evidence.inherited" class="mt-1 text-xs text-gray-500 dark:text-gray-500">
            Inherited from
            <code class="font-mono">{{ formatPath(evidence.attachedAt) }}</code>
        </p>
        <dl v-if="evidence.details.length" class="mt-2 space-y-1">
            <div v-for="detail in evidence.details" :key="detail.label" class="flex flex-col sm:flex-row sm:gap-3">
                <dt class="shrink-0 text-xs uppercase tracking-wide text-gray-500 sm:w-36">
                    {{ detail.label }}
                </dt>
                <dd class="break-all font-mono text-xs text-gray-800 dark:text-gray-200">
                    {{ detail.value }}
                </dd>
            </div>
        </dl>
    </div>
</template>

<script setup lang="ts">
import type { TrustEvidence } from '@/classes/trust/types'

defineProps<{ evidence: TrustEvidence }>()

function formatPath(path: (string | number)[]) {
    return path.length === 0 ? '(root)' : path.join('.')
}
</script>
