<template>
    <aside aria-labelledby="parties-title" class="space-y-3">
        <div>
            <h3 id="parties-title" class="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                Parties
            </h3>
            <p class="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                Keys and issuers that vouch for the data. Select one to highlight what it covers.
            </p>
        </div>

        <p
            v-if="parties.length === 0"
            class="rounded-2xl border border-dashed border-gray-300 p-4 text-sm text-gray-500 dark:border-gray-700"
        >
            No signing or recording party was found in this proof.
        </p>

        <ul class="space-y-3">
            <li v-for="party in parties" :key="party.id">
                <div
                    class="rounded-2xl border bg-white p-4 transition-shadow motion-reduce:transition-none dark:bg-gray-800"
                    :class="
                        selected === party.id
                            ? 'border-blue-500 shadow-md ring-2 ring-blue-500/40'
                            : 'border-gray-200 shadow-sm dark:border-gray-700'
                    "
                >
                    <button
                        type="button"
                        class="flex w-full items-start gap-3 text-left"
                        :aria-pressed="selected === party.id"
                        @click="selected = selected === party.id ? null : party.id"
                    >
                        <span
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                        >
                            <i class="pi" :class="party.kind === 'issuer' ? 'pi-building' : 'pi-key'" aria-hidden="true"></i>
                        </span>
                        <span class="min-w-0">
                            <span class="block truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {{ party.certificates[0]?.commonName ?? (party.kind === 'issuer' ? 'Issuer' : 'Public key') }}
                            </span>
                            <span class="block break-all font-mono text-xs text-gray-500" :title="party.id">
                                {{ party.label }}
                            </span>
                        </span>
                    </button>

                    <p class="mt-2 text-xs text-gray-500">Identity not established yet</p>

                    <ul class="mt-3 space-y-1.5">
                        <li v-for="(item, i) in party.appearances" :key="i">
                            <button
                                type="button"
                                class="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                @click="scrollToCard(item.cardId)"
                            >
                                <span class="mt-1 h-2 w-2 shrink-0 rounded-full" :class="LEVEL_DOT[item.level]"></span>
                                <span class="min-w-0">
                                    <span class="font-medium text-gray-800 dark:text-gray-200">
                                        {{ ROLE_LABEL[item.role] }}
                                    </span>
                                    <span class="block break-all font-mono text-gray-500">
                                        {{ describe(item.covers) }}
                                    </span>
                                </span>
                            </button>
                        </li>
                    </ul>

                    <details v-if="party.certificates.length" class="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                        <summary class="flex min-h-8 cursor-pointer items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                            <i class="pi pi-shield" aria-hidden="true"></i>
                            Certificate chain ({{ party.certificates.length }})
                        </summary>
                        <p class="mt-1 text-xs text-gray-500">Parsed only: the chain of trust is not evaluated yet.</p>
                        <ol class="mt-2 space-y-2">
                            <li
                                v-for="(cert, i) in party.certificates"
                                :key="i"
                                class="rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-900/40"
                            >
                                <p class="font-medium text-gray-800 dark:text-gray-200">
                                    {{ cert.commonName ?? cert.subject }}
                                    <span v-if="cert.selfSigned" class="text-gray-500">(self-signed)</span>
                                </p>
                                <p class="break-all text-gray-500">Issued by {{ cert.issuer }}</p>
                                <p class="text-gray-500">{{ cert.notBefore }} → {{ cert.notAfter }}</p>
                            </li>
                        </ol>
                    </details>
                </div>
            </li>
        </ul>
    </aside>
</template>

<script setup lang="ts">
import type { Party } from '@/classes/trust/types'
import { LEVEL_DOT } from './levelStyles'
import { scrollToCard, useSelectedParty } from './partyContext'

defineProps<{ parties: Party[] }>()

const ROLE_LABEL = {
    signer: 'Signed',
    issuer: 'Issued credential',
    author: 'Recorded on-chain',
} as const

const selected = useSelectedParty()

function describe(paths: string[]) {
    return paths.length > 3 ? `${paths.slice(0, 3).join(', ')} +${paths.length - 3} more` : paths.join(', ')
}
</script>
