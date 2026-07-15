<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PlaceThumbnail from '@/components/PlaceThumbnail.vue'
import type { ScheduleItem } from '@/types/posts'

const props = defineProps<{ items: ScheduleItem[] }>()
const grouped = computed(() => {
  const result = new Map<number, ScheduleItem[]>()
  props.items.forEach((item) => {
    const list = result.get(item.day) ?? []
    list.push(item)
    result.set(item.day, list)
  })
  return [...result.entries()]
    .sort(([a], [b]) => a - b)
    .map(([day, items]) => ({ day, items: items.sort((a, b) => a.order - b.order) }))
})
</script>

<template>
  <section v-if="items.length" class="schedule-timeline">
    <div class="timeline-heading">
      <span class="eyebrow dark">TRAVEL COURSE</span>
      <h2>여행 일정</h2>
    </div>
    <div v-for="group in grouped" :key="group.day" class="timeline-day">
      <h3>DAY {{ group.day }}</h3>
      <ol>
        <li v-for="item in group.items" :key="`${item.place_id}-${item.order}`">
          <span class="timeline-dot">{{ item.order }}</span>
          <PlaceThumbnail
            :src="item.image_url"
            :name="item.name"
            :category="item.type"
            size="timeline"
          />
          <div>
            <div class="timeline-place">
              <strong>{{ item.name }}</strong
              ><span>{{ item.type }}</span
              ><time v-if="item.time">{{ item.time }}</time>
            </div>
            <p v-if="item.memo">{{ item.memo }}</p>
            <RouterLink
              v-if="item.lat !== null && item.lng !== null"
              class="timeline-map-link"
              :to="{ name: 'map', query: { place: item.place_id } }"
              >지도에서 보기 →</RouterLink
            >
          </div>
        </li>
      </ol>
    </div>
  </section>
</template>
