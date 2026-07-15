<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{ title: string; busy?: boolean; wide?: boolean }>()
const emit = defineEmits<{ close: [] }>()
const panel = ref<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => {
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  panel.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="modal-backdrop" role="presentation" @mousedown.self="!busy && emit('close')">
      <section
        ref="panel"
        :class="['modal-panel', { wide }]"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        tabindex="-1"
      >
        <button
          class="modal-close"
          type="button"
          :disabled="busy"
          aria-label="닫기"
          @click="emit('close')"
        >
          ×
        </button>
        <slot />
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  z-index: 3000;
}
</style>
