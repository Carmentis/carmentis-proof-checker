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

        <!-- Proof upload / viewers -->
        <div v-if="proof instanceof AppLedgerProofWrapper" class="space-y-6">
            <AppLedgerProofViewer :proof="proof" @reset="proof = undefined" />
        </div>
        <div v-else-if="proof instanceof AccountProofWrapper" class="space-y-6">
            <AccountProofViewer :proof="proof" @reset="proof = undefined" />
        </div>
        <div v-else-if="proof instanceof MicroblockProofWrapper" class="space-y-6">
            <MicroblockProofViewer :proof="proof" @reset="proof = undefined" />
        </div>
        <div v-else-if="proof instanceof ResolutionProofWrapper" class="space-y-6">
            <ResolutionProofViewer :proof="proof" @reset="proof = undefined" />
        </div>
        <div v-else>
            <ProofCheckerUpload @upload="onUpload" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import {
    AccountProofWrapper,
    AppLedgerProofWrapper,
    MicroblockProofWrapper,
    ResolutionProofWrapper,
    ProofFactory,
    type JsonData,
    type WrappedProof
} from '@cmts-dev/carmentis-sdk-core'
import { useDarkMode } from '../../composables/useDarkMode'
import ProofCheckerUpload from './ProofCheckerUpload.vue'
import AppLedgerProofViewer from './AppLedgerProofViewer.vue'
import AccountProofViewer from './AccountProofViewer.vue'
import MicroblockProofViewer from './MicroblockProofViewer.vue'
import ResolutionProofViewer from './ResolutionProofViewer.vue'

const { isDark, toggle } = useDarkMode()

const proof = ref<
    AccountProofWrapper |
    AppLedgerProofWrapper |
    MicroblockProofWrapper |
    ResolutionProofWrapper |
    undefined
>()

const onUpload = (content: JsonData) => {
    console.log("content", JSON.stringify(content, null, 2));
    const uploadedProof = ProofFactory.importProof(content as WrappedProof);
    if (uploadedProof instanceof AppLedgerProofWrapper) {
        proof.value = uploadedProof
    }
    else if (uploadedProof instanceof AccountProofWrapper) {
        proof.value = uploadedProof
    }
    else if (uploadedProof instanceof MicroblockProofWrapper) {
        proof.value = uploadedProof
    }
    else if (uploadedProof instanceof ResolutionProofWrapper) {
        proof.value = uploadedProof
    }
}
</script>
