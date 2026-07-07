import { ref } from 'vue'
import { defineStore } from 'pinia'

interface Organization {
    id: string
    name: string
    nodeEndpoint: string
}

export const useStorageStore = defineStore('storage', () => {
    const organizations = ref<Organization[]>([
        {
            id: 'devnet',
            name: 'Devnet',
            nodeEndpoint: 'https://node2.server2.devnet.carmentis.io',
        },
        {
            id: 'testnet',
            name: 'Testnet',
            nodeEndpoint: 'https://ares.testnet.carmentis.io',
        },
        {
            id: 'mainnet',
            name: 'Mainnet',
            nodeEndpoint: 'https://mercurius.carmentis.io',
        },
    ])

    return { organizations }
})
