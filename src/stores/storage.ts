import { ref } from 'vue'
import { defineStore } from 'pinia'

interface Organization {
    id: string
    name: string
    nodeEndpoint: string
    explorerUrl: string
}

export const useStorageStore = defineStore('storage', () => {
    const organizations = ref<Organization[]>([
        {
            id: 'cmts:localnet',
            name: 'Localnet',
            nodeEndpoint: 'http://localhost:26657',
            explorerUrl: 'http://localhost:5173',
        },
        {
            id: 'cmts:devnet',
            name: 'Devnet',
            nodeEndpoint: 'https://node2.server2.devnet.carmentis.io',
            explorerUrl: 'https://explorer.server4.devnet.carmentis.io',
        },
        {
            id: 'cmts:testnet',
            name: 'Testnet',
            nodeEndpoint: 'https://ares.testnet.carmentis.io',
            explorerUrl: 'https://explorer.testnet.carmentis.io',
        },
        {
            id: 'cmts',
            name: 'Mainnet',
            nodeEndpoint: 'https://mercurius.carmentis.io',
            explorerUrl: 'https://explorer.carmentis.io',
        },
    ])

    return { organizations }
})
