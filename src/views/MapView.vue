<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import L, {
  type Map as LeafletMap,
  type Marker,
  type MarkerCluster,
  type MarkerClusterGroup,
  type Popup,
} from 'leaflet'
import 'leaflet.markercluster'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PlaceCategoryIcon from '@/components/PlaceCategoryIcon.vue'
import PlaceThumbnail from '@/components/PlaceThumbnail.vue'
import { placeService } from '@/services/placeService'
import type { MarkerPlace } from '@/types/places'
import { categoryColor, categoryColors, categoryMarkerIconSvg } from '@/utils/categoryVisuals'
import { fallbackPlaceThumbnail } from '@/utils/placeThumbnail'

type SheetState = 'peek' | 'half' | 'full'
type PlaceMarker = Marker & { placeCategory?: string; placeId?: string }

const route = useRoute()
const router = useRouter()
const mapElement = ref<HTMLElement | null>(null)
const listElement = ref<HTMLElement | null>(null)
const categories = ref<string[]>([])
const selectedCategories = ref<string[]>([])
const places = ref<MarkerPlace[]>([])
const selectedPlace = ref<MarkerPlace | null>(null)
const searchInput = ref('')
const searchKeyword = ref('')
const listPage = ref(1)
const sheetState = ref<SheetState>('peek')
const sidebarCollapsed = ref(false)
const loading = ref(true)
const error = ref('')
const areaTotal = ref(0)
const truncated = ref(false)
const boundsDirty = ref(false)
const currentAreaLabel = ref('')
let map: LeafletMap | null = null
let placePopup: Popup | null = null
let clusterGroup: MarkerClusterGroup | null = null
let markers: PlaceMarker[] = []
let requestController: AbortController | null = null
let fetchTimer: ReturnType<typeof setTimeout> | null = null
let areaLabelTimer: ReturnType<typeof setTimeout> | null = null
let areaLabelController: AbortController | null = null
let zooming = false
let categoriesReady = false

const pageSize = 12
const allCategoriesSelected = computed(
  () => categories.value.length > 0 && selectedCategories.value.length === categories.value.length,
)
const filteredPlaces = computed(() => places.value)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredPlaces.value.length / pageSize)))
const pagedPlaces = computed(() =>
  filteredPlaces.value.slice((listPage.value - 1) * pageSize, listPage.value * pageSize),
)

