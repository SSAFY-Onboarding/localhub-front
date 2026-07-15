<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import PlaceThumbnail from '@/components/PlaceThumbnail.vue'
import { placeService } from '@/services/placeService'
import type { Place } from '@/types/places'

const emit = defineEmits<{ close: []; select: [place: Place] }>()
const keyword = ref('')
const accommodations = ref<Place[]>([])
const page = ref(1)
const totalPages = ref(0)
const total = ref(0)
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
      { category: '숙박', keyword: keyword.value, region: '서울', page: page.value, size: 6 },
      controller.signal,
    )
    accommodations.value = result.items
    totalPages.value = result.total_pages
    total.value = result.total
  } catch (cause) {
    if (!(cause instanceof DOMException && cause.name === 'AbortError'))
      error.value = '숙소 목록을 불러오지 못했습니다.'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

watch(keyword, () => {
  page.value = 1
  clearTimeout(timer)
  timer = setTimeout(search, 300)
})
watch(page, search)
onMounted(search)
onBeforeUnmount(() => {
  clearTimeout(timer)
  controller?.abort()
})
</script>

<template>
  <BaseModal title="기준 숙소 선택" wide @close="emit('close')">
    <div class="accommodation-modal-heading">
      <div>
        <h2>숙소를 선택해 주세요</h2>
        <p>선택한 숙소의 좌표를 기준으로 가까운 여행지를 추천합니다.</p>
      </div>
      <span v-if="placeService.isMock" class="mock-badge">MOCK DATA</span>
    </div>
    <label class="sr-only" for="accommodation-keyword">숙소 검색</label>
    <div class="search-box">
      <span aria-hidden="true">⌕</span>
      <input
        id="accommodation-keyword"
        v-model="keyword"
        type="search"
        maxlength="100"
        placeholder="숙소명 또는 주소 검색"
        autofocus
      />
    </div>
    <p v-if="!loading && !error" class="result-summary">
      검색 결과 {{ total.toLocaleString('ko-KR') }}개
    </p>
    <div v-if="loading" class="accommodation-state">
      <span class="spinner"></span>
      <p>숙소를 찾고 있습니다.</p>
    </div>
    <div v-else-if="error" class="accommodation-state">
      <p class="field-error">{{ error }}</p>
      <button class="button secondary" type="button" @click="search">다시 시도</button>
    </div>
    <ul v-else-if="accommodations.length" class="accommodation-results">
      <li v-for="place in accommodations" :key="place.id">
        <PlaceThumbnail
          :src="place.image_url"
          :name="place.name"
          :category="place.category"
          size="picker"
        />
        <div class="result-copy">
          <span>{{ place.category }}</span
          ><strong>{{ place.name }}</strong>
          <p>{{ place.address ?? '주소 정보 없음' }}</p>
          <small v-if="place.latitude === null || place.longitude === null"
            >좌표 정보가 없어 선택할 수 없습니다.</small
          >
        </div>
        <button
          class="button primary"
          type="button"
          :disabled="place.latitude === null || place.longitude === null"
          @click="emit('select', place)"
        >
          선택
        </button>
      </li>
    </ul>
    <div v-else class="empty-state">
      <strong>검색 결과가 없습니다.</strong>
      <p>다른 숙소명이나 주소를 입력해 보세요.</p>
    </div>
    <div v-if="totalPages > 1" class="place-pagination">
      <button type="button" :disabled="page <= 1" @click="page--">이전</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button type="button" :disabled="page >= totalPages" @click="page++">다음</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.accommodation-modal-heading {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 22px;
}
.accommodation-modal-heading h2 {
  font-size: 22px;
  margin-bottom: 7px;
}
.accommodation-modal-heading p,
.empty-state p {
  color: #6b7772;
  font-size: 14px;
}
.mock-badge {
  align-self: flex-start;
  padding: 6px 9px;
  border-radius: 999px;
  background: #edf5f1;
  color: var(--green);
  font-size: 11px;
  font-weight: 800;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid #d7ddd9;
  border-radius: 10px;
  background: #fff;
}
.search-box:focus-within {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(17, 75, 59, 0.08);
}
.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  font: inherit;
  background: transparent;
}
.result-summary {
  margin: 10px 2px;
  color: #74807b;
  font-size: 12px;
}
.accommodation-results {
  display: grid;
  gap: 11px;
  max-height: 430px;
  overflow-y: auto;
  padding-right: 4px;
}
.accommodation-results li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border: 1px solid #e0e5e2;
  border-radius: 12px;
  background: #fff;
}
.result-copy {
  min-width: 0;
}
.result-copy span {
  color: var(--green);
  font-size: 11px;
  font-weight: 800;
}
.result-copy strong {
  display: block;
  margin: 3px 0 5px;
  font-size: 15px;
}
.result-copy p {
  overflow: hidden;
  color: #74807b;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-copy small {
  display: block;
  margin-top: 5px;
  color: var(--danger);
  font-size: 11px;
}
.accommodation-state,
.empty-state {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 210px;
  padding: 30px;
  text-align: center;
  border-radius: 12px;
  background: #f7f8f6;
}
@media (max-width: 640px) {
  .accommodation-results li {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .accommodation-results .button {
    grid-column: 1/-1;
    width: 100%;
  }
}
</style>
