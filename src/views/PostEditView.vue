<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PasswordModal from '@/components/PasswordModal.vue'
import PostForm from '@/components/PostForm.vue'
import { postService } from '@/services/postService'
import { ApiError, type PostDetail, type ScheduleItem } from '@/types/posts'

const route = useRoute()
const router = useRouter()
const post = ref<PostDetail | null>(null)
const loading = ref(true)
const loadError = ref('')
const modalOpen = ref(false)
const busy = ref(false)
const passwordError = ref('')
const draft = ref<{ title: string; content: string; schedule: ScheduleItem[] }>({
  title: '',
  content: '',
  schedule: [],
})
const passwordModal = ref<InstanceType<typeof PasswordModal> | null>(null)
const id = computed(() => Number(route.params.id))
const fromPage = computed(() => Math.max(1, Number(route.query.fromPage) || 1))
const detailLocation = computed(() => ({
  name: 'post-detail',
  params: { id: id.value },
  query: fromPage.value > 1 ? { fromPage: fromPage.value } : {},
}))
async function load() {
  loading.value = true
  loadError.value = ''
  try {
    post.value = await postService.getPost(id.value)
  } catch (e) {
    loadError.value =
      e instanceof ApiError && e.status === 404
        ? '요청한 게시글을 찾을 수 없습니다.'
        : '게시글을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}
function prepare(value: { title: string; content: string; schedule: ScheduleItem[] }) {
  draft.value = value
  modalOpen.value = true
}
function closeModal() {
  modalOpen.value = false
  passwordError.value = ''
}
async function update(password: string) {
  busy.value = true
  passwordError.value = ''
  try {
    await postService.updatePost(id.value, { ...draft.value, password })
    await router.push(detailLocation.value)
  } catch (e) {
    passwordError.value = e instanceof ApiError ? e.message : '게시글을 수정하지 못했습니다.'
    passwordModal.value?.reset()
  } finally {
    busy.value = false
  }
}
onMounted(load)
</script>

<template>
  <section class="page-section container form-page">
    <div v-if="loading" class="state-box standalone">
      <span class="spinner"></span>
      <p>게시글을 불러오는 중입니다.</p>
    </div>
    <div v-else-if="loadError" class="state-box standalone">
      <span class="state-icon">!</span>
      <h1>{{ loadError }}</h1>
      <div class="inline-actions">
        <button v-if="!loadError.includes('찾을')" class="button secondary" @click="load">
          다시 시도</button
        ><button class="button primary" @click="router.push({ name: 'posts' })">목록으로</button>
      </div>
    </div>
    <template v-else-if="post"
      ><div class="page-heading">
        <span class="eyebrow dark">EDIT STORY</span>
        <h1>게시글 수정</h1>
        <p>내용을 수정한 뒤 작성할 때 설정한 비밀번호를 입력해 주세요.</p>
      </div>
      <PostForm
        :initial-title="post.title"
        :initial-content="post.content"
        :initial-schedule="post.schedule ?? []"
        submit-label="수정 완료"
        :busy="busy"
        @submit="prepare"
        @cancel="router.push(detailLocation)"
    /></template>
    <PasswordModal
      v-if="modalOpen"
      ref="passwordModal"
      mode="edit"
      :busy="busy"
      :error="passwordError"
      @close="closeModal"
      @confirm="update"
    />
  </section>
</template>
