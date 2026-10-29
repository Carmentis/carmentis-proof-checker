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

    <div v-else-if="report" class="space-y-6">
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

        <TrustSummary :report="report" />
        <TrustFailures v-if="report.unresolved.length || report.mismatches.length || report.counts.failed" :report="report" />

        <div
            class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
            <div class="p-6">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                    <div>
                        <p class="text-gray-500 dark:text-gray-400 mb-1">Proof Export Time</p>
                        <p class="font-medium text-gray-800 dark:text-gray-200">{{ exportedAt }}</p>
                    </div>
                    <div>
                        <p class="text-gray-500 dark:text-gray-400 mb-1">Chain ID</p>
                        <p class="font-mono break-all text-gray-800 dark:text-gray-200">{{ chainId }}</p>
                    </div>
                    <div>
                        <p class="text-gray-500 dark:text-gray-400 mb-1">Author</p>
                        <p class="font-medium text-gray-800 dark:text-gray-200">{{ author }}</p>
                    </div>
                </div>
            </div>
        </div>

        <section
            class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
            aria-labelledby="resolved-data"
        >
            <div class="p-6">
                <h3 id="resolved-data" class="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                    Resolved data
                </h3>
                <p class="mt-1 mb-4 max-w-prose text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                    Each value carries a label telling you how much it can be trusted. Select a label to see why.
                </p>
                <TrustedNode :node="report.root" />
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {
    ProviderFactory,
    ResolutionProofWrapper,
    Resolver,
} from '@cmts-dev/carmentis-sdk-core'
import ProgressSpinner from 'primevue/progressspinner'
import { Network } from '@/classes/Network.ts'
import { ProofCheckerResolverHydrator } from '@/classes/ProofCheckerResolverHydrator'
import { analyzeProof } from '@/classes/trust/ProofTrustAnalyzer'
import type { TrustReport } from '@/classes/trust/types'
import TrustSummary from './resolution/TrustSummary.vue'
import TrustFailures from './resolution/TrustFailures.vue'
import TrustedNode from './resolution/TrustedNode.vue'

const props = defineProps<{
    proof: ResolutionProofWrapper
}>()

const emit = defineEmits<{
    reset: []
}>()

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const explorerUrl = ref("")
const report = ref<TrustReport | null>(null)

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
        report.value = await analyzeProof({
            linkedJson: proof.linkedJson,
            resolvedJson: checkerResolvedJson,
            claimedResolvedJson: proof.resolvedJson,
            report: checkerResolver.getReport(),
        });
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
