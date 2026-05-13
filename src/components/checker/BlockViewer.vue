<template>
    <div class="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <!-- Breadcrumb navigation -->
        <div
            v-if="path.length > 0"
            class="flex items-center mb-4 text-sm bg-gray-50 dark:bg-gray-900 p-2 rounded-md overflow-x-auto"
        >
            <button
                @click="path = []"
                class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center"
            >
                <i class="pi pi-home mr-1"></i>
                Root
            </button>

            <div v-for="(segment, index) in path" :key="index" class="flex items-center">
                <i class="pi pi-chevron-right mx-1 text-gray-400 dark:text-gray-500"></i>
                <button
                    @click="path = path.slice(0, index + 1)"
                    :class="[
                        index === path.length - 1
                            ? 'text-gray-700 dark:text-gray-300 font-medium'
                            : 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300',
                    ]"
                >
                    {{ segment }}
                </button>
            </div>
        </div>

        <!-- Back button -->
        <div
            v-if="path.length > 0"
            class="bg-gray-50 dark:bg-gray-900 px-4 py-2 border-b border-gray-200 dark:border-gray-700"
        >
            <button
                @click="path = path.slice(0, -1)"
                class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center text-sm"
            >
                <i class="pi pi-arrow-left mr-1"></i>
                Back
            </button>
        </div>

        <!-- Data table -->
        <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr
                        v-for="([key, value], index) in Object.entries(shownData)"
                        :key="index"
                        :class="[
                            'border-b border-gray-200 dark:border-gray-700',
                            canNavigate(value)
                                ? 'hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer'
                                : '',
                        ]"
                        @click="canNavigate(value) ? navigateTo(key) : null"
                    >
                        <td
                            class="py-3 px-4 font-medium text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 w-1/3"
                        >
                            {{ key }}
                        </td>
                        <td
                            :class="[
                                'py-3 px-4',
                                canNavigate(value)
                                    ? 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300'
                                    : 'text-gray-700 dark:text-gray-300',
                            ]"
                        >
                            <div v-if="canNavigate(value)" class="flex items-center">
                                <span>{{ formatValue(value) }}</span>
                                <i class="pi pi-chevron-right ml-2"></i>
                            </div>
                            <span v-else :class="typeof value === 'string' ? 'break-all' : ''">
                                {{ formatValue(value) }}
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { JsonData } from '@cmts-dev/carmentis-sdk-core'

const props = defineProps<{
    data: JsonData
    initialPath: string[]
}>()

const path = ref<string[]>([...props.initialPath])

const shownData = computed(() => {
    let current: any = props.data
    for (const token of path.value) {
        current = current[token]
    }
    return current
})

const isArrayOfStrings = (value: any): boolean => {
    return Array.isArray(value) && value.every((v) => typeof v === 'string')
}

const isDate = (value: any): boolean => {
    return value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))
}

const canNavigate = (value: any): boolean => {
    const isArray = Array.isArray(value)
    const isObject = typeof value === 'object' && value !== null

    if (!isArray && isObject) {
        return true
    }

    if (isArray) {
        return value.length > 0 && typeof value[0] === 'object'
    }

    return false
}

const formatValue = (value: any): string => {
    const isArrayOfStr = isArrayOfStrings(value)
    const isArray = Array.isArray(value)
    const isObject = typeof value === 'object' && value !== null

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return String(value)
    } else if (isArrayOfStr) {
        return value.join(', ')
    } else if (isDate(value)) {
        return new Date(value).toLocaleString()
    } else if (!isArray && isObject) {
        return 'Object'
    } else if (isArray) {
        return `Array (${value.length} items)`
    } else if (value === null) {
        return 'null'
    } else {
        return 'Cannot display'
    }
}

const navigateTo = (key: string) => {
    path.value = [...path.value, key]
}

watch(
    () => props.data,
    () => {
        path.value = [...props.initialPath]
    },
)
</script>
