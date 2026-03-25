<template>
    <div class="p-6 space-y-6">
        <div class="flex items-center justify-between">
            <div>
                <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Proof Checker</h1>
                <p class="text-gray-600 dark:text-gray-400">Verify the authenticity of your proof documents</p>
            </div>
            <button
                @click="toggle"
                class="p-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            >
                <i :class="isDark ? 'pi pi-sun' : 'pi pi-moon'"></i>
            </button>
        </div>

        <!-- Node endpoint selector -->
        <Card>
            <template #content>
                <div class="flex flex-col gap-3">
                    <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Node endpoint used for verification
                    </label>
                    <div class="flex gap-2 flex-wrap">
                        <button
                            v-for="wallet in store.organizations"
                            :key="wallet.id"
                            :class="[
                                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                                nodeEndpoint === wallet.nodeEndpoint
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-blue-500 hover:text-blue-600',
                            ]"
                            @click="nodeEndpoint = wallet.nodeEndpoint"
                        >
                            <i class="pi pi-server mr-1"></i>{{ wallet.name }}
                        </button>
                    </div>
                    <InputText
                        v-model="nodeEndpoint"
                        placeholder="https://node.carmentis.io"
                        class="w-full font-mono text-sm"
                    />
                </div>
            </template>
        </Card>

        <!-- Proof upload / viewer -->
        <div v-if="proof && nodeEndpoint" class="space-y-6">
            <ProofViewer :proof="proof" :node-endpoint="nodeEndpoint" @reset="proof = undefined" />
        </div>
        <div v-else-if="!nodeEndpoint" class="text-center py-8 text-gray-400 dark:text-gray-500">
            <i class="pi pi-server text-3xl mb-3 block text-gray-300 dark:text-gray-600"></i>
            Please enter or select a node endpoint above before uploading a proof.
        </div>
        <div v-else>
            <ProofCheckerUpload @upload="onUpload" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ProofDocument } from '@cmts-dev/carmentis-sdk/client'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import { useStorageStore } from '../../stores/storage'
import { useDarkMode } from '../../composables/useDarkMode'
import ProofCheckerUpload from './ProofCheckerUpload.vue'
import ProofViewer from './ProofViewer.vue'

const store = useStorageStore()
const { isDark, toggle } = useDarkMode()

const nodeEndpoint = ref(store.organizations[0]?.nodeEndpoint ?? '')
const proof = ref<ProofDocument | undefined>()

// Si le nœud sélectionné disparaît du store, basculer sur le premier disponible
watch(store.organizations, (orgs) => {
    if (!orgs.some((o) => o.nodeEndpoint === nodeEndpoint.value)) {
        nodeEndpoint.value = orgs[0]?.nodeEndpoint ?? ''
    }
})

const onUpload = (uploadedProof: ProofDocument) => {
    proof.value = uploadedProof
}
</script>
