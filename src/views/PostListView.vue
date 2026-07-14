<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { postService } from '@/services/postService'
import type { PostListResponse } from '@/types/posts'

const route = useRoute()
const router = useRouter()
const data = ref<PostListResponse | null>(null)
const loading = ref(true)
const error = ref('')
const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page ?? '1')) || 1))

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', { month: '2-digit', day: '2-digit' })
    .format(new Date(value))
    .replace(/\. /g, '.')
    .replace('.', '')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await postService.getPosts(page.value, 10)
  } catch {
    error.value = '게시글을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}

function move(next: number) {
  router.push({ name: 'posts', query: next > 1 ? { page: next } : {} })
}

onMounted(load)
watch(page, load)
</script>

<template>
  <section class="page-section container narrow">
    <div class="page-heading row">
      <div>
        <span class="eyebrow dark">SEOUL COMMUNITY</span>
        <h1>커뮤니티</h1>
        <p>서울에 관한 경험과 정보를 자유롭게 나눠보세요.</p>
      </div>
      <RouterLink class="button primary" to="/posts/new">＋ 글쓰기</RouterLink>
    </div>
    <div class="board-card">
      <div v-if="loading" class="state-box">
        <span class="spinner"></span>
        <p>게시글을 불러오는 중입니다.</p>
      </div>
      <div v-else-if="error" class="state-box">
        <span class="state-icon">!</span>
        <h2>{{ error }}</h2>
        <button class="button secondary" @click="load">다시 시도</button>
      </div>
      <div v-else-if="!data?.items.length" class="state-box">
        <span class="state-icon">✎</span>
        <h2>아직 등록된 게시글이 없습니다</h2>
        <p>첫 번째 서울 이야기를 남겨보세요.</p>
        <RouterLink class="button primary" to="/posts/new">글쓰기</RouterLink>
      </div>
      <template v-else>
        <div class="board-head">
          <span>번호</span><span>제목</span><span>조회</span><span>추천</span><span>작성일</span>
        </div>
        <RouterLink
          v-for="post in data.items"
          :key="post.id"
          class="board-row"
          :to="{
            name: 'post-detail',
            params: { id: post.id },
            query: page > 1 ? { fromPage: page } : {},
          }"
        >
          <span class="post-number">{{ post.id }}</span
          ><strong>{{ post.title }}</strong
          ><span class="post-views" aria-label="조회수">{{ post.view_count }}</span
          ><span class="post-likes" aria-label="추천 수">♥ {{ post.like_count }}</span
          ><time :datetime="post.created_at">{{ formatDate(post.created_at) }}</time>
        </RouterLink>
      </template>
    </div>
    <nav v-if="data && data.total_pages > 1" class="pagination" aria-label="게시글 페이지">
      <button :disabled="page <= 1" aria-label="이전 페이지" @click="move(page - 1)">‹</button>
      <button
        v-for="number in data.total_pages"
        :key="number"
        :class="{ active: number === page }"
        @click="move(number)"
      >
        {{ number }}
      </button>
      <button :disabled="page >= data.total_pages" aria-label="다음 페이지" @click="move(page + 1)">
        ›
      </button>
    </nav>
  </section>
</template>
