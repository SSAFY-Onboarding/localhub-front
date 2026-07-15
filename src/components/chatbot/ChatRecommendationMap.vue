<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import L, { type LayerGroup, type Map as LeafletMap, type Marker } from 'leaflet'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Place } from '@/types/places'
import type { RecommendedPlace } from '@/types/chat'
import { fallbackPlaceThumbnail } from '@/utils/placeThumbnail'

const props = defineProps<{
  accommodation: Place | null
  places: RecommendedPlace[]
  selectedPlaceId: string | null
  active?: boolean
}>()
const emit = defineEmits<{ select: [placeId: string] }>()
const mapElement = ref<HTMLElement | null>(null)
let map: LeafletMap | null = null
let layers: LayerGroup | null = null
let placeMarkers = new Map<string, Marker>()
let lastBoundsKey = ''

function markerIcon(label: string, kind: 'hotel' | 'place', active = false) {
  return L.divIcon({
    className: 'chat-map-marker-shell',
    html: `<span class="chat-map-marker ${kind}${active ? ' active' : ''}">${label}</span>`,
    iconSize: [active ? 42 : 34, active ? 42 : 34],
    iconAnchor: [active ? 21 : 17, active ? 21 : 17],
    popupAnchor: [0, -18],
  })
}

function popupContent(place: RecommendedPlace) {
  const container = document.createElement('div')
  container.className = 'chat-map-popup'
  const image = document.createElement('img')
  image.src = place.image_url || fallbackPlaceThumbnail(place.category)
  image.alt = `${place.name} 대표 이미지`
  image.referrerPolicy = 'no-referrer'
  image.addEventListener('error', () => (image.src = fallbackPlaceThumbnail(place.category)), {
    once: true,
  })
  const category = document.createElement('span')
  category.textContent = `${place.category} · 직선거리 ${place.distance_km.toFixed(2)}km`
  const name = document.createElement('strong')
  name.textContent = place.name
  const reason = document.createElement('p')
  reason.textContent = place.reason
  container.append(image, category, name, reason)
  return container
}

function draw() {
  if (!map || !layers || !props.accommodation) return
  layers.clearLayers()
  placeMarkers = new Map()
  const bounds: [number, number][] = []
  if (props.accommodation.latitude !== null && props.accommodation.longitude !== null) {
    const point: [number, number] = [props.accommodation.latitude, props.accommodation.longitude]
    bounds.push(point)
    L.marker(point, {
      icon: markerIcon('H', 'hotel'),
      title: `기준 숙소 ${props.accommodation.name}`,
    })
      .bindTooltip(props.accommodation.name, { direction: 'top', offset: [0, -17] })
      .addTo(layers)
  }
  props.places.forEach((place, index) => {
    const point: [number, number] = [place.latitude, place.longitude]
    bounds.push(point)
    const marker = L.marker(point, {
      icon: markerIcon(String(index + 1), 'place', props.selectedPlaceId === place.id),
      title: `${index + 1}. ${place.name}`,
    })
      .bindPopup(popupContent(place), { maxWidth: 270, className: 'chat-place-popup' })
      .on('click', () => emit('select', place.id))
      .addTo(layers!)
    placeMarkers.set(place.id, marker)
  })

  const boundsKey = bounds.map(([lat, lng]) => `${lat}:${lng}`).join('|')
  if (bounds.length && boundsKey !== lastBoundsKey) {
    lastBoundsKey = boundsKey
    if (bounds.length === 1) map.setView(bounds[0]!, 15)
    else map.fitBounds(bounds, { padding: [42, 42], maxZoom: 15 })
  }
  if (props.selectedPlaceId) placeMarkers.get(props.selectedPlaceId)?.openPopup()
}

async function ensureMap() {
  await nextTick()
  if (!mapElement.value || !props.accommodation) return
  if (!map) {
    map = L.map(mapElement.value, { minZoom: 10, maxZoom: 18 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)
    layers = L.layerGroup().addTo(map)
  }
  map.invalidateSize()
  draw()
}

watch(() => [props.accommodation, props.places, props.selectedPlaceId, props.active], ensureMap, {
  deep: true,
})
onMounted(ensureMap)
onBeforeUnmount(() => map?.remove())
</script>

<template>
  <div ref="mapElement" class="chat-recommendation-map" aria-label="숙소 주변 추천 장소 지도"></div>
</template>
