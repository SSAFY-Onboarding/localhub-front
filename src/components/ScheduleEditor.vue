<script setup lang="ts">
import { computed, ref } from 'vue'
import PlacePickerModal from '@/components/PlacePickerModal.vue'
import type { Place } from '@/types/places'
import type { ScheduleItem } from '@/types/posts'

const props = defineProps<{ modelValue: ScheduleItem[]; disabled?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: ScheduleItem[]] }>()
const pickerDay = ref<number | null>(null)
const days = computed(() => Math.max(0, ...props.modelValue.map((item) => item.day)))
const total = computed(() => props.modelValue.length)

function dayItems(day: number) {
  return props.modelValue.filter((item) => item.day === day).sort((a, b) => a.order - b.order)
}
function normalize(items: ScheduleItem[]) {
  const result: ScheduleItem[] = []
  const dayNumbers = [...new Set(items.map((item) => item.day))].sort((a, b) => a - b)
  dayNumbers.forEach((oldDay, dayIndex) => {
    items
      .filter((item) => item.day === oldDay)
      .sort((a, b) => a.order - b.order)
      .forEach((item, index) => result.push({ ...item, day: dayIndex + 1, order: index + 1 }))
  })
  emit('update:modelValue', result)
}
function addDay() {
  if (days.value >= 7) return
  const day = days.value + 1
  // 빈 날짜는 ScheduleItem으로 표현할 수 없으므로 첫 장소 선택과 동시에 생성합니다.
  pickerDay.value = day
}
function addPlace(place: Place) {
  if (pickerDay.value === null || total.value >= 30) return
  const items = dayItems(pickerDay.value)
  if (items.length >= 10) return
  normalize([
    ...props.modelValue,
    {
      day: pickerDay.value,
      order: items.length + 1,
      place_id: place.id,
      name: place.name,
      type: place.category,
      lat: place.latitude,
      lng: place.longitude,
      time: null,
      memo: null,
    },
  ])
  pickerDay.value = null
}
function updateItem(target: ScheduleItem, patch: Partial<ScheduleItem>) {
  emit(
    'update:modelValue',
    props.modelValue.map((item) => (item === target ? { ...item, ...patch } : item)),
  )
}
function removeItem(target: ScheduleItem) {
  normalize(props.modelValue.filter((item) => item !== target))
}
function removeDay(day: number) {
  if (window.confirm(`${day}일차 일정 전체를 삭제할까요?`))
    normalize(props.modelValue.filter((item) => item.day !== day))
}
function move(target: ScheduleItem, offset: number) {
  const items = dayItems(target.day)
  const index = items.indexOf(target)
  const swap = items[index + offset]
  if (!swap) return
  emit(
    'update:modelValue',
    props.modelValue.map((item) => {
      if (item === target) return { ...item, order: swap.order }
      if (item === swap) return { ...item, order: target.order }
      return item
    }),
  )
}
</script>

<template>
  <section class="schedule-editor">
    <div class="schedule-editor-heading">
      <div>
        <h2>여행 일정</h2>
        <p>방문 순서와 시간, 메모를 함께 공유할 수 있어요. (선택)</p>
      </div>
      <span>{{ total }} / 30개 장소</span>
    </div>
    <div v-if="!days" class="schedule-empty">
      <p>아직 추가한 일정이 없습니다.</p>
      <button class="button secondary" type="button" :disabled="disabled" @click="addDay">
        1일차 장소 추가
      </button>
    </div>
    <div v-for="day in days" :key="day" class="schedule-day">
      <header>
        <h3>DAY {{ day }}</h3>
        <button type="button" :disabled="disabled" @click="removeDay(day)">일차 삭제</button>
      </header>
      <ol>
        <li
          v-for="(item, index) in dayItems(day)"
          :key="`${item.place_id}-${item.order}`"
          class="schedule-item"
        >
          <span class="schedule-order">{{ index + 1 }}</span>
          <div class="schedule-item-main">
            <div class="schedule-place-title">
              <strong>{{ item.name }}</strong
              ><span>{{ item.type }}</span>
            </div>
            <div class="schedule-item-fields">
              <label
                >시간<input
                  :value="item.time ?? ''"
                  type="time"
                  :disabled="disabled"
                  @input="
                    updateItem(item, { time: ($event.target as HTMLInputElement).value || null })
                  "
              /></label>
              <label
                >메모<input
                  :value="item.memo ?? ''"
                  maxlength="200"
                  placeholder="이 장소에서 할 일"
                  :disabled="disabled"
                  @input="
                    updateItem(item, { memo: ($event.target as HTMLInputElement).value || null })
                  "
              /></label>
            </div>
          </div>
          <div class="schedule-item-actions">
            <button
              type="button"
              aria-label="위로 이동"
              :disabled="disabled || index === 0"
              @click="move(item, -1)"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="아래로 이동"
              :disabled="disabled || index === dayItems(day).length - 1"
              @click="move(item, 1)"
            >
              ↓
            </button>
            <button
              type="button"
              aria-label="장소 삭제"
              :disabled="disabled"
              @click="removeItem(item)"
            >
              ×
            </button>
          </div>
        </li>
      </ol>
      <button
        class="schedule-add-place"
        type="button"
        :disabled="disabled || dayItems(day).length >= 10 || total >= 30"
        @click="pickerDay = day"
      >
        + 장소 추가
      </button>
    </div>
    <button
      v-if="days"
      class="button secondary schedule-add-day"
      type="button"
      :disabled="disabled || days >= 7 || total >= 30"
      @click="addDay"
    >
      + 다음 일차 추가
    </button>
    <p v-if="days >= 7 || total >= 30" class="schedule-limit">
      최대 7일, 전체 30개 장소까지 등록할 수 있습니다.
    </p>
    <PlacePickerModal
      v-if="pickerDay !== null"
      :busy="disabled"
      @close="pickerDay = null"
      @select="addPlace"
    />
  </section>
</template>
