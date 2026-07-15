<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { fallbackPlaceThumbnail } from '@/utils/placeThumbnail'

const props = withDefaults(
  defineProps<{
    src?: string | null
    name: string
    category: string
    size?: 'sidebar' | 'popup' | 'picker' | 'schedule' | 'timeline'
    eager?: boolean
  }>(),
  { src: null, size: 'sidebar', eager: false },
)
const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)
const imageSrc = computed(() =>
  !failed.value && props.src ? props.src : fallbackPlaceThumbnail(props.category),
)
</script>

<template>
  <span :class="['place-thumbnail', `place-thumbnail-${size}`]">
    <img
      :src="imageSrc"
      :alt="`${name} 대표 이미지`"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
  </span>
</template>
