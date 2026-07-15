<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import { placeService } from '@/services/placeService'
import type { Place } from '@/types/places'

defineProps<{ busy?: boolean }>()
const emit = defineEmits<{ close: []; select: [place: Place] }>()
const keyword = ref('')
const category = ref('')
const categories = ref<string[]>([])
const places = ref<Place[]>([])
const page = ref(1)
const totalPages = ref(0)
const loading = ref(false)
const error = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined

async function search() {
  controller?.abort()
  controller = new AbortController()
  loading.value = true
  error.value = ''
  try {
    const result = await placeService.getPlaces(
      {
        keyword: keyword.value,
        category: category.value,
        region: '서울',
        page: page.value,
        size: 6,
      },
      controller.signal,
    )
    places.value = result.items
    totalPages.value = result.total_pages
  } catch (cause) {
    if (!(cause instanceof DOMException && cause.name === 'AbortError'))
      error.value = '장소를 불러오지 못했습니다.'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

watch([keyword, category], () => {
  page.value = 1
  clearTimeout(timer)
  timer = setTimeout(search, 300)
})
watch(page, search)

onMounted(async () => {
  try {
    categories.value = await placeService.getCategories()
  } catch {
    error.value = '장소 카테고리를 불러오지 못했습니다.'
  }
  await search()
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  controller?.abort()
})
</script>

<template>
  <BaseModal title="일정에 장소 추가" wide :busy="busy" @close="emit('close')">
    <div class="place-picker-heading">
      <div>
        <h2>장소 선택</h2>
        <p class="modal-description">서울의 장소를 검색해 일정에 추가하세요.</p>
      </div>
      <span v-if="placeService.isMock" class="mock-badge">MOCK DATA</span>
    </div>
    <div class="place-search-controls">
      <label class="sr-only" for="place-keyword">장소 검색</label>
      <input
        id="place-keyword"
        v-model="keyword"
        class="modal-input"
        placeholder="장소명 또는 주소 검색"
      />
      <label class="sr-only" for="place-category">카테고리</label>
      <select id="place-category" v-model="category">
        <option value="">전체 카테고리</option>
        <option v-for="item in categories" :key="item" :value="item">{{ item }}</option>
      </select>
    </div>
    <div v-if="loading" class="place-picker-state"><span class="spinner"></span></div>
    <div v-else-if="error" class="place-picker-state">
      <p class="field-error">{{ error }}</p>
      <button class="button secondary" type="button" @click="search">다시 시도</button>
    </div>
    <div v-else-if="!places.length" class="place-picker-state"><p>검색 결과가 없습니다.</p></div>
    <ul v-else class="place-results">
      <li v-for="place in places" :key="place.id">
        <div>
          <span class="place-category">{{ place.category }}</span>
          <strong>{{ place.name }}</strong>
          <p>{{ place.address ?? '주소 정보 없음' }}</p>
        </div>
        <button
          class="button primary"
          type="button"
          :disabled="busy"
          @click="emit('select', place)"
        >
          추가
        </button>
      </li>
    </ul>
    <div v-if="totalPages > 1" class="place-pagination">
      <button type="button" :disabled="page <= 1" @click="page--">이전</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button type="button" :disabled="page >= totalPages" @click="page++">다음</button>
    </div>
  </BaseModal>
</template>
