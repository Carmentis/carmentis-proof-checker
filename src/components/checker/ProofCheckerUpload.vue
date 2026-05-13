<template>
    <div class="flex flex-col items-center justify-center py-12">
        <div class="max-w-xl w-full mx-auto text-center mb-8">
            <h2 class="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-3">Upload Proof File</h2>
            <p class="text-gray-600 dark:text-gray-400">
                Upload a JSON proof file to verify its authenticity and view its contents
            </p>
        </div>

        <div
            :class="[
                'w-full max-w-md mx-auto border-2 border-dashed rounded-lg p-12 transition-all duration-200 ease-in-out cursor-pointer',
                isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700',
            ]"
            @click="fileInputRef?.click()"
            @dragover="handleDragOver"
            @dragleave="handleDragLeave"
            @drop="handleDrop"
        >
            <input
                type="file"
                accept="application/json"
                ref="fileInputRef"
                class="hidden"
                @change="handleFileUpload"
            />
            <div class="flex flex-col items-center justify-center">
                <div
                    :class="[
                        'w-20 h-20 rounded-full flex items-center justify-center mb-4',
                        isDragging
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
                    ]"
                >
                    <i class="pi pi-upload text-4xl"></i>
                </div>
                <p class="text-lg font-medium text-gray-700 dark:text-gray-300">
                    {{ isDragging ? 'Drop your file here' : 'Drag and drop your file here' }}
                </p>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-2">or</p>
                <button
                    class="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    @click.stop="fileInputRef?.click()"
                >
                    Browse Files
                </button>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">Supported file: JSON</p>
            </div>
        </div>

        <Message v-if="error" severity="error" :closable="false" class="mt-6 max-w-md mx-auto">
            {{ error }}
        </Message>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ProofDocument } from '@cmts-dev/carmentis-sdk-core'
import Message from 'primevue/message'

const emit = defineEmits<{
    upload: [proof: ProofDocument]
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const error = ref<string | null>(null)

const handleFileUpload = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    processFile(file)
}

const processFile = (file?: File) => {
    error.value = null
    if (file) {
        if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
            error.value = 'Please upload a JSON file'
            return
        }

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const content = JSON.parse(e.target?.result as string)
                const proofDocument = ProofDocument.fromObject(content)
                emit('upload', proofDocument)
            } catch (err) {
                console.error(err)
                error.value = 'Invalid JSON file. Please upload a valid JSON file.'
            }
        }
        reader.readAsText(file)
    }
}

const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = true
}

const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = false
}

const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    isDragging.value = false

    if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        processFile(e.dataTransfer.files[0])
    }
}
</script>
