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
                                {{ title(party) }}
                            </span>
                            <span class="block break-all font-mono text-xs text-gray-500">
                                {{ party.label }}
                            </span>
                        </span>
                    </button>

                    <div v-if="party.identity" class="mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400">
                        <p v-if="party.identity.isOrganizationAccount" class="font-medium text-green-700 dark:text-green-300">
                            <i class="pi pi-verified mr-1" aria-hidden="true"></i>Account of the organization
                        </p>
                        <p v-else-if="party.identity.organization">
                            Pays the fees for {{ party.identity.organization.name }}
                        </p>
                        <p v-if="party.identity.organization">
                            {{ [party.identity.organization.city, party.identity.organization.countryCode].filter(Boolean).join(', ') }}
                            <a
                                v-if="safeUrl(party.identity.organization.website)"
                                :href="safeUrl(party.identity.organization.website)!"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="ml-1 underline decoration-dotted"
                            >{{ party.identity.organization.website }}</a>
                        </p>
                        <p v-for="app in party.identity.applications" :key="app.id">
                            <i class="pi pi-box mr-1" aria-hidden="true"></i>{{ app.name }}
                        </p>
                        <p v-if="party.identity.accountId" class="break-all font-mono text-gray-500" :title="party.identity.accountId">
                            Account {{ party.identity.accountId.slice(0, 10) }}…
                        </p>
                    </div>
                    <p v-else-if="!party.certificates.length && !party.claims.length" class="mt-2 text-xs text-gray-500">
                        Identity not established
                    </p>

                    <dl v-if="party.claims.length" class="mt-2 space-y-0.5 text-xs">
                        <div v-for="claim in party.claims" :key="claim.name" class="flex gap-2">
                            <dt class="w-24 shrink-0 truncate text-gray-500" :title="claim.name">{{ claim.name }}</dt>
                            <dd class="min-w-0 break-words text-gray-800 dark:text-gray-200">{{ claim.value }}</dd>
                        </div>
                    </dl>

                    <details class="mt-2">
                        <summary class="flex min-h-8 cursor-pointer items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                            <i class="pi pi-key" aria-hidden="true"></i>
                            {{ party.kind === 'issuer' ? 'Issuer identifier' : 'Public key' }}
                        </summary>
                        <p class="mt-1 max-h-32 overflow-y-auto break-all rounded-lg bg-gray-50 p-2 font-mono text-xs text-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
                            {{ party.id }}
                        </p>
                        <button
                            type="button"
                            class="mt-1 inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/20"
                            @click="copy(party.id)"
                        >
                            <i class="pi" :class="copied === party.id ? 'pi-check' : 'pi-copy'" aria-hidden="true"></i>
                            {{ copied === party.id ? 'Copied' : 'Copy' }}
                        </button>
                    </details>

                    <ul class="mt-3 space-y-1">
                        <li v-for="group in groups(party)" :key="group.role">
                            <button
                                type="button"
                                class="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-gray-50 dark:hover:bg-gray-700/50"
                                :title="group.count > 1 ? 'Select again to jump to the next one' : undefined"
                                @click="jump(party, group)"
                            >
                                <span class="h-2 w-2 shrink-0 rounded-full" :class="LEVEL_DOT[group.level]"></span>
                                <span class="min-w-0 flex-1">
                                    <span class="font-medium text-gray-800 dark:text-gray-200">
                                        {{ ROLE_LABEL[group.role] }}
                                    </span>
                                    <span v-if="group.count > 1" class="text-gray-500"> · {{ group.count }}</span>
                                    <span v-if="group.where.length" class="block truncate text-gray-500">
                                        {{ group.where.join(', ') }}
                                    </span>
                                </span>
                                <i class="pi pi-arrow-down-right text-[0.65rem] text-gray-400" aria-hidden="true"></i>
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
import { ref } from 'vue'
import type { Party, PartyRole, TrustLevel } from '@/classes/trust/types'
import { LEVEL_DOT } from './levelStyles'
import { scrollToCard, useSelectedParty } from './partyContext'

defineProps<{ parties: Party[] }>()

const ROLE_LABEL = {
    signer: 'Signed',
    issuer: 'Issued credential',
    author: 'Recorded on-chain',
    subject: 'Holds credential',
} as const

const selected = useSelectedParty()
const copied = ref<string | null>(null)

async function copy(value: string) {
    try {
        await navigator.clipboard.writeText(value)
        copied.value = value
        setTimeout(() => (copied.value = null), 1500)
    } catch {
        copied.value = null
    }
}

function title(party: Party) {
    return party.name ?? (party.kind === 'issuer' ? 'Issuer' : 'Public key')
}

/** Website strings come from the chain: only ever link http(s) URLs. */
function safeUrl(value: string) {
    try {
        const url = new URL(value.includes('://') ? value : `https://${value}`)
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
    } catch {
        return null
    }
}

interface RoleGroup {
    role: PartyRole
    count: number
    level: TrustLevel
    cardIds: string[]
    /** Names of the blocks involved (e.g. "sendingApproval"), not full paths. */
    where: string[]
}

/** One row per role instead of one per card, with a short human hint of where it applies. */
function groups(party: Party): RoleGroup[] {
    const byRole = new Map<PartyRole, RoleGroup>()
    for (const item of party.appearances) {
        let group = byRole.get(item.role)
        if (!group) {
            group = { role: item.role, count: 0, level: item.level, cardIds: [], where: [] }
            byRole.set(item.role, group)
        }
        group.count++
        group.cardIds.push(item.cardId)
        const parent = item.covers[0]?.split('.').slice(0, -1).pop()
        if (parent && !group.where.includes(parent) && group.where.length < 3) group.where.push(parent)
    }
    return [...byRole.values()]
}

const cursor = new Map<string, number>()

/** Jump to the next card of this role, wrapping around, and highlight the party. */
function jump(party: Party, group: RoleGroup) {
    const key = `${party.id}:${group.role}`
    const index = (cursor.get(key) ?? -1) + 1
    cursor.set(key, index % group.cardIds.length)
    selected.value = party.id
    scrollToCard(group.cardIds[index % group.cardIds.length]!)
}
</script>
