<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import L, { type LayerGroup, type Map as LeafletMap, type Marker } from 'leaflet'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { MapCenter, RecommendedPlace } from '@/types/chatbot'
import type { Place } from '@/types/places'

const props = defineProps<{
  accommodation: Place | null
  center: MapCenter | null
  places: RecommendedPlace[]
  selectedPlaceId: string | null
}>()

const emit = defineEmits<{ select: [place: RecommendedPlace] }>()

const mapElement = ref<HTMLElement | null>(null)
let map: LeafletMap | null = null
let layers: LayerGroup | null = null
const placeMarkers = new Map<string, Marker>()

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function numberedIcon(text: string, hotel = false) {
  return L.divIcon({
    className: 'chat-map-marker-shell',
    html: `<span class="chat-map-marker${hotel ? ' hotel' : ''}">${escapeHtml(text)}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  })
}

function popupHtml(place: RecommendedPlace) {
  const image = place.image_url
    ? `<img class="chat-popup-image" src="${escapeHtml(place.image_url)}" alt="">`
    : ''

  const distance =
    place.distance != null
      ? `<p><b>기준점에서 ${escapeHtml(place.distance)}km</b></p>`
      : ''

  const address = place.address
    ? `<p>${escapeHtml(place.address)}</p>`
    : ''

  const description = place.description
    ? `<p>${escapeHtml(place.description)}</p>`
    : ''

  return `
    <article class="chat-place-popup">
      ${image}
      <div>
        <span>${escapeHtml(place.category)}</span>
        <h3>${escapeHtml(place.name)}</h3>
        ${distance}
        ${address}
        ${description}
      </div>
    </article>
  `
}

function focusSelectedPlace() {
  if (!map || !props.selectedPlaceId) return

  const place = props.places.find(
    (item) => String(item.id) === String(props.selectedPlaceId),
  )
  if (!place) return

  map.setView([place.latitude, place.longitude], 16, { animate: true })
  placeMarkers.get(String(place.id))?.openPopup()
}

async function renderMap() {
  await nextTick()
  if (!map || !layers) return

  layers.clearLayers()
  placeMarkers.clear()

  const points: L.LatLngExpression[] = []
  const accommodation = props.accommodation

  if (accommodation?.latitude != null && accommodation.longitude != null) {
    const hotelPoint: L.LatLngExpression = [
      accommodation.latitude,
      accommodation.longitude,
    ]
    points.push(hotelPoint)

    L.marker(hotelPoint, {
      icon: numberedIcon('H', true),
      title: accommodation.name,
    })
      .bindPopup(
        `<strong>${escapeHtml(accommodation.name)}</strong><br>선택한 기준 숙소`,
      )
      .addTo(layers)
  }

  props.places.forEach((place, index) => {
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
      return
    }

    const point: L.LatLngExpression = [place.latitude, place.longitude]
    points.push(point)

    const marker = L.marker(point, {
      icon: numberedIcon(String(index + 1)),
      title: place.name,
    })
      .bindPopup(popupHtml(place), { maxWidth: 310 })
      .on('click', () => emit('select', place))
      .addTo(layers!)

    placeMarkers.set(String(place.id), marker)

    if (accommodation?.latitude != null && accommodation.longitude != null) {
      L.polyline(
        [
          [accommodation.latitude, accommodation.longitude],
          point,
        ],
        { weight: 2, opacity: 0.5, dashArray: '7 7' },
      ).addTo(layers!)
    }
  })

  if (points.length > 1) {
    map.fitBounds(L.latLngBounds(points).pad(0.18))
  } else if (points.length === 1) {
    map.setView(points[0]!, 15)
  } else if (props.center) {
    map.setView([props.center.latitude, props.center.longitude], 14)
  } else {
    map.setView([37.5665, 126.978], 12)
  }

  setTimeout(() => {
    map?.invalidateSize()
    focusSelectedPlace()
  }, 100)
}

onMounted(() => {
  if (!mapElement.value) return

  map = L.map(mapElement.value, { zoomControl: true }).setView(
    [37.5665, 126.978],
    12,
  )

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)

  layers = L.layerGroup().addTo(map)
  void renderMap()
})

watch(
  () => [props.accommodation, props.center, props.places],
  () => void renderMap(),
  { deep: true },
)

watch(
  () => props.selectedPlaceId,
  () => focusSelectedPlace(),
)

onBeforeUnmount(() => {
  map?.remove()
  map = null
  layers = null
  placeMarkers.clear()
})
</script>

<template>
  <div ref="mapElement" class="chatbot-map"></div>
</template>

<style scoped>
.chatbot-map{width:100%;height:100%;min-height:560px;background:#e7edfa}
:global(.chat-map-marker-shell){background:transparent;border:0}
:global(.chat-map-marker){display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:linear-gradient(145deg,#526fe0,#20a4c1);color:#fff;border:3px solid #fff;box-shadow:0 7px 18px rgba(37,62,143,.38);font-weight:900}
:global(.chat-map-marker.hotel){background:linear-gradient(145deg,#233d9b,#655bd7)}
:global(.chat-place-popup){min-width:230px}
:global(.chat-popup-image){display:block;width:100%;height:120px;object-fit:cover;border-radius:10px;margin-bottom:10px}
:global(.chat-place-popup span){font-size:11px;color:#3659d9;font-weight:800}
:global(.chat-place-popup h3){margin:4px 0 8px;font-size:16px}
:global(.chat-place-popup p){margin:5px 0;line-height:1.45;color:#65728e;font-size:12px}
@media(max-width:820px){.chatbot-map{min-height:420px}}
</style>
