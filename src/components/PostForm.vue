<script setup lang="ts">
import { computed, reactive, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    initialTitle?: string
    initialContent?: string
    submitLabel: string
    busy?: boolean
  }>(),
  {
    initialTitle: '',
    initialContent: '',
    busy: false,
  },
)
const emit = defineEmits<{ submit: [value: { title: string; content: string }]; cancel: [] }>()
const form = reactive({ title: props.initialTitle, content: props.initialContent })
const touched = reactive({ title: false, content: false })

watch(
  () => [props.initialTitle, props.initialContent],
  ([title, content]) => {
    form.title = title ?? ''
    form.content = content ?? ''
  },
)

const titleError = computed(() => {
  const value = form.title.trim()
  if (!touched.title) return ''
  if (!value) return '제목을 입력해 주세요.'
  if (value.length > 100) return '제목은 100자 이내로 입력해 주세요.'
  return ''
})
const contentError = computed(() => {
  const value = form.content.trim()
  if (!touched.content) return ''
  if (!value) return '내용을 입력해 주세요.'
  if (value.length > 5000) return '내용은 5,000자 이내로 입력해 주세요.'
  return ''
})

function submit() {
  touched.title = true
  touched.content = true
  if (titleError.value || contentError.value) return
  emit('submit', { title: form.title.trim(), content: form.content.trim() })
}
</script>

<template>
  <form class="post-form" @submit.prevent="submit">
    <div class="field-group">
      <div class="field-label">
        <label for="post-title">제목</label><span>{{ form.title.length }} / 100</span>
      </div>
      <input
        id="post-title"
        v-model="form.title"
        :disabled="busy"
        maxlength="100"
        placeholder="제목을 입력해 주세요"
        @blur="touched.title = true"
      />
      <p v-if="titleError" class="field-error">{{ titleError }}</p>
    </div>
    <div class="field-group">
      <div class="field-label">
        <label for="post-content">내용</label><span>{{ form.content.length }} / 5,000</span>
      </div>
      <textarea
        id="post-content"
        v-model="form.content"
        :disabled="busy"
        maxlength="5000"
        rows="13"
        placeholder="서울의 장소와 경험을 자유롭게 나눠 주세요."
        @blur="touched.content = true"
      ></textarea>
      <p v-if="contentError" class="field-error">{{ contentError }}</p>
    </div>
    <div class="form-actions">
      <button class="button secondary" type="button" :disabled="busy" @click="emit('cancel')">
        취소
      </button>
      <button class="button primary" type="submit" :disabled="busy">
        {{ busy ? '처리 중...' : submitLabel }}
      </button>
    </div>
  </form>
</template>
