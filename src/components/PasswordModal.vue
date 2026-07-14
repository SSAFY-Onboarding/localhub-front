<script setup lang="ts">
import { nextTick, ref } from 'vue'
import BaseModal from './BaseModal.vue'

const props = withDefaults(defineProps<{ mode: 'create' | 'edit' | 'delete'; busy?: boolean; error?: string }>(), { busy: false, error: '' })
const emit = defineEmits<{ close: []; confirm: [password: string] }>()
const password = ref('')
const localError = ref('')
const input = ref<HTMLInputElement | null>(null)

const copy = {
  create: { title: '수정용 비밀번호 설정', description: '게시글 수정·삭제 시 사용할 비밀번호를 설정해 주세요.', action: '등록' },
  edit: { title: '수정용 비밀번호 확인', description: '작성할 때 설정한 비밀번호를 입력해 주세요.', action: '수정 완료' },
  delete: { title: '게시글 삭제', description: '비밀번호가 일치하면 게시글이 즉시 삭제됩니다.', action: '삭제' },
}[props.mode]

function confirm() {
  if (password.value.length < 4 || password.value.length > 20 || !password.value.trim()) {
    localError.value = '비밀번호는 공백이 아닌 4~20자로 입력해 주세요.'
    return
  }
  localError.value = ''
  emit('confirm', password.value)
}

defineExpose({
  reset() {
    password.value = ''
    nextTick(() => input.value?.focus())
  },
})
</script>

<template>
  <BaseModal :title="copy.title" :busy="busy" @close="emit('close')">
    <div class="modal-icon" :class="mode">{{ mode === 'delete' ? '!' : '✓' }}</div>
    <h2>{{ copy.title }}</h2>
    <p class="modal-description">{{ copy.description }}</p>
    <form @submit.prevent="confirm">
      <label class="sr-only" for="modal-password">비밀번호</label>
      <input id="modal-password" ref="input" v-model="password" class="modal-input" type="password" minlength="4" maxlength="20" placeholder="비밀번호 4~20자" autocomplete="off" autofocus :disabled="busy" />
      <p v-if="error || localError" class="field-error modal-error">{{ error || localError }}</p>
      <div class="modal-actions">
        <button class="button secondary" type="button" :disabled="busy" @click="emit('close')">취소</button>
        <button class="button" :class="mode === 'delete' ? 'danger' : 'primary'" type="submit" :disabled="busy">{{ busy ? '처리 중...' : copy.action }}</button>
      </div>
    </form>
  </BaseModal>
</template>
