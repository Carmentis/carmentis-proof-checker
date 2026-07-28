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
        <div class="flex justify-between items-center">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">Accounts</h2>
        </div>
        <div
            v-for="(account) in verificationResult.provenAccounts"
            class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
            <div class="p-6">
                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Verification Status</p>
                        <div
                            v-if="account.valid"
                            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                        >
                            <span class="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                            Valid
                        </div>
                        <div
                            v-else
                            class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                        >
                            <span class="w-2 h-2 rounded-full bg-red-500 mr-2"></span>
                            Invalid
                        </div>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Current state</p>
                        <a :href="explorerUrl + '/accounts/' + account.id" target="_blank">
                            <i class="pi pi-external-link"></i> view on explorer
                        </a>
                    </div>
                </div>
                <div class="grid grid-cols-1 gap-6 mt-4">
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Account ID</p>
                        <p class="font-mono text-sm break-all text-gray-800 dark:text-gray-200 mr-2">
                            {{ account.id }}
                        </p>
                    </div>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Balance</p>
                        <p class="text-sm break-all text-gray-800 dark:text-gray-200 mr-2">
                            {{ account.balance }}
                        </p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Spendable</p>
                        <p class="text-sm break-all text-gray-800 dark:text-gray-200 mr-2">
                            {{ account.spendable }}
                        </p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Locked in staking</p>
                        <p class="text-sm break-all text-gray-800 dark:text-gray-200 mr-2">
                            {{ account.staked }}
                        </p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Locked in vesting</p>
                        <p class="text-sm break-all text-gray-800 dark:text-gray-200 mr-2">
                            {{ account.vested }}
                        </p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Locked in escrows</p>
                        <p class="text-sm break-all text-gray-800 dark:text-gray-200 mr-2">
                            {{ account.escrowed }}
                        </p>
                    </div>
                    <div v-if="!account.valid">
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Error</p>
                        <p class="font-mono text-sm break-all text-gray-800 dark:text-gray-200">{{ account.error }}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {
    StateChecker,
    AccountProofWrapper,
    BalanceAvailability,
    Base64,
    BlockchainUtils,
    TokenUnit,
} from '@cmts-dev/carmentis-sdk-core'
import ProgressSpinner from 'primevue/progressspinner'
import { Network } from '@/classes/Network.ts'

interface ProvenAccount {
    id: string
    blockHeight: number
    appHash: string
    balance: string
    spendable: string
    staked: string
    vested: string
    escrowed: string
    valid: boolean
    error: string
}

const props = defineProps<{
    proof: AccountProofWrapper
}>()

const emit = defineEmits<{
    reset: []
}>()

const loading = ref(true)
const errorMessage = ref<string | null>(null)
const explorerUrl = ref("")
const verificationResult = ref<{
    provenAccounts: ProvenAccount[]
} | null>(null)

const author = ref('')
const exportedAt = ref('')
const chainId = ref('')

onMounted(async () => {
    try {
        chainId.value = props.proof.getChainId();
        explorerUrl.value = Network.getExplorerUrl(chainId.value);
        author.value = props.proof.getAuthor();
        exportedAt.value = props.proof.getDate().toLocaleString();

        const proof = props.proof.getObject().proof;
        const provenAccounts: ProvenAccount[] = [];

        for (const account of proof.accounts) {
            const encodedState = Base64.decodeBinary(account.account.serializedState, Base64.BASE64);
            const state = BlockchainUtils.decodeAccountState(encodedState);
            const balanceAvailability = new BalanceAvailability;
            balanceAvailability.setBalance(state.balance);
            balanceAvailability.setLocks(state.locks);

            const provenAccount = {
                id: account.account.virtualBlockchainId,
                blockHeight: account.block.height,
                appHash: account.block.appHash,
                balance: balanceAvailability.getBalance().toString(
                    TokenUnit.TOKEN,
                    { locale: "system", grouping: true, decimalPlaces: 2 }
                ),
                spendable: balanceAvailability.getSpendable().toString(
                    TokenUnit.TOKEN,
                    { locale: "system", grouping: true, decimalPlaces: 2 }
                ),
                staked: balanceAvailability.getStaked().toString(
                    TokenUnit.TOKEN,
                    { locale: "system", grouping: true, decimalPlaces: 2 }
                ),
                vested: balanceAvailability.getVested().toString(
                    TokenUnit.TOKEN,
                    { locale: "system", grouping: true, decimalPlaces: 2 }
                ),
                escrowed: balanceAvailability.getEscrowed().toString(
                    TokenUnit.TOKEN,
                    { locale: "system", grouping: true, decimalPlaces: 2 }
                ),
                valid: true,
                error: "",
            };
            try {
                StateChecker.verifyAccountProofFromJson(account);
            }
            catch (err) {
                provenAccount.valid = false;
                provenAccount.error = String(err)
            }
            provenAccounts.push(provenAccount);
        }
        verificationResult.value = { provenAccounts };
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
