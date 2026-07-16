<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import AccommodationPickerModal from '@/components/chatbot/AccommodationPickerModal.vue'
import ChatbotMap from '@/components/chatbot/ChatbotMap.vue'
import PlaceThumbnail from '@/components/PlaceThumbnail.vue'
import { chatService } from '@/services/chatService'
import type { MapCenter, RecommendedPlace } from '@/types/chatbot'
import type { Place } from '@/types/places'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
}

const selectedAccommodation = ref<Place | null>(null)
const showAccommodationModal = ref(false)
const isAccommodationOpen = ref(true)
const inputMessage = ref('')
const hasStarted = ref(false)
const isTyping = ref(false)
const error = ref('')
const messageListRef = ref<HTMLElement | null>(null)
const recommendedPlaces = ref<RecommendedPlace[]>([])
const selectedPlaceId = ref<string | null>(null)
const searchCenter = ref<MapCenter | null>(null)

let nextMessageId = 2
let requestController: AbortController | null = null

const messages = ref<ChatMessage[]>([
  {
    id: 1,
    role: 'assistant',
    content:
      '안녕하세요! 숙소를 선택해 주변 장소를 찾거나, 숙소 없이 “서울역 근처 축제를 추천해줘”처럼 질문해보세요.',
  },
])

const quickQuestions = [
  '서울역 근처 축제를 추천해줘',
  '성수에서 전시와 쇼핑 장소를 추천해줘',
  '한강 주변 체험 장소를 알려줘',
]

const inputPlaceholder = computed(() =>
  selectedAccommodation.value
    ? '선택한 숙소 주변 또는 다른 지역에 대해 질문해보세요.'
    : '예: 서울역 근처 축제를 추천해줘.',
)

const mapTitle = computed(() =>
  selectedAccommodation.value ? '숙소 주변 추천 지도' : '지역 추천 지도',
)

const mapDescription = computed(() => {
  if (selectedAccommodation.value) {
    return `${selectedAccommodation.value.name} 기준 · 추천 장소 ${recommendedPlaces.value.length}곳`
  }
  return `질문에서 찾은 지역 기준 · 추천 장소 ${recommendedPlaces.value.length}곳`
})

function selectAccommodation(place: Place) {
  selectedAccommodation.value = place
  showAccommodationModal.value = false
  isAccommodationOpen.value = false
  recommendedPlaces.value = []
  selectedPlaceId.value = null
  searchCenter.value =
    place.latitude != null && place.longitude != null
      ? { latitude: place.latitude, longitude: place.longitude }
      : null
  error.value = ''
}

async function scrollToBottom() {
  await nextTick()
  if (messageListRef.value) {
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight
  }
}

async function sendMessage(message = inputMessage.value) {
  const trimmedMessage = message.trim()
  if (!trimmedMessage || isTyping.value) return

  hasStarted.value = true
  isAccommodationOpen.value = false
  messages.value.push({
    id: nextMessageId++,
    role: 'user',
    content: trimmedMessage,
  })

  inputMessage.value = ''
  isTyping.value = true
  error.value = ''
  await scrollToBottom()

  requestController?.abort()
  requestController = new AbortController()

  try {
    const history = messages.value
      .slice(0, -1)
      .filter((item) => item.id !== 1)
      .map(({ role, content }) => ({ role, content }))

    const response = await chatService.sendMessage(
      {
        message: trimmedMessage,
        accommodation_id: selectedAccommodation.value?.id ?? null,
        history,
      },
      requestController.signal,
    )

    messages.value.push({
      id: nextMessageId++,
      role: 'assistant',
      content: response.answer || '검색 결과를 확인해주세요.',
    })

    recommendedPlaces.value = Array.isArray(response.places) ? response.places : []
    searchCenter.value = response.center ?? null
    selectedPlaceId.value = null
  } catch (cause) {
    if (!(cause instanceof DOMException && cause.name === 'AbortError')) {
      error.value = cause instanceof Error ? cause.message : '챗봇 응답을 불러오지 못했습니다.'
    }
  } finally {
    isTyping.value = false
    await scrollToBottom()
  }
}

function selectRecommendedPlace(place: RecommendedPlace) {
  selectedPlaceId.value = String(place.id)
}

onBeforeUnmount(() => requestController?.abort())
</script>

