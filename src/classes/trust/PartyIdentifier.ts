import { Hash, type Provider } from '@cmts-dev/carmentis-sdk-core'
import type {
    ApplicationInfo,
    OrganizationInfo,
    Party,
    PartyIdentity,
    VbIdentity,
} from './types'

/**
 * Identify who is behind anchored microblocks by walking the chain upwards:
 * application ledger -> application -> organization -> account.
 *
 * Every lookup is best effort: anything that cannot be resolved is simply left out, so a missing
 * identity never makes the proof itself fail.
 */
export async function identifyParties(
    parties: Party[],
    provider: Provider,
): Promise<Record<string, VbIdentity>> {
    const identities = new Map<string, Promise<VbIdentity>>()
    const accounts = new Map<string, Promise<string | undefined>>()

    const loadIdentity = (vbId: string) => {
        let pending = identities.get(vbId)
        if (!pending) {
            pending = readVbIdentity(provider, vbId).catch(() => ({}))
            identities.set(vbId, pending)
        }
        return pending
    }
    const loadFeePayer = (vbId: string, height: number) => {
        const key = `${vbId}@${height}`
        let pending = accounts.get(key)
        if (!pending) {
            pending = readFeePayer(provider, vbId, height).catch(() => undefined)
            accounts.set(key, pending)
        }
        return pending
    }

    await Promise.all(
        parties.map(async (party) => {
            const origins = party.appearances.flatMap((a) =>
                a.role === 'author' && a.origin ? [a.origin] : [],
            )
            if (origins.length === 0) return

            const applications = new Map<string, ApplicationInfo>()
            let organization: OrganizationInfo | undefined
            let accountId: string | undefined
            let isOrganizationAccount = false
            for (const origin of origins) {
                const identity = await loadIdentity(origin.vbId)
                const feePayer = await loadFeePayer(origin.vbId, origin.height)
                accountId ??= feePayer
                if (identity.application) applications.set(identity.application.id, identity.application)
                if (identity.organization) {
                    organization ??= identity.organization
                    if (feePayer && feePayer === identity.organization.accountId) {
                        isOrganizationAccount = true
                        organization = identity.organization
                    }
                }
            }
            const result: PartyIdentity = {
                accountId,
                isOrganizationAccount,
                organization,
                applications: [...applications.values()],
            }
            party.identity = result
        }),
    )

    const out: Record<string, VbIdentity> = {}
    for (const [vbId, pending] of identities) out[vbId] = await pending
    return out
}

async function readVbIdentity(provider: Provider, vbId: string): Promise<VbIdentity> {
    const appLedger = await provider.loadApplicationLedgerVirtualBlockchain(Hash.fromHex(vbId))
    const applicationId = appLedger.getApplicationId()
    const applicationVb = await provider.loadApplicationVirtualBlockchain(applicationId)
    const description = await applicationVb.getApplicationDescription()
    const application: ApplicationInfo = {
        id: applicationId.encode(),
        name: description.name,
        homepageUrl: description.homepageUrl,
        logoUrl: description.logoUrl,
        description: description.description,
    }

    const organizationId = applicationVb.getOrganizationId()
    try {
        const organizationVb = await provider.loadOrganizationVirtualBlockchain(organizationId)
        const org = await organizationVb.getDescription()
        return {
            application,
            organization: {
                id: organizationId.encode(),
                name: org.name,
                website: org.website,
                city: org.city,
                countryCode: org.countryCode,
                accountId: organizationVb.getAccountId().encode(),
            },
        }
    } catch {
        return { application }
    }
}

async function readFeePayer(provider: Provider, vbId: string, height: number) {
    const appLedger = await provider.loadApplicationLedgerVirtualBlockchain(Hash.fromHex(vbId))
    const microblock = await appLedger.getMicroblock(height)
    return Hash.from(microblock.getFeesPayerAccount()).encode()
}