function markerIcon(category: string, active = false) {
  const color = categoryColor(category)
  const zoom = map?.getZoom() ?? 12
  const baseSize = zoom >= 17 ? 26 : zoom >= 15 ? 22 : zoom >= 13 ? 18 : 14
  const size = active ? baseSize + 8 : baseSize
  const showCategoryIcon = zoom >= 15
  const icon = showCategoryIcon ? categoryMarkerIconSvg(category) : ''
  return L.divIcon({
    className: 'map-marker-shell',
    html: `<span class="map-marker${active ? ' active' : ''}${showCategoryIcon ? ' has-icon' : ''}" style="--marker-color:${color};--marker-size:${size}px">${icon}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function clusterIcon(cluster: MarkerCluster) {
  const count = cluster.getChildCount()
  const size = count >= 100 ? 52 : count >= 20 ? 44 : 36
  return L.divIcon({
    className: 'map-cluster-shell',
    html: `<span class="map-cluster" style="--cluster-size:${size}px">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function updateMarkerSelection() {
  markers.forEach((marker) =>
    marker.setIcon(
      markerIcon(marker.placeCategory ?? '', marker.placeId === selectedPlace.value?.id),
    ),
  )
}

function popupContent(place: MarkerPlace) {
  const container = document.createElement('div')
  container.className = 'map-place-popup'
  const category = document.createElement('span')
  category.textContent = place.category
  const name = document.createElement('strong')
  name.textContent = place.name
  const address = document.createElement('p')
  address.textContent = place.address ?? '주소 정보 없음'
  const image = document.createElement('img')
  image.src = place.image_url || fallbackPlaceThumbnail(place.category)
  image.alt = `${place.name} 대표 이미지`
  image.loading = 'lazy'
  image.referrerPolicy = 'no-referrer'
  image.addEventListener(
    'error',
    () => {
      image.src = fallbackPlaceThumbnail(place.category)
    },
    { once: true },
  )
  container.append(image, category, name, address)
  return container
}

function openPlacePopup(place: MarkerPlace) {
  if (!map || !placePopup || place.latitude === null || place.longitude === null) return
  placePopup
    .setLatLng([place.latitude, place.longitude])
    .setContent(popupContent(place))
    .openOn(map)
}

async function selectPlace(place: MarkerPlace, moveMap = true) {
  selectedPlace.value = place
  updateMarkerSelection()
  const marker = markers.find((item) => item.placeId === place.id)
  if (
    moveMap &&
    map &&
    clusterGroup &&
    marker &&
    place.latitude !== null &&
    place.longitude !== null
  ) {
    // zoomToShowLayer pans/zooms until the marker is out of any cluster, then opens its popup
    clusterGroup.zoomToShowLayer(marker, () => openPlacePopup(place))
  } else {
    openPlacePopup(place)
  }
  void router.replace({ query: { place: place.id } })
  if (window.matchMedia('(max-width: 760px)').matches) sheetState.value = 'half'
  await nextTick()
  document.getElementById(`map-place-${place.id}`)?.scrollIntoView({ block: 'nearest' })
}

function renderMarkers(items: MarkerPlace[]) {
  clusterGroup?.clearLayers()
  markers = []
  if (!map || !clusterGroup) return
  items.forEach((place) => {
    if (place.latitude === null || place.longitude === null) return
    const marker = L.marker([place.latitude, place.longitude], {
      icon: markerIcon(place.category, selectedPlace.value?.id === place.id),
      title: place.name,
      keyboard: true,
    }) as PlaceMarker
    marker.placeCategory = place.category
    marker.placeId = place.id
    marker.on('click', () => void selectPlace(place, false))
    markers.push(marker)
  })
  clusterGroup.addLayers(markers)
}

function applyDisplayedPlaces() {
  listPage.value = Math.min(listPage.value, totalPages.value)
  renderMarkers(filteredPlaces.value)
}

async function fetchPlaces() {
  if (!map) return
  requestController?.abort()
  boundsDirty.value = false
  if (categoriesReady && selectedCategories.value.length === 0) {
    places.value = []
    selectedPlace.value = null
    areaTotal.value = 0
    truncated.value = false
    loading.value = false
    error.value = ''
    applyDisplayedPlaces()
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
        ? [placeService.getMapPlaces(mapBounds, '', searchKeyword.value, controller.signal)]
        : selectedCategories.value.length
          ? selectedCategories.value.map((category) =>
              placeService.getMapPlaces(
                mapBounds,
                category,
                searchKeyword.value,
                controller.signal,
              ),
            )
          : [],
    )
    places.value = [
      ...new Map(
        results.flatMap((result) => result.items).map((place) => [place.id, place]),
      ).values(),
    ]
    areaTotal.value = results.reduce((sum, result) => sum + result.total, 0)
    truncated.value = results.some((result) => result.truncated)
    listPage.value = 1
    const requestedPlace = places.value.find((place) => place.id === route.query.place)
    if (requestedPlace) {
      selectedPlace.value = requestedPlace
      openPlacePopup(requestedPlace)
    } else if (selectedPlace.value) {
      selectedPlace.value = null
      placePopup?.remove()
      void router.replace({ query: {} })
    }
    applyDisplayedPlaces()
  } catch (cause) {
    if (!(cause instanceof DOMException && cause.name === 'AbortError'))
      error.value = '현재 지도 영역의 장소를 불러오지 못했습니다.'
  } finally {
    if (!controller.signal.aborted) loading.value = false
  }
}

function scheduleFetch() {
  if (fetchTimer) clearTimeout(fetchTimer)
  fetchTimer = setTimeout(() => void fetchPlaces(), 250)
}

async function updateAreaLabel() {
  if (!map) return
  const center = map.getCenter()
  areaLabelController?.abort()
  const controller = new AbortController()
  areaLabelController = controller
  try {
    const params = new URLSearchParams({
      format: 'jsonv2',
      lat: String(center.lat),
      lon: String(center.lng),
      zoom: '14',
      'accept-language': 'ko',
    })
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return
    const data = await response.json()
    const address = data.address ?? {}
    const region: string = address.state || address.city || ''
    const district: string =
      address.borough || address.city_district || address.county || address.district || ''
    const label = [region, district].filter(Boolean).join(' ')
    if (label) currentAreaLabel.value = label
  } catch (cause) {
    if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
      // 위치 라벨은 보조 정보라 실패해도 이전 값을 그대로 둔다
    }
  }
}

function scheduleAreaLabelUpdate() {
  if (areaLabelTimer) clearTimeout(areaLabelTimer)
  areaLabelTimer = setTimeout(() => void updateAreaLabel(), 600)
}

async function applySearch() {
  searchKeyword.value = searchInput.value.trim()
  listPage.value = 1
  selectedPlace.value = null
  placePopup?.remove()
  void router.replace({ query: {} })
  await fetchPlaces()
}

async function clearSearch() {
  searchInput.value = ''
  searchKeyword.value = ''
  listPage.value = 1
  selectedPlace.value = null
  placePopup?.remove()
  void router.replace({ query: {} })
  await fetchPlaces()
}

function selectAllCategories() {
  selectedCategories.value = allCategoriesSelected.value ? [] : [...categories.value]
}

function toggleCategory(category: string) {
  selectedCategories.value = selectedCategories.value.includes(category)
    ? selectedCategories.value.filter((item) => item !== category)
    : [...selectedCategories.value, category]
}

function changePage(page: number) {
  listPage.value = page
  listElement.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

function cycleSheet() {
  sheetState.value =
    sheetState.value === 'peek' ? 'half' : sheetState.value === 'half' ? 'full' : 'peek'
}

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  sessionStorage.setItem('localhub-map-sidebar-collapsed', String(sidebarCollapsed.value))
  window.setTimeout(() => map?.invalidateSize(), 230)
}

watch(selectedCategories, () => {
  selectedPlace.value = null
  placePopup?.remove()
  void router.replace({ query: {} })
  void fetchPlaces()
})

onMounted(async () => {
  sidebarCollapsed.value = sessionStorage.getItem('localhub-map-sidebar-collapsed') === 'true'
  await nextTick()
  if (!mapElement.value) return
  map = L.map(mapElement.value, { zoomControl: false, minZoom: 10, maxZoom: 18 }).setView(
    [37.5665, 126.978],
    12,
  )
  placePopup = L.popup({ maxWidth: 280, offset: [0, -8], className: 'localhub-map-popup' })
  map.on('popupclose', () => {
    if (!selectedPlace.value) return
    selectedPlace.value = null
    updateMarkerSelection()
    void router.replace({ query: {} })
  })
  L.control.zoom({ position: 'bottomright' }).addTo(map)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)
  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 60,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    iconCreateFunction: clusterIcon,
  }).addTo(map)
  map.on('zoomstart', () => {
    zooming = true
  })
  map.on('moveend', () => {
    if (zooming) {
      zooming = false
      scheduleFetch()
    } else {
      boundsDirty.value = true
    }
    markers.forEach((marker) =>
      marker.setIcon(
        markerIcon(marker.placeCategory ?? '', marker.placeId === selectedPlace.value?.id),
      ),
    )
    scheduleAreaLabelUpdate()
  })
  void updateAreaLabel()
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
  areaLabelController?.abort()
  if (fetchTimer) clearTimeout(fetchTimer)
  if (areaLabelTimer) clearTimeout(areaLabelTimer)
  map?.remove()
  map = null
  placePopup = null
  clusterGroup = null
})
</script>

