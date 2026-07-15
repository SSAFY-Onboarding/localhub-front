<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import L, { type Map as LeafletMap, type Marker } from 'leaflet'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { placeService } from '@/services/placeService'
import type { MarkerPlace } from '@/types/places'

const route = useRoute()
const router = useRouter()
const mapElement = ref<HTMLElement | null>(null)
const categories = ref<string[]>([])
const selectedCategories = ref<string[]>([])
const selectedPlace = ref<MarkerPlace | null>(null)
const loading = ref(true)
const error = ref('')
const total = ref(0)
const truncated = ref(false)
let map: LeafletMap | null = null
let markers: Marker[] = []
let requestController: AbortController | null = null
let fetchTimer: ReturnType<typeof setTimeout> | null = null
let categoriesReady = false

const allCategoriesSelected = computed(
  () => categories.value.length > 0 && selectedCategories.value.length === categories.value.length,
)

const categoryColors: Record<string, string> = {
  관광지: '#c65f42',
  문화시설: '#765c9f',
  축제공연행사: '#d98b2b',
  여행코스: '#287d65',
  레포츠: '#3377a8',
  숙박: '#805843',
  쇼핑: '#b04f77',
}

function markerIcon(category: string, active = false) {
  const color = categoryColors[category] ?? '#114b3b'
  const zoom = map?.getZoom() ?? 12
  const baseSize = zoom >= 17 ? 26 : zoom >= 15 ? 22 : zoom >= 13 ? 18 : 14
  const size = active ? baseSize + 8 : baseSize
  return L.divIcon({
    className: 'map-marker-shell',
    html: `<span class="map-marker${active ? ' active' : ''}" style="--marker-color:${color};--marker-size:${size}px"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function renderMarkers(items: MarkerPlace[]) {
  markers.forEach((marker) => marker.remove())
  markers = []
  if (!map) return
  items.forEach((place) => {
    if (place.latitude === null || place.longitude === null) return
    const marker = L.marker([place.latitude, place.longitude], {
      icon: markerIcon(place.category, selectedPlace.value?.id === place.id),
      title: place.name,
      keyboard: true,
    })
    marker.on('click', () => {
      selectedPlace.value = place
      void router.replace({ query: { ...route.query, place: place.id } })
      markers.forEach((item) =>
        item.setIcon(markerIcon((item as Marker & { placeCategory?: string }).placeCategory ?? '')),
      )
      ;(marker as Marker & { placeCategory?: string }).placeCategory = place.category
      marker.setIcon(markerIcon(place.category, true))
    })
    ;(marker as Marker & { placeCategory?: string }).placeCategory = place.category
    marker.addTo(map!)
    markers.push(marker)
  })
}

async function fetchPlaces() {
  if (!map) return
  requestController?.abort()
  if (categoriesReady && selectedCategories.value.length === 0) {
    renderMarkers([])
    total.value = 0
    truncated.value = false
    loading.value = false
    error.value = ''
    return
  }
  const controller = new AbortController()
  requestController = controller
  const bounds = map.getBounds()
  loading.value = true
  error.value = ''
  try {
    const mapBounds = {
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast(),
    }
    const results = await Promise.all(
      allCategoriesSelected.value
        ? [placeService.getMapPlaces(mapBounds, '', '', controller.signal)]
        : selectedCategories.value.length
          ? selectedCategories.value.map((category) =>
              placeService.getMapPlaces(mapBounds, category, '', controller.signal),
            )
          : [],
    )
    const places = [
      ...new Map(
        results.flatMap((result) => result.items).map((place) => [place.id, place]),
      ).values(),
    ]
    total.value = results.reduce((sum, result) => sum + result.total, 0)
    truncated.value = results.some((result) => result.truncated)
    renderMarkers(places)
    const selected = places.find((place) => place.id === route.query.place)
    if (selected) selectedPlace.value = selected
  } catch (cause) {
    if (!(cause instanceof DOMException && cause.name === 'AbortError'))
      error.value = '현재 지도 영역의 장소를 불러오지 못했습니다.'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

function scheduleFetch() {
  if (fetchTimer) clearTimeout(fetchTimer)
  fetchTimer = setTimeout(fetchPlaces, 250)
}

function closePlace() {
  selectedPlace.value = null
  void router.replace({ query: { ...route.query, place: undefined } })
  markers.forEach((marker) =>
    marker.setIcon(markerIcon((marker as Marker & { placeCategory?: string }).placeCategory ?? '')),
  )
}

function selectAllCategories() {
  selectedCategories.value = allCategoriesSelected.value ? [] : [...categories.value]
}

function toggleCategory(category: string) {
  selectedCategories.value = selectedCategories.value.includes(category)
    ? selectedCategories.value.filter((item) => item !== category)
    : [...selectedCategories.value, category]
}

watch(selectedCategories, () => {
  selectedPlace.value = null
  void router.replace({ query: {} })
  void fetchPlaces()
})

onMounted(async () => {
  await nextTick()
  if (!mapElement.value) return
  map = L.map(mapElement.value, { zoomControl: false, minZoom: 10, maxZoom: 18 }).setView(
    [37.5665, 126.978],
    12,
  )
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)
  map.on('moveend', scheduleFetch)
  try {
    categories.value = await placeService.getCategories()
    selectedCategories.value.push(...categories.value)
    categoriesReady = true
    const placeId = typeof route.query.place === 'string' ? route.query.place : ''
    if (placeId) {
      const place = await placeService.getPlace(placeId)
      if (place.latitude !== null && place.longitude !== null) {
        selectedPlace.value = place
        map.setView([place.latitude, place.longitude], 16)
      }
    }
  } catch {
    error.value = '지도 초기 정보를 불러오지 못했습니다.'
    loading.value = false
    return
  }
  await fetchPlaces()
})

onBeforeUnmount(() => {
  requestController?.abort()
  if (fetchTimer) clearTimeout(fetchTimer)
  map?.remove()
  map = null
})
</script>

<template>
  <section class="map-page">
    <div class="container map-page-heading">
      <div>
        <span class="eyebrow dark">EXPLORE SEOUL</span>
        <h1>지역 지도</h1>
        <p>지도를 움직이거나 유형을 선택해 서울의 다양한 장소를 둘러보세요.</p>
      </div>
      <div class="map-result-summary">
        <strong>{{ total.toLocaleString('ko-KR') }}</strong
        ><span>현재 영역 장소</span>
      </div>
    </div>
    <div class="container map-category-bar" role="group" aria-label="장소 유형 필터">
      <button
        :class="{ active: allCategoriesSelected }"
        type="button"
        :aria-pressed="allCategoriesSelected"
        :aria-label="allCategoriesSelected ? '전체 카테고리 선택 해제' : '전체 카테고리 선택'"
        @click="selectAllCategories"
      >
        전체
      </button>
      <button
        v-for="category in categories"
        :key="category"
        :class="{ active: selectedCategories.includes(category) }"
        type="button"
        :aria-pressed="selectedCategories.includes(category)"
        @click="toggleCategory(category)"
      >
        {{ category }}
      </button>
    </div>
    <div class="map-stage">
      <div ref="mapElement" class="local-map" aria-label="서울 장소 지도"></div>
      <div v-if="loading" class="map-status loading">
        <span class="spinner"></span><span>장소를 불러오는 중</span>
      </div>
      <div v-else-if="error" class="map-status error">
        <span>{{ error }}</span
        ><button type="button" @click="fetchPlaces">다시 시도</button>
      </div>
      <div v-else-if="!selectedCategories.length" class="map-status empty">
        표시할 장소 유형을 선택해 주세요.
      </div>
      <div v-if="truncated && !loading" class="map-zoom-notice">
        장소가 너무 많아 일부만 표시합니다. 지도를 확대해 주세요.
      </div>
      <aside v-if="selectedPlace" class="map-place-card">
        <button
          class="map-place-close"
          type="button"
          aria-label="장소 정보 닫기"
          @click="closePlace"
        >
          ×
        </button>
        <span class="place-category">{{ selectedPlace.category }}</span>
        <h2>{{ selectedPlace.name }}</h2>
        <p>{{ selectedPlace.address ?? '주소 정보 없음' }}</p>
        <a
          v-if="selectedPlace.latitude !== null && selectedPlace.longitude !== null"
          :href="`https://www.openstreetmap.org/?mlat=${selectedPlace.latitude}&mlon=${selectedPlace.longitude}#map=17/${selectedPlace.latitude}/${selectedPlace.longitude}`"
          target="_blank"
          rel="noopener noreferrer"
          >큰 지도에서 보기 ↗</a
        >
      </aside>
    </div>
  </section>
</template>
