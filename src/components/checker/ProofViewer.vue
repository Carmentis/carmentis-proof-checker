<template>
    <div v-if="loading" class="flex flex-col items-center justify-center py-12">
        <ProgressSpinner/>
        <p class="text-lg text-gray-700 dark:text-gray-300 mt-4">Verifying proof...</p>
    </div>

    <div
        v-else-if="errorMessage"
        class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 my-6"
    >
        <div class="flex items-center mb-4">
            <i class="pi pi-exclamation-circle text-red-600 dark:text-red-400 text-2xl mr-3"></i>
            <h3 class="text-lg font-semibold text-red-700 dark:text-red-300">Proof Verification Failed</h3>
        </div>
        <p class="text-red-600 dark:text-red-400 mb-4">
            {{ errorMessage }}
        </p>
        <button
            @click="emit('reset')"
            class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
            Try Another Proof
        </button>
    </div>

    <div v-else-if="verificationResult" class="space-y-6">
        <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">Proof Details</h2>
            <button
                @click="emit('reset')"
                class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
                <i class="pi pi-refresh mr-2"></i>
                Verify Another Proof
            </button>
        </div>

        <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-4">
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Verification Status</p>
                            <div
                                class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            >
                                <span class="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                Verified
                            </div>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Proof Title</p>
                            <p class="font-medium text-gray-800 dark:text-gray-200">{{ title }}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Proof Export Time</p>
                            <p class="font-medium text-gray-800 dark:text-gray-200">{{ exportedAt }}</p>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Virtual Blockchain ID</p>
                            <p class="font-mono text-sm break-all text-gray-800 dark:text-gray-200">
                                {{ appLedgerId }}
                            </p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Author</p>
                            <p class="font-medium text-gray-800 dark:text-gray-200">{{ author }}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">Graph of Trust</h2>
        </div>

        <TrustGraphViewer :vbId="appLedgerId" :records="records"/>
        <ProofRecordViewer v-if="records" :records="records"/>
    </div>
</template>

<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {
    ProofDocument,
    Hash,
    ProviderFactory,
    type ImportedProof,
} from '@cmts-dev/carmentis-sdk-core'
import ProgressSpinner from 'primevue/progressspinner'
import ProofRecordViewer from './ProofRecordViewer.vue'
import TrustGraphViewer from './TrustGraphViewer.vue'

const props = defineProps<{
    proof: ProofDocument
    nodeEndpoint: string
}>()

const emit = defineEmits<{
    reset: []
}>()

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const verificationResult = ref<{
    appLedgerId: string
    records: ImportedProof[]
} | null>(null)

const title = ref('')
const author = ref('')
const exportedAt = ref('')
const appLedgerId = ref('')
const records = ref<ImportedProof[]>([])

onMounted(async () => {
    try {
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(
            props.nodeEndpoint,
        );

        title.value = props.proof.getTitle();
        author.value = props.proof.getAuthor();
        exportedAt.value = props.proof.getDate().toLocaleString();

        const proofDocumentVBs = props.proof.getVirtualBlockchains();
        if (proofDocumentVBs.length !== 1) {
            throw new Error(
                'Proof document contains multiple virtual blockchains. Only one virtual blockchain is supported.',
            );
        }

        const proofDocumentVB = proofDocumentVBs[0]!;
        const vbId = proofDocumentVB.getIdentifier();
        const appLedgerIdHash = Hash.fromHex(vbId);
        const appLedgerVb = await provider.loadApplicationLedgerVirtualBlockchain(appLedgerIdHash);
        const importedProofs = await appLedgerVb.importProof(props.proof.getObject());

        appLedgerId.value = vbId;
        records.value = importedProofs;

        verificationResult.value = {
            appLedgerId: vbId,
            records: importedProofs,
        }
    } catch (error) {
        console.error('Proof verification error:', error);
        errorMessage.value =
            error instanceof Error
                ? error.message
                : 'Unable to verify the proof. The proof might be invalid or corrupted.';
    } finally {
        loading.value = false;
    }
})
</script>
