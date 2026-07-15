<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const open = ref(false)
const route = useRoute()
</script>

<template>
  <header class="site-header">
    <div class="container header-inner">
      <RouterLink class="brand" to="/" @click="open = false">
        <span class="brand-mark" aria-hidden="true">L</span>
        <span>LocalHub <small>SEOUL</small></span>
      </RouterLink>
      <button
        class="menu-button"
        type="button"
        :aria-expanded="open"
        aria-label="메뉴 열기"
        @click="open = !open"
      >
        <span></span><span></span><span></span>
      </button>
      <nav :class="['main-nav', { open }]" aria-label="주 메뉴">
        <RouterLink to="/" @click="open = false">홈</RouterLink>
        <RouterLink to="/map" @click="open = false">지역 지도</RouterLink>
        <RouterLink to="/chatbot" @click="open = false">AI 여행 추천</RouterLink>
        <RouterLink
          :class="{ 'router-link-active': route.path.startsWith('/posts') }"
          to="/posts"
          @click="open = false"
          >커뮤니티</RouterLink
        >
      </nav>
    </div>
  </header>
</template>
