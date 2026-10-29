<template>
    <template v-for="segment in segments" :key="segment.type === 'card' ? segment.id : String(segment.node.key)">
        <TagCard v-if="segment.type === 'card'" :card="segment">
            <SegmentList :segments="segment.segments" :parent-level="segment.level" />
        </TagCard>
        <TrustedNode v-else :node="segment.node" :parent-level="parentLevel" />
    </template>
</template>

<script setup lang="ts">
import type { TrustLevel, TrustSegment } from '@/classes/trust/types'
import TagCard from './TagCard.vue'
import TrustedNode from './TrustedNode.vue'

defineProps<{ segments: TrustSegment[]; parentLevel?: TrustLevel | null }>()
</script>
