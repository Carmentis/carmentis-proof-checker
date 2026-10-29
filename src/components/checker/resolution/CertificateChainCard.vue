<template>
    <ol class="space-y-2" aria-label="Certificate chain">
        <li
            v-for="(cert, i) in certificates"
            :key="i"
            class="rounded-xl border border-gray-200 bg-gray-50/70 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/40"
        >
            <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
                    <i class="pi pi-shield text-gray-500" aria-hidden="true"></i>
                    {{ cert.commonName ?? 'Certificate' }}
                    <span class="rounded-md bg-gray-200 px-1.5 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                        {{ role(cert, i) }}
                    </span>
                </p>
                <span
                    class="rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"
                    :class="validityClass(cert)"
                >
                    {{ validityLabel(cert) }}
                </span>
            </div>
            <dl class="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[8rem_minmax(0,1fr)]">
                <dt class="uppercase tracking-wide text-gray-500">Subject</dt>
                <dd class="break-words font-mono text-gray-800 dark:text-gray-200">{{ dn(cert.subject) }}</dd>
                <dt class="uppercase tracking-wide text-gray-500">Issued by</dt>
                <dd class="break-words font-mono text-gray-800 dark:text-gray-200">
                    {{ cert.selfSigned ? 'itself (self-signed)' : dn(cert.issuer) }}
                </dd>
                <dt class="uppercase tracking-wide text-gray-500">Validity</dt>
                <dd class="font-mono text-gray-800 dark:text-gray-200">
                    {{ formatDate(cert.notBefore) }} → {{ formatDate(cert.notAfter) }}
                </dd>
                <dt class="uppercase tracking-wide text-gray-500">Serial number</dt>
                <dd class="break-all font-mono text-gray-800 dark:text-gray-200">{{ cert.serialNumber }}</dd>
            </dl>
        </li>
        <li class="px-1 text-xs text-gray-500">
            Parsed from the data: the chain of trust of these certificates is not evaluated yet.
        </li>
    </ol>
</template>

<script setup lang="ts">
import type { CertificateView, DistinguishedNameEntry } from '@/classes/trust/types'

const props = defineProps<{ certificates: CertificateView[] }>()

const now = Date.now()

function role(cert: CertificateView, index: number) {
    if (cert.selfSigned) return props.certificates.length > 1 ? 'Root' : 'Self-signed'
    return index === 0 ? 'Leaf' : 'Intermediate'
}

function dn(entries: DistinguishedNameEntry[]) {
    return entries.map((e) => `${e.name}=${e.value}`).join(', ')
}

function formatDate(value: string) {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

function state(cert: CertificateView) {
    if (now < new Date(cert.notBefore).getTime()) return 'not-yet'
    if (now > new Date(cert.notAfter).getTime()) return 'expired'
    return 'valid'
}

function validityLabel(cert: CertificateView) {
    return { valid: 'Within validity period', expired: 'Expired', 'not-yet': 'Not yet valid' }[state(cert)]
}

function validityClass(cert: CertificateView) {
    return state(cert) === 'valid'
        ? 'bg-green-50 text-green-800 ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-800/60'
        : 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800/60'
}
</script>
