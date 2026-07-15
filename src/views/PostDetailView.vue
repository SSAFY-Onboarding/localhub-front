<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PasswordModal from '@/components/PasswordModal.vue'
import ScheduleTimeline from '@/components/ScheduleTimeline.vue'
import ScheduleMap from '@/components/ScheduleMap.vue'
import { postService } from '@/services/postService'
import { ApiError, type PostDetail } from '@/types/posts'

const route = useRoute()
const router = useRouter()
const post = ref<PostDetail | null>(null)
const loading = ref(true)
const error = ref('')
const deleteOpen = ref(false)
const deleting = ref(false)
const liking = ref(false)
const likeError = ref('')
const passwordError = ref('')
const passwordModal = ref<InstanceType<typeof PasswordModal> | null>(null)
const id = computed(() => Number(route.params.id))
const fromPage = computed(() => Math.max(1, Number(route.query.fromPage) || 1))
const listLocation = computed(() => ({
  name: 'posts',
  query: fromPage.value > 1 ? { page: fromPage.value } : {},
}))

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(value))
}
async function load() {
  loading.value = true
  error.value = ''
  try {
    post.value = await postService.getPost(id.value)
  } catch (e) {
    error.value =
      e instanceof ApiError && e.status === 404
        ? '요청한 게시글을 찾을 수 없습니다.'
        : '게시글을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}
async function remove(password: string) {
  deleting.value = true
  passwordError.value = ''
  try {
    await postService.deletePost(id.value, password)
    await router.push({
      ...listLocation.value,
      query: { ...listLocation.value.query, deleted: '1' },
    })
  } catch (e) {
    passwordError.value = e instanceof ApiError ? e.message : '삭제하지 못했습니다.'
    passwordModal.value?.reset()
  } finally {
    deleting.value = false
  }
}
async function likePost() {
  if (!post.value || liking.value) return
  liking.value = true
  likeError.value = ''
  try {
    const result = await postService.likePost(post.value.id)
    post.value.like_count = result.like_count
  } catch (e) {
    likeError.value = e instanceof ApiError ? e.message : '추천하지 못했습니다.'
  } finally {
    liking.value = false
  }
}
function closeDeleteModal() {
  deleteOpen.value = false
  passwordError.value = ''
}
onMounted(load)
</script>

<template>
  <section class="page-section container narrow">
    <div v-if="loading" class="state-box standalone">
      <span class="spinner"></span>
      <p>게시글을 불러오는 중입니다.</p>
    </div>
    <div v-else-if="error" class="state-box standalone">
      <span class="state-icon">!</span>
      <h1>{{ error }}</h1>
      <div class="inline-actions">
        <button v-if="!error.includes('찾을')" class="button secondary" @click="load">
          다시 시도</button
        ><button class="button primary" @click="router.push(listLocation)">목록으로</button>
      </div>
    </div>
    <article v-else-if="post" class="post-detail">
      <button class="back-link" @click="router.push(listLocation)">← 목록으로</button>
      <header>
        <span class="eyebrow dark">COMMUNITY STORY</span>
        <h1>{{ post.title }}</h1>
        <p>
          {{ formatDate(post.created_at)
          }}<template v-if="post.updated_at && post.updated_at !== post.created_at">
            · 수정됨</template
          >
          · 조회 {{ post.view_count.toLocaleString('ko-KR') }}
        </p>
      </header>
      <div class="post-content">{{ post.content }}</div>
      <ScheduleTimeline :items="post.schedule ?? []" />
      <ScheduleMap :items="post.schedule ?? []" />
      <div class="post-recommend">
        <button class="like-button" type="button" :disabled="liking" @click="likePost">
          <span aria-hidden="true">♥</span>
          {{ liking ? '추천 중...' : `추천 ${post.like_count}` }}
        </button>
        <p>로그인 없이 여러 번 추천할 수 있습니다.</p>
        <p v-if="likeError" class="field-error" role="alert">{{ likeError }}</p>
      </div>
      <footer>
        <button class="button secondary" @click="router.push(listLocation)">목록</button>
        <div>
          <button
            class="button secondary"
            @click="
              router.push({
                name: 'post-edit',
                params: { id },
                query: fromPage > 1 ? { fromPage } : {},
              })
            "
          >
            수정</button
          ><button class="button text-danger" @click="deleteOpen = true">삭제</button>
        </div>
      </footer>
    </article>
    <PasswordModal
      v-if="deleteOpen"
      ref="passwordModal"
      mode="delete"
      :busy="deleting"
      :error="passwordError"
      @close="closeDeleteModal"
      @confirm="remove"
    />
  </section>
</template>
