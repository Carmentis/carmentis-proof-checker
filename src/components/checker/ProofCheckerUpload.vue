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
                accept="application/json,application/pdf"
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
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-4">Supported files: JSON, PDF</p>
            </div>
        </div>

        <Message v-if="error" severity="error" :closable="false" class="mt-6 max-w-md mx-auto">
            {{ error }}
        </Message>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { WrappedProofSchema, type JsonData } from '@cmts-dev/carmentis-sdk-core'
import { PDF } from '@libpdf/core';
import Message from 'primevue/message'

const emit = defineEmits<{
    upload: [proof: JsonData]
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

    if (!file) {
        return;
    }

    const fileType = getFileType(file);
    const reader = new FileReader();

    switch (fileType) {
        case "json": {
            reader.onload = (e) => {
                try {
                    const text = e.target?.result as string;
                    const content = JSON.parse(text);
                    emit('upload', content);
                } catch (err) {
                    console.error(err);
                    error.value = `Unable to process this JSON file. Please make sure it's a valid Carmentis proof.`;
                }
            }
            reader.readAsText(file)
            break;
        }
        case "pdf": {
            reader.onload = async (e) => {
                try {
                    const pdfBytes = e.target?.result;
                    if (!(pdfBytes instanceof ArrayBuffer)) {
                        throw new Error('Unexpected data format');
                    }
                    const pdfDoc = await PDF.load(new Uint8Array(pdfBytes));
                    const attachments = pdfDoc.getAttachments();

                    for (const file of attachments) {
                        const data = pdfDoc.getAttachment(file[0]);
                        if (data === null) {
                            throw new Error('Unable to extract attachment');
                        }
                        const text = new TextDecoder().decode(data);
                        const content = JSON.parse(text);
                        try {
                            emit('upload', content);
                            return;
                        }
                        catch (err) {
                            console.error(`'${file[0]}' is not recognized as a Carmentis proof`);
                        }
                    }
                    throw new Error('No Carmentis proof found');
                } catch (err) {
                    console.error(err);
                    error.value = `Unable to process this PDF file. Please make sure a valid Carmentis proof is attached.`;
                }
            }
            reader.readAsArrayBuffer(file)
            break;
        }
        default: {
            error.value = 'Supported file formats are JSON and PDF.';
            return;
        }
    }
}

const getFileType = (file: File): string => {
    const lowerCaseName = file.name.toLowerCase();

    if (file.type === "application/json" || lowerCaseName.endsWith(".json")) {
        return "json";
    }
    if (file.type === "application/pdf" || lowerCaseName.endsWith(".pdf")) {
        return "pdf";
    }
    return "unknown";
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
