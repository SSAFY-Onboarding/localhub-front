<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import PasswordModal from '@/components/PasswordModal.vue'
import PostForm from '@/components/PostForm.vue'
import { postService } from '@/services/postService'
import { ApiError } from '@/types/posts'
import type { ScheduleItem } from '@/types/posts'

const router = useRouter()
const modalOpen = ref(false)
const busy = ref(false)
const passwordError = ref('')
const draft = ref<{ title: string; content: string; schedule: ScheduleItem[] }>({
  title: '',
  content: '',
  schedule: [],
})
const passwordModal = ref<InstanceType<typeof PasswordModal> | null>(null)
function prepare(value: { title: string; content: string; schedule: ScheduleItem[] }) {
  draft.value = value
  modalOpen.value = true
}
function closeModal() {
  modalOpen.value = false
  passwordError.value = ''
}
async function create(password: string) {
  busy.value = true
  passwordError.value = ''
  try {
    const post = await postService.createPost({ ...draft.value, password })
    await router.push({ name: 'post-detail', params: { id: post.id } })
  } catch (e) {
    passwordError.value = e instanceof ApiError ? e.message : '게시글을 등록하지 못했습니다.'
    passwordModal.value?.reset()
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section class="page-section container form-page">
    <div class="page-heading">
      <span class="eyebrow dark">NEW STORY</span>
      <h1>게시글 작성</h1>
      <p>서울에 관한 경험과 정보를 자유롭게 나눠보세요.</p>
    </div>
    <PostForm
      submit-label="등록"
      :busy="busy"
      @submit="prepare"
      @cancel="router.push({ name: 'posts' })"
    />
    <PasswordModal
      v-if="modalOpen"
      ref="passwordModal"
      mode="create"
      :busy="busy"
      :error="passwordError"
      @close="closeModal"
      @confirm="create"
    />
  </section>
</template>
