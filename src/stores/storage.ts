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
            id: 'testnet',
            name: 'Testnet',
            nodeEndpoint: 'https://ares.testnet.carmentis.io',
        },
        {
            id: 'devnet',
            name: 'Devnet',
            nodeEndpoint: 'https://node1.server1.devnet.carmentis.io',
        },
    ])

    return { organizations }
})
