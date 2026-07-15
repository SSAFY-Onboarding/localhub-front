<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import PlaceThumbnail from '@/components/PlaceThumbnail.vue'
import { placeService } from '@/services/placeService'
import type { Place } from '@/types/places'

const emit = defineEmits<{ close: []; select: [place: Place] }>()

const keyword = ref('')
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
        category: '숙박',
        region: '서울',
        page: page.value,
        size: 6,
      },
      controller.signal,
    )
    places.value = result.items
    totalPages.value = result.total_pages
  } catch (cause) {
    if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
      error.value = '숙소 목록을 불러오지 못했습니다. 백엔드 서버와 장소 API를 확인해주세요.'
    }
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
        <h2>숙소를 선택해주세요</h2>
        <p>실제 숙소 데이터를 검색하고 선택한 숙소를 여행 추천 기준으로 사용합니다.</p>
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
        placeholder="숙소명 또는 주소 검색"
        autofocus
      />
    </div>

    <div v-if="loading" class="picker-state"><span class="spinner"></span></div>
    <div v-else-if="error" class="picker-state">
      <p class="field-error">{{ error }}</p>
      <button class="button secondary" type="button" @click="search">다시 시도</button>
    </div>
    <ul v-else-if="places.length" class="accommodation-results">
      <li v-for="place in places" :key="place.id">
        <PlaceThumbnail
          :src="place.image_url"
          :name="place.name"
          :category="place.category"
          size="picker"
        />
        <div class="result-copy">
          <span>{{ place.category }}</span>
          <strong>{{ place.name }}</strong>
          <p>{{ place.address ?? '주소 정보 없음' }}</p>
        </div>
        <button class="button primary" type="button" @click="emit('select', place)">선택</button>
      </li>
    </ul>
    <div v-else class="picker-state">
      <strong>검색 결과가 없습니다.</strong>
      <p>다른 숙소명이나 주소를 입력해보세요.</p>
    </div>

    <div v-if="totalPages > 1" class="place-pagination">
      <button type="button" :disabled="page <= 1" @click="page--">이전</button>
      <span>{{ page }} / {{ totalPages }}</span>
      <button type="button" :disabled="page >= totalPages" @click="page++">다음</button>
    </div>
  </BaseModal>
</template>

<style scoped>
.accommodation-modal-heading{display:flex;justify-content:space-between;gap:20px;margin-bottom:22px}.accommodation-modal-heading h2{font-size:22px;margin-bottom:7px}.accommodation-modal-heading p,.picker-state p{color:#6b7772;font-size:14px}.mock-badge{align-self:flex-start;padding:6px 9px;border-radius:999px;background:#edf5f1;color:var(--green);font-size:11px;font-weight:800}.search-box{display:flex;align-items:center;gap:9px;min-height:48px;padding:0 14px;border:1px solid #d7ddd9;border-radius:10px;background:#fff;margin-bottom:18px}.search-box:focus-within{border-color:var(--green);box-shadow:0 0 0 3px rgba(17,75,59,.08)}.search-box input{width:100%;border:0;outline:0;font:inherit;background:transparent}.accommodation-results{display:grid;gap:11px;max-height:430px;overflow-y:auto;padding-right:4px}.accommodation-results li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;padding:14px;border:1px solid #e0e5e2;border-radius:12px;background:#fff}.result-copy{min-width:0}.result-copy span{color:var(--green);font-size:11px;font-weight:800}.result-copy strong{display:block;margin:3px 0 5px;font-size:15px}.result-copy p{color:#74807b;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.picker-state{min-height:220px;display:grid;place-content:center;gap:12px;text-align:center;border-radius:12px;background:#f7f8f6}.place-pagination{display:flex;justify-content:center;align-items:center;gap:16px;margin-top:18px}.place-pagination button{border:1px solid #d7ddd9;background:#fff;border-radius:8px;padding:8px 14px}.place-pagination button:disabled{opacity:.45}.spinner{width:28px;height:28px;border:3px solid #dce7e2;border-top-color:var(--green);border-radius:50%;animation:spin .8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:640px){.accommodation-results li{grid-template-columns:auto minmax(0,1fr)}.accommodation-results .button{grid-column:1/-1;width:100%}}
</style>