<template>
  <section :class="['chatbot-page', { 'is-started': hasStarted }]">
    <div class="chatbot-shell">
      <section class="chat-panel">
        <div class="chat-heading">
          <span class="eyebrow">LOCAL AI GUIDE</span>
          <h1>AI 여행 추천</h1>
          <p>숙소 또는 질문 속 지역을 기준으로 필요한 여행 DB를 자동 검색합니다.</p>
        </div>

        <div class="accommodation-section">
          <button
            class="accommodation-toggle"
            type="button"
            :aria-expanded="isAccommodationOpen"
            aria-controls="accommodation-settings"
            @click="isAccommodationOpen = !isAccommodationOpen"
          >
            <span class="accommodation-toggle-icon" aria-hidden="true">⌂</span>
            <span class="accommodation-toggle-copy">
              <small>추천 기준 숙소</small>
              <strong>{{ selectedAccommodation?.name ?? '선택하지 않음' }}</strong>
            </span>
            <span class="accommodation-toggle-action">
              {{ isAccommodationOpen ? '접기' : '설정' }}
              <span aria-hidden="true">{{ isAccommodationOpen ? '⌃' : '⌄' }}</span>
            </span>
          </button>

          <div
            v-show="isAccommodationOpen"
            id="accommodation-settings"
            :class="['accommodation-card', { selected: selectedAccommodation }]"
          >
            <template v-if="selectedAccommodation">
              <PlaceThumbnail
                :src="selectedAccommodation.image_url"
                :name="selectedAccommodation.name"
                :category="selectedAccommodation.category"
                size="picker"
                eager
              />
              <div class="accommodation-copy">
                <span>선택 숙소</span>
                <strong>{{ selectedAccommodation.name }}</strong>
                <p>{{ selectedAccommodation.address ?? '주소 정보 없음' }}</p>
              </div>
              <button class="change-button" type="button" @click="showAccommodationModal = true">
                숙소 변경
              </button>
            </template>

            <template v-else>
              <div class="empty-accommodation-icon" aria-hidden="true">⌂</div>
              <div class="accommodation-copy">
                <span>숙소 선택은 선택 사항입니다</span>
                <strong>지역을 직접 질문해도 됩니다.</strong>
                <p>숙소를 선택하면 숙소 기준 거리 추천도 받을 수 있습니다.</p>
              </div>
              <button class="button primary" type="button" @click="showAccommodationModal = true">
                숙소 선택하기
              </button>
            </template>
          </div>
        </div>

        <div ref="messageListRef" class="message-list" aria-live="polite">
          <div v-for="message in messages" :key="message.id" :class="['message-row', message.role]">
            <div class="message-avatar" aria-hidden="true">
              {{ message.role === 'assistant' ? 'L' : '나' }}
            </div>
            <div class="message-bubble">{{ message.content }}</div>
          </div>

          <div v-if="isTyping" class="message-row assistant">
            <div class="message-avatar" aria-hidden="true">L</div>
            <div class="message-bubble typing"><i></i><i></i><i></i></div>
          </div>

          <div v-if="error" class="chat-error">
            <p>{{ error }}</p>
          </div>

          <div v-if="recommendedPlaces.length" class="recommendation-list">
            <p class="recommendation-title">추천 장소</p>
            <button
              v-for="(place, index) in recommendedPlaces"
              :key="place.id"
              :class="{ active: selectedPlaceId === String(place.id) }"
              type="button"
              @click="selectRecommendedPlace(place)"
            >
              <span class="number">{{ index + 1 }}</span>
              <span>
                <strong>{{ place.name }}</strong>
                <small>
                  {{ place.category }}
                  <template v-if="place.address"> · {{ place.address }}</template>
                </small>
              </span>
              <b v-if="place.distance != null">{{ place.distance }}km</b>
            </button>
          </div>
        </div>

        <div v-if="!hasStarted" class="quick-questions">
          <button
            v-for="question in quickQuestions"
            :key="question"
            type="button"
            @click="sendMessage(question)"
          >
            {{ question }}
          </button>
        </div>

        <form class="chat-input" @submit.prevent="sendMessage()">
          <input v-model="inputMessage" :disabled="isTyping" :placeholder="inputPlaceholder" />
          <button type="submit" :disabled="!inputMessage.trim() || isTyping">
            <span>전송</span><span aria-hidden="true">➜</span>
          </button>
        </form>
      </section>

      <section v-if="hasStarted" class="map-panel" aria-label="추천 장소 지도">
        <div class="map-toolbar">
          <div>
            <strong>{{ mapTitle }}</strong>
            <p>{{ mapDescription }}</p>
          </div>
          <span v-if="isTyping">추천 장소 불러오는 중</span>
        </div>

        <ChatbotMap
          :accommodation="selectedAccommodation"
          :center="searchCenter"
          :places="recommendedPlaces"
          :selected-place-id="selectedPlaceId"
          @select="selectRecommendedPlace"
        />

        <div v-if="!recommendedPlaces.length && !isTyping" class="map-empty">
          질문에 맞는 추천 장소가 지도에 표시됩니다.
        </div>
      </section>
    </div>

    <AccommodationPickerModal
      v-if="showAccommodationModal"
      @close="showAccommodationModal = false"
      @select="selectAccommodation"
    />
  </section>
