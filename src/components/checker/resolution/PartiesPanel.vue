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

                    <p
                        v-if="party.identity?.isOrganizationAccount"
                        class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800 ring-1 ring-inset ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-800/60"
                    >
                        <i class="pi pi-verified text-[0.7rem]" aria-hidden="true"></i>Account of the organization
                    </p>
                    <p
                        v-else-if="party.identity?.organization"
                        class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                    >
                        Pays the fees for {{ party.identity.organization.name }}
                    </p>
                    <p v-else-if="!party.certificates.length && !party.claims.length" class="mt-3 text-xs text-gray-500">
                        Identity not established
                    </p>

                    <dl
                        v-if="rows(party).length"
                        class="mt-3 grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-3 gap-y-2 border-t border-gray-100 pt-3 text-xs dark:border-gray-700"
                    >
                        <template v-for="row in rows(party)" :key="row.label + row.items[0]?.text">
                            <dt class="pt-px font-medium uppercase tracking-wide text-gray-500">{{ row.label }}</dt>
                            <dd class="min-w-0 space-y-0.5 break-words text-gray-800 dark:text-gray-200">
                                <div v-for="item in row.items" :key="item.text" class="flex items-center gap-1.5">
                                    <a
                                        v-if="item.href"
                                        :href="item.href"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="inline-flex min-w-0 items-center gap-1 text-blue-700 underline decoration-dotted underline-offset-2 hover:decoration-solid dark:text-blue-300"
                                    >
                                        <span class="truncate">{{ item.text }}</span>
                                        <i class="pi pi-external-link text-[0.6rem]" aria-hidden="true"></i>
                                    </a>
                                    <span v-else :class="item.mono ? 'font-mono' : ''" :title="item.copy">{{ item.text }}</span>
                                    <button
                                        v-if="item.copy"
                                        type="button"
                                        class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                                        :aria-label="`Copy ${row.label.toLowerCase()}`"
                                        @click="copy(item.copy)"
                                    >
                                        <i class="pi text-[0.7rem]" :class="copied === item.copy ? 'pi-check' : 'pi-copy'" aria-hidden="true"></i>
                                    </button>
                                </div>
                            </dd>
                        </template>
                    </dl>

                    <details class="mt-3 border-t border-gray-100 pt-2 dark:border-gray-700">
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

                    <ul class="mt-2 space-y-1 border-t border-gray-100 pt-2 dark:border-gray-700">
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

interface Row {
    label: string
    items: { text: string; href?: string; mono?: boolean; copy?: string }[]
}

/** "given_name" -> "Given name" */
function humanize(name: string) {
    const text = name.replace(/[_-]+/g, ' ').trim()
    return text.charAt(0).toUpperCase() + text.slice(1)
}

function host(url: string) {
    try {
        return new URL(url).host
    } catch {
        return url
    }
}

/** Everything known about a party as label / value rows, so the card reads as one tidy table. */
function rows(party: Party): Row[] {
    const out: Row[] = []
    const identity = party.identity
    const organization = identity?.organization
    if (organization) {
        if (!identity.isOrganizationAccount) out.push({ label: 'Organization', items: [{ text: organization.name }] })
        const place = [organization.city, organization.countryCode].filter(Boolean).join(', ')
        if (place) out.push({ label: 'Location', items: [{ text: place }] })
        const website = safeUrl(organization.website)
        if (website) out.push({ label: 'Website', items: [{ text: host(website), href: website }] })
    }
    if (identity?.applications.length) {
        out.push({
            label: identity.applications.length > 1 ? 'Applications' : 'Application',
            items: identity.applications.map((app) => {
                const href = safeUrl(app.homepageUrl)
                return href ? { text: app.name, href } : { text: app.name }
            }),
        })
    }
    if (identity?.accountId) {
        out.push({
            label: 'Account',
            items: [{ text: `${identity.accountId.slice(0, 8)}…${identity.accountId.slice(-6)}`, mono: true, copy: identity.accountId }],
        })
    }
    for (const claim of party.claims) out.push({ label: humanize(claim.name), items: [{ text: claim.value }] })
    return out
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