<template>
  <section class="map-page integrated-map-page">
    <div class="container map-page-heading">
      <div>
        <span class="eyebrow dark">EXPLORE SEOUL</span>
        <h1>지역 지도</h1>
        <p>지도와 목록을 함께 보며 서울의 장소를 탐색하세요.</p>
      </div>
      <div class="map-result-summary">
        <strong>{{ filteredPlaces.length.toLocaleString('ko-KR') }}</strong
        ><span>표시 장소</span>
      </div>
    </div>
    <div :class="['map-explorer', { 'sidebar-collapsed': sidebarCollapsed }]">
      <aside
        :class="['map-sidebar', `sheet-${sheetState}`, { collapsed: sidebarCollapsed }]"
        aria-label="장소 검색과 목록"
      >
        <button
          class="map-sidebar-toggle"
          type="button"
          :aria-expanded="!sidebarCollapsed"
          :aria-label="sidebarCollapsed ? '장소 목록 펼치기' : '장소 목록 접기'"
          @click="toggleSidebar"
        >
          <span aria-hidden="true">{{ sidebarCollapsed ? '→' : '←' }}</span>
          <small v-if="sidebarCollapsed">목록</small>
        </button>
        <button
          class="map-sheet-handle"
          type="button"
          :aria-label="`목록 패널 ${sheetState === 'full' ? '축소' : '확장'}`"
          @click="cycleSheet"
        >
          <span></span><strong>현재 영역 장소 {{ areaTotal.toLocaleString('ko-KR') }}개</strong
          ><small>{{
            sheetState === 'peek' ? '목록 보기' : sheetState === 'half' ? '전체 보기' : '지도 보기'
          }}</small>
        </button>
        <div class="map-sidebar-content">
          <form class="map-search" role="search" @submit.prevent="applySearch">
            <label class="sr-only" for="map-place-search">현재 영역 장소 검색</label
            ><input
              id="map-place-search"
              v-model="searchInput"
              maxlength="100"
              placeholder="장소명 또는 주소 검색"
            /><button type="submit">검색</button
            ><button
              v-if="searchKeyword"
              class="map-search-clear"
              type="button"
              aria-label="검색어 지우기"
              @click="clearSearch"
            >
              ×
            </button>
          </form>
          <div class="map-category-bar" role="group" aria-label="장소 유형 필터">
            <button
              :class="{ active: allCategoriesSelected }"
              type="button"
              :aria-pressed="allCategoriesSelected"
              @click="selectAllCategories"
            >
              <span class="map-category-all-icon" aria-hidden="true">
                <i
                  v-for="category in categories"
                  :key="category"
                  :style="{ backgroundColor: categoryColor(category) }"
                ></i>
              </span>
              전체</button
            ><button
              v-for="category in categories"
              :key="category"
              :class="{ active: selectedCategories.includes(category) }"
              type="button"
              :aria-pressed="selectedCategories.includes(category)"
              :title="`${category} 마커 표시 또는 숨기기`"
              @click="toggleCategory(category)"
            >
              <span
                class="map-category-icon"
                :style="{ backgroundColor: categoryColor(category) }"
                aria-hidden="true"
              >
                <PlaceCategoryIcon :category="category" />
              </span>
              {{ category }}
            </button>
          </div>
          <div class="map-list-summary">
            <p>
              <strong>{{ filteredPlaces.length.toLocaleString('ko-KR') }}</strong
              >개 표시<template v-if="searchKeyword"> · ‘{{ searchKeyword }}’ 검색</template>
            </p>
            <button v-if="searchKeyword" type="button" @click="clearSearch">초기화</button>
          </div>
          <div ref="listElement" class="map-place-list-wrap">
            <div v-if="loading" class="map-list-state">
              <span class="spinner"></span>
              <p>장소를 불러오는 중입니다.</p>
            </div>
            <div v-else-if="error" class="map-list-state">
              <span class="state-icon">!</span>
              <p>{{ error }}</p>
              <button type="button" @click="fetchPlaces">다시 시도</button>
            </div>
            <div v-else-if="!selectedCategories.length" class="map-list-state">
              <p>표시할 장소 유형을 선택해 주세요.</p>
            </div>
            <div v-else-if="!filteredPlaces.length" class="map-list-state">
              <p>조건에 맞는 장소가 없습니다.</p>
              <button v-if="searchKeyword" type="button" @click="clearSearch">검색 초기화</button>
            </div>
            <ul v-else class="map-place-list">
              <li
                v-for="place in pagedPlaces"
                :id="`map-place-${place.id}`"
                :key="place.id"
                :class="{ active: selectedPlace?.id === place.id }"
              >
                <button type="button" @click="selectPlace(place)">
                  <PlaceThumbnail
                    :src="place.image_url"
                    :name="place.name"
                    :category="place.category"
                    size="sidebar"
                  />
                  <span
                    class="map-list-marker"
                    :style="{ backgroundColor: categoryColors[place.category] ?? '#3659d9' }"
                    aria-hidden="true"
                  >
                    <PlaceCategoryIcon :category="place.category" /></span
                  ><span
                    ><small>{{ place.category }}</small
                    ><strong>{{ place.name }}</strong
                    ><em>{{ place.address ?? '주소 정보 없음' }}</em></span
                  >
                </button>
              </li>
            </ul>
          </div>
          <div v-if="totalPages > 1" class="map-list-pagination">
            <button type="button" :disabled="listPage <= 1" @click="changePage(listPage - 1)">
              ← 이전</button
            ><span>{{ listPage }} / {{ totalPages }}</span
            ><button
              type="button"
              :disabled="listPage >= totalPages"
              @click="changePage(listPage + 1)"
            >
              다음 →
            </button>
          </div>
        </div>
      </aside>
      <div class="map-canvas-wrap">
        <div ref="mapElement" class="local-map" aria-label="서울 장소 지도"></div>
        <p v-if="currentAreaLabel" class="map-current-area">
          <span aria-hidden="true">📍</span>{{ currentAreaLabel }}
        </p>
        <button v-if="boundsDirty" class="map-research-button" type="button" @click="fetchPlaces">
          이 지역에서 다시 검색
        </button>
        <div v-if="truncated && !loading" class="map-zoom-notice">
          장소가 너무 많아 일부만 표시합니다. 지도를 확대해 주세요.
        </div>
      </div>
    </div>
  </section>
</template>
