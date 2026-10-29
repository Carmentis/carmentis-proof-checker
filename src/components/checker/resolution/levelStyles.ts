import type { TrustLevel, Verdict } from '@/classes/trust/types'

export const LEVEL_BADGE: Record<TrustLevel, string> = {
    untrusted:
        'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-800/60',
    authenticated:
        'bg-blue-50 text-blue-800 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-800/60',
    onchain:
        'bg-green-50 text-green-800 ring-green-200 dark:bg-green-900/20 dark:text-green-300 dark:ring-green-800/60',
    'onchain-signed':
        'bg-emerald-100 text-emerald-900 ring-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200 dark:ring-emerald-700/60',
    failed: 'bg-red-50 text-red-800 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-800/60',
}

export const LEVEL_DOT: Record<TrustLevel, string> = {
    untrusted: 'bg-amber-500',
    authenticated: 'bg-blue-500',
    onchain: 'bg-green-500',
    'onchain-signed': 'bg-emerald-600',
    failed: 'bg-red-500',
}

export const VERDICT_META: Record<
    Verdict,
    { title: string; icon: string; tone: string; description: string }
> = {
    verified: {
        title: 'Proof verified',
        icon: 'pi-check',
        tone: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        description:
            'Every value in this document is backed by the blockchain or a valid signature.',
    },
    limited: {
        title: 'Verified, with limits',
        icon: 'pi-info-circle',
        tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        description:
            'The proof is consistent, but some values are not backed by anything. Check each value below before relying on it.',
    },
    failed: {
        title: 'Verification failed',
        icon: 'pi-times',
        tone: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        description:
            'Something in this proof could not be verified or does not match. Do not rely on this document.',
    },
}
