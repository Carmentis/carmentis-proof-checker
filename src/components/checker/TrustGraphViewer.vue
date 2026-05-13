<template>
<div
    class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
>
    <div class="p-6">
        <div class="flex justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" :width="diagramWidth" :height="diagramHeight">
                <!-- arrow marker def -->
                <defs>
                    <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6"
                            orient="auto-start-reverse">
                        <path d="M0,0 L10,5 L0,10 Z" fill="context-stroke"/>
                    </marker>
                </defs>

                <!-- arrows -->
                <path
                    v-for="conn in connections"
                    :key="conn.from + '-' + conn.to"
                    :d="conn.d"
                    :stroke="conn.stroke"
                    :stroke-width="conn.strokeWidth"
                    :marker-end="conn.markerEnd ? `url(#${conn.markerEnd})` : undefined"
                    fill="none"
                />

                <!-- blocks -->
                <g
                    v-for="block in blocks"
                    :key="block.id"
                    class="cursor-pointer"
                    @click="select(block.id)"
                >
                    <rect
                        :x="block.x"
                        :y="block.y"
                        :width="block.width"
                        :height="block.height"
                        :rx="block.rx"
                        :fill="block.fill"
                        :stroke="block.stroke"
                        stroke-width="3"
                    />
                    <text
                        :x="block.textX"
                        :y="block.textY"
                        text-anchor="middle"
                        font-family="ui-sans-serif, Arial"
                        font-size="14"
                        fill="#000"
                    >
                        {{ block.label }}
                    </text>
                    <g v-if="block.iconPaths" :transform="block.iconTransform">
                        <path
                            v-for="(p, index) in block.iconPaths"
                            :key="index"
                            :d="p.d"
                            :fill="p.fill"
                            :stroke="p.stroke"
                            :stroke-width="p.strokeWidth"
                            :stroke-linecap="p.strokeLinecap"
                        />
                    </g>
                </g>
            </svg>
        </div>
    </div>
</div>
<!-- Modal Overlay -->
<transition name="fade">
    <div
        v-if="showModal"
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        @click.self="closeModal"
    >
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-xl w-full">
            <div class="flex items-start gap-3 mb-4">
                <div v-html="modalContent.svg"></div>
                <div>
                    <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-200">{{ modalContent.title }}</h2>
                    <div class="inline-flex items-center px-3 py-1 mt-2 rounded-full text-sm font-medium"
                         :class="{
              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300': modalContent.tagColor === 'green',
              'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300': modalContent.tagColor === 'red'
            }"
                    >
          <span class="w-2 h-2 rounded-full mr-2"
                :class="{
              'bg-green-500': modalContent.tagColor === 'green',
              'bg-red-500': modalContent.tagColor === 'red'
            }"
          ></span>{{ modalContent.tagLabel }}
                    </div>
                </div>
            </div>
            <template v-for="section in modalContent.sections">
                <h3>{{ section.name }}</h3>
                <div class="grid grid-cols-[auto_auto_1fr] gap-x-2 mb-4">
                    <template v-for="(value, key) in section.data" :key="key">
                        <span class="text-gray-500">{{ key }}</span>
                        <span>:</span>
                        <span>{{ value }}</span>
                    </template>
                </div>
            </template>
            <div>
                <button
                    @click="toggleVerificationDetails"
                    class="w-full flex items-center justify-between text-left font-medium"
                >
                    <span>What has been verified?</span>
                    <span class="transition-transform" :class="{ 'rotate-90': showVerificationDetails }">›</span>
                </button>
                <div v-show="showVerificationDetails" class="px-4 pb-4 text-gray-600 dark:text-gray-300">
                    <ul>
                        <li v-for="(verification, ndx) in modalContent.verifications" :key="ndx" class="flex items-center gap-2">
                            <svg v-if="verification.success" class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 10-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z"/>
                            </svg>
                            <svg v-else class="w-4 h-4 text-red-600 mt-0.5" fill="none" viewBox="0 0 20 20">
                                <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2"/>
                                <path d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            {{ verification.operation }}
                        </li>
                    </ul>
                </div>
            </div>
            <button
                @click="closeModal"
                class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
                Close
            </button>
        </div>
    </div>
</transition>
</template>

<script setup lang="ts">
import {ref, onMounted} from 'vue'
import {
    type ImportedProof,
} from '@cmts-dev/carmentis-sdk-core'
import {
    type ModalContent,
    type Block,
    type Connection,
} from "@/classes/types"
import { TrustGraphDiagram } from "@/classes/TrustGraphDiagram.ts"
import { TrustGraph } from "@/classes/TrustGraph.ts"

const props = defineProps<{
    records: ImportedProof[]
    vbId: string
}>()

const emit = defineEmits<{
    reset: []
}>()

const loading = ref(true)
const errorMessage = ref<string | null>(null)

const showModal = ref(false)
const modalContent = ref<ModalContent>({
    svg: "",
    tagLabel: "",
    tagColor: "",
    title: "",
    sections: [],
    verifications: [],
})
const blocks = ref<Block[]>([])
const connections = ref<Connection[]>([])
const diagramWidth = ref(0);
const diagramHeight = ref(0);

const showVerificationDetails = ref(false)

function toggleVerificationDetails() {
    showVerificationDetails.value = !showVerificationDetails.value
}

function openModal(content: ModalContent) {
    modalContent.value = content
    showModal.value = true
}

function closeModal() {
    showModal.value = false
}

function select(id: string) {
    const b = blocks.value.find((x) => x.id === id)!
    openModal(b.modalContent);
}

onMounted(async () => {
    try {
        const vbId = props.vbId;
        const importedProofs = props.records;
        const trustGraph = new TrustGraph(vbId, importedProofs);
        await trustGraph.build();
        const diagram = new TrustGraphDiagram(trustGraph);
        blocks.value = diagram.getBlocks();
        connections.value = diagram.getConnections();
        diagramWidth.value = diagram.getWidth();
        diagramHeight.value = diagram.getHeight();
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
