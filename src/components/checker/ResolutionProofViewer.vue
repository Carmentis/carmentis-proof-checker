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
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Proof Export Time</p>
                            <p class="font-medium text-gray-800 dark:text-gray-200">{{ exportedAt }}</p>
                        </div>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Chain ID</p>
                            <p class="font-mono text-sm break-all text-gray-800 dark:text-gray-200">
                                {{ chainId }}
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
        <div
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md"
        >
            <div class="p-6">
                <h4
                    class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center"
                >
                    Data Explorer
                </h4>
                <BlockViewer :data="verificationResult.resolvedJson" :initial-path="[]" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {
    ProviderFactory,
    ResolutionProofWrapper,
    Resolver,
    type JsonObject,
} from '@cmts-dev/carmentis-sdk-core'
import ProgressSpinner from 'primevue/progressspinner'
import { Network } from '@/classes/Network.ts'
import { ProofCheckerResolverHydrator } from '@/classes/ProofCheckerResolverHydrator'
import BlockViewer from './BlockViewer.vue'

const props = defineProps<{
    proof: ResolutionProofWrapper
}>()

const emit = defineEmits<{
    reset: []
}>()

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const explorerUrl = ref("")
const verificationResult = ref<{
    resolvedJson: JsonObject
} | null>(null)

const author = ref('')
const exportedAt = ref('')
const chainId = ref('')

onMounted(async () => {
    try {
        chainId.value = props.proof.getChainId();
        const nodeEndpoint = Network.getNodeEndpoint(chainId.value);
        const provider = ProviderFactory.createInMemoryProviderWithExternalProvider(
            nodeEndpoint,
        );

        explorerUrl.value = Network.getExplorerUrl(chainId.value);
        author.value = props.proof.getAuthor();
        exportedAt.value = props.proof.getDate().toLocaleString();

        const proof = props.proof.getObject().proof;
        const checkerResolverHydrator = new ProofCheckerResolverHydrator(provider, proof.proofs);
        const checkerResolver = new Resolver(provider, checkerResolverHydrator);
        const checkerResolvedJson = await checkerResolver.resolveFromOutput(proof);
        const report = checkerResolver.getReport();
        console.log(report);
        const valid = JSON.stringify(checkerResolvedJson) === JSON.stringify(proof.resolvedJson);
        console.log(valid);
        if (!valid) {
            console.log("proof.resolvedJson", JSON.stringify(proof.resolvedJson, null, 2));
            console.log("checkerResolvedJson", JSON.stringify(checkerResolvedJson, null, 2));
        }
/*
        const checkerOutput: ResolverOutput = {
            linkedJson: rootObject.linkedJson,
            resolvedJson: checkerResolvedJson,
            digestData: rootObject.digestData,
            proofs: generatorResolverHydrator.getProofs(),
        }
*/
        verificationResult.value = { resolvedJson: checkerResolvedJson };
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
