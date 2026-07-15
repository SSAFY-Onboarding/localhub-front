<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from '@/components/BaseModal.vue'
import PlaceThumbnail from '@/components/PlaceThumbnail.vue'
import type { Place } from '@/types/places'

const emit = defineEmits<{ close: []; select: [place: Place] }>()

const keyword = ref('')

const accommodations: Place[] = [
  {
    id: '3056929',
    name: '호텔 안테룸 서울',
    category: '숙박',
    address: '서울특별시 강남구 도산대로 153',
    latitude: 37.5202,
    longitude: 127.0229,
    image_url: null,
    description: '가로수길과 가까운 도심형 호텔',
    phone: null,
  },
  {
    id: '32-142001',
    name: '서울신라호텔',
    category: '숙박',
    address: '서울특별시 중구 동호로 249',
    latitude: 37.5565,
    longitude: 127.0052,
    image_url: null,
    description: '남산 인근의 대표적인 도심 호텔',
    phone: null,
  },
  {
    id: '3056930',
    name: '도미인 서울 강남',
    category: '숙박',
    address: '서울특별시 강남구 봉은사로 134',
    latitude: 37.5053,
    longitude: 127.0291,
    image_url: null,
    description: '강남역 인근의 비즈니스 호텔',
    phone: null,
  },
  {
    id: '3056931',
    name: '롯데호텔 서울',
    category: '숙박',
    address: '서울특별시 중구 을지로 30',
    latitude: 37.5654,
    longitude: 126.9809,
    image_url: null,
    description: '명동과 시청을 편리하게 이동할 수 있는 호텔',
    phone: null,
  },
  {
    id: '3056932',
    name: '나인트리 프리미어 호텔 인사동',
    category: '숙박',
    address: '서울특별시 종로구 인사동길 49',
    latitude: 37.5744,
    longitude: 126.9847,
    image_url: null,
    description: '인사동과 북촌 여행에 편리한 호텔',
    phone: null,
  },
]

const filteredAccommodations = computed(() => {
  const searchText = keyword.value.trim().toLocaleLowerCase('ko-KR')
  if (!searchText) return accommodations

  return accommodations.filter((place) =>
    `${place.name} ${place.address ?? ''}`.toLocaleLowerCase('ko-KR').includes(searchText),
  )
})
</script>

<template>
  <BaseModal title="기준 숙소 선택" wide @close="emit('close')">
    <div class="accommodation-modal-heading">
      <div>
        <h2>숙소를 선택해주세요</h2>
        <p>선택한 숙소를 기준으로 주변 여행지를 추천합니다.</p>
      </div>
      <span class="mock-badge">UI MOCK</span>
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

    <ul v-if="filteredAccommodations.length" class="accommodation-results">
      <li v-for="place in filteredAccommodations" :key="place.id">
        <PlaceThumbnail
          :src="place.image_url"
          :name="place.name"
          :category="place.category"
          size="picker"
        />
        <div class="result-copy">
          <span>{{ place.category }}</span>
          <strong>{{ place.name }}</strong>
          <p>{{ place.address }}</p>
        </div>
        <button class="button primary" type="button" @click="emit('select', place)">
          선택
        </button>
      </li>
    </ul>

    <div v-else class="empty-state">
      <strong>검색 결과가 없습니다.</strong>
      <p>다른 숙소명이나 주소를 입력해보세요.</p>
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
  margin-bottom: 18px;
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
  color: #74807b;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty-state {
  padding: 60px 20px;
  text-align: center;
  border-radius: 12px;
  background: #f7f8f6;
}
.empty-state strong {
  display: block;
  margin-bottom: 7px;
}
@media (max-width: 640px) {
  .accommodation-results li {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .accommodation-results .button {
    grid-column: 1 / -1;
    width: 100%;
  }
}
</style>
