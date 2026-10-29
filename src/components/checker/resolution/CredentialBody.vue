<template>
    <div class="space-y-3">
        <dl v-if="summary.length" class="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            <template v-for="row in summary" :key="row.label">
                <dt class="pt-px text-xs font-medium uppercase tracking-wide text-gray-500">{{ row.label }}</dt>
                <dd
                    class="flex flex-wrap items-center gap-2"
                    :class="row.mismatch ? 'font-semibold text-red-700 dark:text-red-300' : 'text-gray-800 dark:text-gray-200'"
                    :id="row.mismatch ? mismatchId(row.path) : undefined"
                >
                    <i v-if="row.mismatch" class="pi pi-times-circle" aria-hidden="true"></i>
                    {{ row.value }}
                    <span
                        v-if="row.note"
                        class="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800/60"
                    >{{ row.note }}</span>
                </dd>
            </template>
        </dl>

        <section v-if="claims.length">
            <h5 class="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Claims</h5>
            <TrustedNode v-for="node in claims" :key="String(node.key)" :node="node" :parent-level="card.level" />
        </section>

        <details v-if="technical.length" class="rounded-xl bg-gray-50 px-3 dark:bg-gray-900/40" :open="technicalHasMismatch || undefined">
            <summary class="flex min-h-9 cursor-pointer items-center gap-2 text-xs font-medium text-gray-600 dark:text-gray-400">
                <i class="pi pi-cog text-[0.7rem]" aria-hidden="true"></i>
                Technical details ({{ technical.length }})
            </summary>
            <div class="pb-2">
                <TrustedNode v-for="node in technical" :key="String(node.key)" :node="node" :parent-level="card.level" />
            </div>
        </details>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { TOKEN_CLAIMS, type TrustCard, type TrustTreeNode } from '@/classes/trust/types'
import { mismatchId, pathKey, useMismatches } from './partyContext'
import TrustedNode from './TrustedNode.vue'

const props = defineProps<{ card: TrustCard }>()

const mismatches = useMismatches()

const byKey = (key: string) => props.card.children.find((c) => c.key === key)
const claims = computed(() => props.card.children.filter((c) => !TOKEN_CLAIMS.has(String(c.key))))
/** What the token says about itself, minus what the card header and summary already show. */
const SHOWN = new Set(['vct', 'iat', 'nbf', 'exp'])
const technical = computed(() => props.card.children.filter((c) => TOKEN_CLAIMS.has(String(c.key)) && !SHOWN.has(String(c.key))))

const technicalHasMismatch = computed(() =>
    technical.value.some((n) => mismatches.value.exact.has(pathKey(n.path)) || mismatches.value.ancestors.has(pathKey(n.path))),
)

function dateOf(node: TrustTreeNode | undefined) {
    return typeof node?.value === 'number' ? new Date(node.value * 1000) : null
}

const summary = computed(() => {
    const rows: { label: string; value: string; path: (string | number)[]; mismatch: boolean; note?: string }[] = []
    const add = (label: string, node: TrustTreeNode | undefined, value: string | null, note?: string) => {
        if (!node || value === null) return
        rows.push({ label, value, path: node.path, mismatch: mismatches.value.exact.has(pathKey(node.path)), note })
    }
    const vct = byKey('vct')
    add('Type', vct, typeof vct?.value === 'string' ? vct.value : null)

    const now = Date.now()
    const iat = byKey('iat')
    add('Issued', iat, dateOf(iat)?.toLocaleString() ?? null)
    const nbf = byKey('nbf')
    const from = dateOf(nbf)
    add('Valid from', nbf, from?.toLocaleString() ?? null, from && from.getTime() > now ? 'Not yet valid' : undefined)
    const exp = byKey('exp')
    const until = dateOf(exp)
    add('Valid until', exp, until?.toLocaleString() ?? null, until && until.getTime() < now ? 'Expired' : undefined)
    return rows
})
</script>