</template>

<style scoped>
.chatbot-page {
  min-height: calc(100vh - 72px);
  padding: 44px 24px;
  background: linear-gradient(180deg, #f4f7f4 0%, #fff 75%);
}
.chatbot-page.is-started {
  height: calc(100vh - 72px);
  min-height: 0;
  overflow: hidden;
}
.chatbot-shell {
  width: min(920px, 100%);
  margin: 0 auto;
  transition: width 0.35s ease;
}
.is-started .chatbot-shell {
  width: min(1500px, 100%);
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(400px, 440px) minmax(0, 1fr);
  gap: 18px;
}
.chat-panel,
.map-panel {
  background: #fff;
  border: 1px solid #dfe7e2;
  border-radius: 22px;
  box-shadow: 0 18px 45px rgba(19, 66, 53, 0.09);
  overflow: hidden;
}
.is-started .chat-panel,
.is-started .map-panel {
  height: 100%;
  min-height: 0;
}
.chat-panel {
  display: flex;
  flex-direction: column;
  min-height: 680px;
  padding: 30px;
}
.is-started .chat-panel {
  min-height: 0;
  padding: 20px 22px;
}
.chat-heading {
  text-align: center;
  margin-bottom: 24px;
}
.is-started .chat-heading {
  text-align: left;
  margin-bottom: 12px;
}
.chat-heading .eyebrow {
  display: block;
  color: #2d725e;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.14em;
}
.chat-heading h1 {
  font-size: 36px;
  margin: 7px 0;
}
.chat-heading p {
  color: #6b7772;
}
.is-started .chat-heading .eyebrow,
.is-started .chat-heading p {
  display: none;
}
.is-started .chat-heading h1 {
  margin: 0;
  font-size: 24px;
}
.accommodation-section {
  min-width: 0;
}
.accommodation-toggle {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #dfe6e2;
  border-radius: 14px;
  background: #f8faf8;
  color: #193f34;
  text-align: left;
  cursor: pointer;
}
.accommodation-toggle:hover {
  border-color: #9eb8ad;
  background: #f3f7f5;
}
.accommodation-toggle:focus-visible {
  outline: 3px solid rgba(17, 75, 59, 0.16);
  outline-offset: 2px;
}
.accommodation-toggle-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #e7f0eb;
  color: #114b3b;
  font-size: 20px;
}
.accommodation-toggle-copy {
  min-width: 0;
}
.accommodation-toggle-copy small,
.accommodation-toggle-copy strong {
  display: block;
}
.accommodation-toggle-copy small {
  margin-bottom: 2px;
  color: #6f7d77;
  font-size: 10px;
  font-weight: 800;
}
.accommodation-toggle-copy strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}
.accommodation-toggle-action {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #145946;
  font-size: 12px;
  font-weight: 800;
}
.accommodation-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 15px;
  margin-top: 8px;
  padding: 16px;
  border: 1px solid #dfe6e2;
  border-radius: 16px;
  background: #f8faf8;
}
.is-started .accommodation-card {
  grid-template-columns: auto minmax(0, 1fr);
}
.is-started .accommodation-card .button,
.is-started .change-button {
  grid-column: 1/-1;
  width: 100%;
}
.empty-accommodation-icon {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border-radius: 14px;
  background: #e7f0eb;
  color: #114b3b;
  font-size: 29px;
}
.accommodation-copy {
  min-width: 0;
}
.accommodation-copy span {
  color: #2d725e;
  font-size: 11px;
  font-weight: 900;
}
.accommodation-copy strong {
  display: block;
  margin: 4px 0;
  font-size: 16px;
}
.accommodation-copy p {
  color: #74807b;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.change-button {
  border: 0;
  background: transparent;
  color: #114b3b;
  font-weight: 800;
  cursor: pointer;
}
.message-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-gutter: stable;
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 22px -4px 16px;
  padding: 0 8px 0 4px;
}
.is-started .message-list {
  margin-top: 14px;
}
.message-list::-webkit-scrollbar {
  width: 8px;
}
.message-list::-webkit-scrollbar-thumb {
  background: #cbd8d2;
  border-radius: 999px;
}
.message-list::-webkit-scrollbar-track {
  background: transparent;
}
.message-row {
  display: flex;
  align-items: flex-start;
  gap: 9px;
}
.message-row.user {
  flex-direction: row-reverse;
}
.message-avatar {
  display: grid;
  place-items: center;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #114b3b;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
}
.message-row.user .message-avatar {
  background: #d66b45;
}
.message-bubble {
  max-width: 83%;
  padding: 12px 14px;
  border-radius: 4px 15px 15px 15px;
  background: #eef4f1;
  line-height: 1.65;
  white-space: pre-wrap;
  font-size: 14px;
}
.message-row.user .message-bubble {
  border-radius: 15px 4px 15px 15px;
  background: #114b3b;
  color: #fff;
}
.typing {
  display: flex;
  gap: 5px;
  padding: 16px;
}
.typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #668078;
  animation: pulse 1s infinite;
}
.typing i:nth-child(2) {
  animation-delay: 0.15s;
}
.typing i:nth-child(3) {
  animation-delay: 0.3s;
}
@keyframes pulse {
  50% {
    opacity: 0.3;
    transform: translateY(-3px);
  }
}
.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.quick-questions button {
  border: 1px solid #cfdcd6;
  background: #fff;
  color: #245c4d;
  border-radius: 999px;
  padding: 9px 12px;
  cursor: pointer;
}
.chat-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}
.chat-input input {
  min-height: 52px;
  border: 1px solid #d7dfdb;
  border-radius: 12px;
  padding: 0 15px;
  font: inherit;
}
.chat-input input:focus {
  outline: 3px solid rgba(17, 75, 59, 0.1);
  border-color: #114b3b;
}
.chat-input button {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 0;
  border-radius: 12px;
  padding: 0 20px;
  background: #114b3b;
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}
.chat-input button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.recommendation-list {
  display: grid;
  gap: 8px;
  margin-top: 6px;
}
.recommendation-title {
  font-size: 12px;
  font-weight: 900;
  color: #5c6d66;
}
.recommendation-list button {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 1px solid #e0e7e3;
  background: #fff;
  border-radius: 12px;
  padding: 10px;
  text-align: left;
  cursor: pointer;
}
.recommendation-list button.active {
  border-color: #114b3b;
  background: #f0f6f3;
}
.recommendation-list .number {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #d66b45;
  color: #fff;
  font-weight: 900;
}
.recommendation-list strong,
.recommendation-list small {
  display: block;
}
.recommendation-list small {
  margin-top: 2px;
  color: #75817c;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.recommendation-list b {
  color: #114b3b;
  font-size: 13px;
}
.chat-error {
  padding: 12px;
  border-radius: 12px;
  background: #fff3f0;
  color: #a4412c;
  font-size: 13px;
}
.map-panel {
  position: relative;
  min-height: 680px;
}
.is-started .map-panel {
  min-height: 0;
}
.map-toolbar {
  height: 78px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 22px;
  border-bottom: 1px solid #e1e8e4;
}
.map-toolbar p {
  margin-top: 5px;
  color: #74807b;
  font-size: 12px;
}
.map-toolbar span {
  padding: 7px 10px;
  border-radius: 999px;
  background: #eef4f1;
  color: #2d725e;
  font-size: 11px;
  font-weight: 800;
}
.map-panel :deep(.chatbot-map) {
  height: calc(100% - 78px);
  min-height: 0;
}
.map-empty {
  position: absolute;
  left: 50%;
  top: 52%;
  transform: translate(-50%, -50%);
  z-index: 500;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #dce5e0;
  border-radius: 12px;
  padding: 14px 18px;
  color: #61716a;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}
@media (max-width: 1000px) {
  .is-started .chatbot-shell {
    grid-template-columns: minmax(380px, 44%) minmax(0, 56%);
  }
  .chat-panel {
    padding: 22px;
  }
}
@media (max-width: 820px) {
  .chatbot-page {
    padding: 18px 12px;
  }
  .chatbot-page.is-started {
    height: auto;
    min-height: calc(100vh - 72px);
    overflow: visible;
  }
  .is-started .chatbot-shell {
    height: auto;
    display: flex;
    flex-direction: column;
  }
  .chat-panel,
  .map-panel,
  .is-started .chat-panel,
  .is-started .map-panel {
    height: auto;
    min-height: auto;
  }
  .is-started .message-list {
    max-height: 52vh;
    min-height: 260px;
  }
  .map-panel {
    height: 520px;
  }
  .accommodation-card {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .accommodation-card .button,
  .change-button {
    grid-column: 1/-1;
    width: 100%;
  }
  .chat-heading h1 {
    font-size: 29px;
  }
}
</style>
