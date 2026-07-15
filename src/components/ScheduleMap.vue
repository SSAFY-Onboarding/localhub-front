<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import L, { type LayerGroup, type Map as LeafletMap } from 'leaflet'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { ScheduleItem } from '@/types/posts'
import { fallbackPlaceThumbnail } from '@/utils/placeThumbnail'

const props = withDefaults(defineProps<{ items: ScheduleItem[]; compact?: boolean }>(), {
  compact: false,
})
const mapElement = ref<HTMLElement | null>(null)
const validItems = computed(() =>
  props.items
    .filter((item) => item.lat !== null && item.lng !== null)
    .sort((a, b) => a.day - b.day || a.order - b.order),
)
const dayColors = ['#c65f42', '#3377a8', '#765c9f', '#287d65', '#d98b2b', '#b04f77', '#805843']
let map: LeafletMap | null = null
let layers: LayerGroup | null = null
let lastCoordinateKey = ''

function popupContent(item: ScheduleItem) {
  const container = document.createElement('div')
  container.className = 'schedule-map-popup'
  const image = document.createElement('img')
  image.src = item.image_url || fallbackPlaceThumbnail(item.type)
  image.alt = `${item.name} 대표 이미지`
  image.referrerPolicy = 'no-referrer'
  image.addEventListener(
    'error',
    () => {
      image.src = fallbackPlaceThumbnail(item.type)
    },
    { once: true },
  )
  const label = document.createElement('span')
  label.textContent = `DAY ${item.day} · ${item.order}번째${item.time ? ` · ${item.time}` : ''}`
  const name = document.createElement('strong')
  name.textContent = item.name
  container.append(image, label, name)
  if (item.memo) {
    const memo = document.createElement('p')
    memo.textContent = item.memo
    container.append(memo)
  }
  return container
}

function markerIcon(item: ScheduleItem) {
  const color = dayColors[(item.day - 1) % dayColors.length]
  return L.divIcon({
    className: 'schedule-map-marker-shell',
    html: `<span class="schedule-map-marker" style="--schedule-color:${color}">${item.order}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -14],
  })
}

function draw() {
  if (!map || !layers) return
  layers.clearLayers()
  const bounds: [number, number][] = []
  const byDay = new Map<number, [number, number][]>()
  validItems.value.forEach((item) => {
    const point: [number, number] = [item.lat!, item.lng!]
    bounds.push(point)
    const dayPoints = byDay.get(item.day) ?? []
    dayPoints.push(point)
    byDay.set(item.day, dayPoints)
    L.marker(point, {
      icon: markerIcon(item),
      title: `${item.day}일차 ${item.order}. ${item.name}`,
    })
      .bindPopup(popupContent(item), { maxWidth: 250, className: 'schedule-place-popup' })
      .addTo(layers!)
  })
  byDay.forEach((points, day) => {
    if (points.length < 2) return
    L.polyline(points, {
      color: dayColors[(day - 1) % dayColors.length],
      weight: 3,
      opacity: 0.72,
      dashArray: '7 7',
    }).addTo(layers!)
  })
  const coordinateKey = validItems.value
    .map((item) => `${item.day}:${item.order}:${item.lat}:${item.lng}`)
    .join('|')
  if (coordinateKey !== lastCoordinateKey && bounds.length) {
    lastCoordinateKey = coordinateKey
    if (bounds.length === 1) map.setView(bounds[0]!, 15)
    else map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 })
  }
}

async function ensureMap() {
  await nextTick()
  if (!validItems.value.length) {
    map?.remove()
    map = null
    layers = null
    lastCoordinateKey = ''
    return
  }
  if (!mapElement.value) return
  if (!map) {
    map = L.map(mapElement.value, {
      scrollWheelZoom: false,
      zoomControl: true,
      minZoom: 10,
      maxZoom: 18,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    layers = L.layerGroup().addTo(map)
  }
  map.invalidateSize()
  draw()
}

watch(() => props.items, ensureMap, { deep: true })
onMounted(ensureMap)
onBeforeUnmount(() => map?.remove())
</script>

<template>
  <section v-if="validItems.length" :class="['schedule-map-section', { compact }]">
    <div class="schedule-map-heading">
      <div>
        <span class="eyebrow dark">COURSE MAP</span>
        <h2>일정 지도</h2>
      </div>
      <span>{{ validItems.length }}개 장소</span>
    </div>
    <div ref="mapElement" class="schedule-map-canvas" aria-label="여행 일정 장소 지도"></div>
    <p v-if="validItems.length < items.length" class="schedule-map-note">
      좌표가 없는 {{ items.length - validItems.length }}개 장소는 지도에서 제외했습니다.
    </p>
  </section>
</template>
