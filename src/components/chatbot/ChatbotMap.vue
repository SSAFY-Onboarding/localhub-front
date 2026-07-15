<script setup lang="ts">
import 'leaflet/dist/leaflet.css'
import L, { type Map as LeafletMap, type LayerGroup } from 'leaflet'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { RecommendedPlace } from '@/types/chatbot'
import type { Place } from '@/types/places'

const props = defineProps<{ accommodation: Place | null; places: RecommendedPlace[] }>()
const emit = defineEmits<{ select: [place: RecommendedPlace] }>()
const mapElement = ref<HTMLElement | null>(null)
let map: LeafletMap | null = null
let layers: LayerGroup | null = null

function numberedIcon(text: string, hotel = false) {
  return L.divIcon({
    className: 'chat-map-marker-shell',
    html: `<span class="chat-map-marker${hotel ? ' hotel' : ''}">${text}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

async function render() {
  await nextTick()
  if (!map || !layers) return
  layers.clearLayers()
  const points: L.LatLngExpression[] = []

  const accommodation = props.accommodation
  if (accommodation?.latitude != null && accommodation.longitude != null) {
    const hotelPoint: L.LatLngExpression = [accommodation.latitude, accommodation.longitude]
    points.push(hotelPoint)
    L.marker(hotelPoint, { icon: numberedIcon('H', true), title: accommodation.name })
      .bindPopup(`<strong>${accommodation.name}</strong><br>기준 숙소`)
      .addTo(layers)
  }

  props.places.forEach((place, index) => {
    if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) return
    const point: L.LatLngExpression = [place.latitude, place.longitude]
    points.push(point)
    const marker = L.marker(point, { icon: numberedIcon(String(index + 1)), title: place.name })
      .bindPopup(`<strong>${place.name}</strong><br>숙소에서 ${place.distance}km`)
      .on('click', () => emit('select', place))
      .addTo(layers!)

    if (accommodation?.latitude != null && accommodation.longitude != null) {
      L.polyline(
        [[accommodation.latitude, accommodation.longitude], point],
        { weight: 2, opacity: 0.55, dashArray: '7 7' },
      ).addTo(layers!)
    }
  })

  if (points.length > 1) map.fitBounds(L.latLngBounds(points).pad(0.18))
  else if (points.length === 1) map.setView(points[0]!, 15)
  setTimeout(() => map?.invalidateSize(), 100)
}

onMounted(() => {
  if (!mapElement.value) return
  map = L.map(mapElement.value, { zoomControl: true }).setView([37.5665, 126.978], 12)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map)
  layers = L.layerGroup().addTo(map)
  void render()
})
watch(() => [props.accommodation, props.places], render, { deep: true })
onBeforeUnmount(() => { map?.remove(); map = null; layers = null })
</script>

<template><div ref="mapElement" class="chatbot-map"></div></template>

<style scoped>
.chatbot-map{width:100%;height:100%;min-height:560px;background:#e9efec}
:global(.chat-map-marker-shell){background:transparent;border:0}
:global(.chat-map-marker){display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:#d66b45;color:#fff;border:3px solid #fff;box-shadow:0 5px 14px rgba(0,0,0,.25);font-weight:900}
:global(.chat-map-marker.hotel){background:#114b3b}
@media(max-width:820px){.chatbot-map{min-height:420px}}
</style>
