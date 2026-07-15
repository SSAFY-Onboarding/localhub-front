<script setup lang="ts">
import { computed } from 'vue'
import { categoryIconPath } from '@/utils/categoryVisuals'

const props = defineProps<{ category: string }>()
const path = computed(() => categoryIconPath(props.category))
</script>

<template>
  <svg class="place-category-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path :d="path"></path>
  </svg>
</template>
