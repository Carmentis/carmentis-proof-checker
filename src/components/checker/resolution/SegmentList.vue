<template>
    <template v-for="segment in segments" :key="segment.type === 'card' ? segment.id : String(segment.node.key)">
        <TagCard v-if="segment.type === 'card'" :card="segment">
            <!-- A credential reads as its claims and validity, not as a dump of token fields. -->
            <CredentialBody v-if="segment.evidence[0]?.kind === 'credential'" :card="segment" />
            <SegmentList v-else :segments="segment.segments" :parent-level="segment.level" />
        </TagCard>
        <TrustedNode v-else :node="segment.node" :parent-level="parentLevel" />
    </template>
</template>

<script setup lang="ts">
import type { TrustLevel, TrustSegment } from '@/classes/trust/types'
import CredentialBody from './CredentialBody.vue'
import TagCard from './TagCard.vue'
import TrustedNode from './TrustedNode.vue'

defineProps<{ segments: TrustSegment[]; parentLevel?: TrustLevel | null }>()
</script>
