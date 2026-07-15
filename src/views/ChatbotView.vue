<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import AccommodationPickerModal from '@/components/chatbot/AccommodationPickerModal.vue'
import ChatRecommendationMap from '@/components/chatbot/ChatRecommendationMap.vue'
import PlaceThumbnail from '@/components/PlaceThumbnail.vue'
import { chatService } from '@/services/chatService'
import { ChatApiError, type ChatHistoryMessage, type ChatMessage } from '@/types/chat'
import type { Place } from '@/types/places'

type MobileView = 'chat' | 'map'

const welcomeMessage = (): ChatMessage => ({
  id: 1,
  role: 'assistant',
  content:
    '안녕하세요! 기준 숙소를 선택하면 실제 장소 데이터를 바탕으로 가까운 여행지를 추천해 드릴게요.',
})
const selectedAccommodation = ref<Place | null>(null)
const showAccommodationModal = ref(false)
const inputMessage = ref('')
const isTyping = ref(false)
const requestError = ref('')
const mobileView = ref<MobileView>('chat')
const selectedPlaceId = ref<string | null>(null)
const messageListRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const messages = ref<ChatMessage[]>([welcomeMessage()])
let nextMessageId = 2
let requestController: AbortController | null = null
let retryPayload: { message: string; history: ChatHistoryMessage[] } | null = null

const defaultQuestions = ['숙소 주변 관광지 추천', '가까운 문화시설 추천', '하루 여행 코스 추천']
const hasStarted = computed(() => messages.value.some((message) => message.role === 'user'))
const latestAssistant = computed(() =>
  [...messages.value].reverse().find((message) => message.role === 'assistant' && message.places),
)
const recommendedPlaces = computed(() => latestAssistant.value?.places ?? [])
const hasMap = computed(() => recommendedPlaces.value.length > 0)
const inputPlaceholder = computed(() =>
  selectedAccommodation.value ? '서울 여행에 대해 질문해 보세요.' : '숙소를 먼저 선택해 주세요.',
)

function historyPayload(): ChatHistoryMessage[] {
  return messages.value
    .filter((message) => message.id !== 1)
    .slice(-10)
    .map((message) => ({
      role: message.role,
      content: message.content,
      ...(message.role === 'assistant' && message.places?.length
        ? { place_ids: message.places.map((place) => place.id) }
        : {}),
    }))
}

async function scrollToBottom() {
  await nextTick()
  messageListRef.value?.scrollTo({ top: messageListRef.value.scrollHeight, behavior: 'smooth' })
}

function resetConversation() {
  requestController?.abort()
  messages.value = [welcomeMessage()]
  nextMessageId = 2
  inputMessage.value = ''
  isTyping.value = false
  requestError.value = ''
  retryPayload = null
  selectedPlaceId.value = null
  mobileView.value = 'chat'
}

async function selectAccommodation(place: Place) {
  if (
    selectedAccommodation.value?.id !== place.id &&
    hasStarted.value &&
    !window.confirm('숙소를 변경하면 현재 대화와 추천 결과가 초기화됩니다. 변경할까요?')
  )
    return
  if (selectedAccommodation.value?.id !== place.id) resetConversation()
  selectedAccommodation.value = place
  showAccommodationModal.value = false
  await nextTick()
  inputRef.value?.focus()
}

async function requestAnswer(message: string, history: ChatHistoryMessage[]) {
  if (!selectedAccommodation.value) return
  requestController?.abort()
  requestController = new AbortController()
  isTyping.value = true
  requestError.value = ''
  retryPayload = null
  await scrollToBottom()
  try {
    const response = await chatService.send(
      {
        accommodation_id: selectedAccommodation.value.id,
        message,
        history,
      },
      requestController.signal,
    )
    messages.value.push({
      id: nextMessageId++,
      role: 'assistant',
      content: response.answer,
      places: response.places,
      suggestedQuestions: response.suggested_questions,
    })
    selectedPlaceId.value = response.places[0]?.id ?? null
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') return
    requestError.value =
      cause instanceof ChatApiError ? cause.message : '답변을 불러오지 못했습니다.'
    retryPayload = { message, history }
  } finally {
    isTyping.value = false
    await scrollToBottom()
  }
}

async function sendMessage(message = inputMessage.value) {
  const trimmedMessage = message.trim()
  if (!selectedAccommodation.value || !trimmedMessage || isTyping.value) return
  const history = historyPayload()
  messages.value.push({ id: nextMessageId++, role: 'user', content: trimmedMessage })
  inputMessage.value = ''
  await requestAnswer(trimmedMessage, history)
}

async function retry() {
  if (!retryPayload || isTyping.value) return
  const payload = retryPayload
  await requestAnswer(payload.message, payload.history)
}

function selectRecommendedPlace(placeId: string, openMap = false) {
  selectedPlaceId.value = placeId
  if (openMap && window.matchMedia('(max-width: 760px)').matches) mobileView.value = 'map'
}

onBeforeUnmount(() => requestController?.abort())
</script>

<template>
  <section class="chatbot-page">
    <div :class="['chatbot-shell', { 'map-visible': hasMap }]">
      <section :class="['chat-panel', { 'mobile-hidden': mobileView === 'map' }]">
        <header class="chat-heading">
          <div>
            <span class="eyebrow">LOCAL AI GUIDE</span>
            <h1>AI 여행 추천</h1>
            <p>숙소를 기준으로 실제 서울 장소를 추천해 드립니다.</p>
          </div>
          <button
            v-if="hasStarted"
            class="new-chat-button"
            type="button"
            @click="resetConversation"
          >
            새 대화
          </button>
        </header>

        <div :class="['accommodation-card', { selected: selectedAccommodation }]">
          <template v-if="selectedAccommodation">
            <PlaceThumbnail
              :src="selectedAccommodation.image_url"
              :name="selectedAccommodation.name"
              :category="selectedAccommodation.category"
              size="picker"
              eager
            />
            <div class="accommodation-copy">
              <span>기준 숙소</span><strong>{{ selectedAccommodation.name }}</strong>
              <p>{{ selectedAccommodation.address ?? '주소 정보 없음' }}</p>
            </div>
            <button class="change-button" type="button" @click="showAccommodationModal = true">
              숙소 변경
            </button>
          </template>
          <template v-else>
            <div class="empty-accommodation-icon" aria-hidden="true">⌂</div>
            <div class="accommodation-copy">
              <span>기준 숙소</span><strong>아직 선택된 숙소가 없습니다.</strong>
              <p>추천을 받으려면 숙소를 먼저 선택해 주세요.</p>
            </div>
            <button class="button primary" type="button" @click="showAccommodationModal = true">
              숙소 선택하기
            </button>
          </template>
        </div>

        <div
          ref="messageListRef"
          class="message-list"
          role="log"
          aria-live="polite"
          aria-relevant="additions"
          aria-label="챗봇 대화"
        >
          <article
            v-for="message in messages"
            :key="message.id"
            :class="['message-row', message.role]"
          >
            <div class="message-avatar" aria-hidden="true">
              {{ message.role === 'assistant' ? 'L' : '나' }}
            </div>
            <div class="message-content">
              <div class="message-bubble">{{ message.content }}</div>
              <div v-if="message.places?.length" class="recommendation-list">
                <p>추천 장소 · 직선거리 기준</p>
                <button
                  v-for="(place, index) in message.places"
                  :key="place.id"
                  :class="{ active: selectedPlaceId === place.id }"
                  type="button"
                  @click="selectRecommendedPlace(place.id, true)"
                >
                  <span class="number">{{ index + 1 }}</span>
                  <PlaceThumbnail
                    :src="place.image_url"
                    :name="place.name"
                    :category="place.category"
                    size="sidebar"
                  />
                  <span class="place-copy"
                    ><strong>{{ place.name }}</strong
                    ><small>{{ place.category }} · {{ place.reason }}</small></span
                  >
                  <b>{{ place.distance_km.toFixed(2) }}km</b>
                </button>
              </div>
              <div v-if="message.suggestedQuestions?.length" class="suggested-questions">
                <button
                  v-for="question in message.suggestedQuestions"
                  :key="question"
                  type="button"
                  :disabled="isTyping"
                  @click="sendMessage(question)"
                >
                  {{ question }}
                </button>
              </div>
            </div>
          </article>
          <div v-if="isTyping" class="message-row assistant" role="status">
            <div class="message-avatar" aria-hidden="true">L</div>
            <div class="message-bubble typing" aria-label="답변을 작성하고 있습니다">
              <i></i><i></i><i></i><span class="sr-only">답변을 작성하고 있습니다.</span>
            </div>
          </div>
          <div v-if="requestError" class="chat-error" role="alert">
            <p>{{ requestError }}</p>
            <button type="button" @click="retry">다시 시도</button>
          </div>
        </div>

        <div v-if="selectedAccommodation && !hasStarted" class="quick-questions">
          <button
            v-for="question in defaultQuestions"
            :key="question"
            type="button"
            @click="sendMessage(question)"
          >
            {{ question }}
          </button>
        </div>
        <form class="chat-input" @submit.prevent="sendMessage()">
          <label class="sr-only" for="chat-message">여행 질문</label>
          <input
            id="chat-message"
            ref="inputRef"
            v-model="inputMessage"
            maxlength="500"
            autocomplete="off"
            :disabled="!selectedAccommodation || isTyping"
            :placeholder="inputPlaceholder"
          />
          <button
            type="submit"
            :disabled="!selectedAccommodation || !inputMessage.trim() || isTyping"
          >
            <span>전송</span><span aria-hidden="true">➜</span>
          </button>
        </form>
      </section>

      <section v-if="hasMap" :class="['map-preview', { 'mobile-hidden': mobileView === 'chat' }]">
        <header class="map-toolbar">
          <div>
            <strong>숙소 주변 추천 지도</strong>
            <p>{{ selectedAccommodation?.name }} 기준 · 직선거리</p>
          </div>
          <span>{{ recommendedPlaces.length }}곳</span>
        </header>
        <ChatRecommendationMap
          :accommodation="selectedAccommodation"
          :places="recommendedPlaces"
          :selected-place-id="selectedPlaceId"
          :active="mobileView === 'map'"
          @select="selectRecommendedPlace($event)"
        />
      </section>

      <nav v-if="hasMap" class="chat-mobile-tabs" aria-label="챗봇 결과 보기">
        <button
          :class="{ active: mobileView === 'chat' }"
          type="button"
          @click="mobileView = 'chat'"
        >
          대화
        </button>
        <button :class="{ active: mobileView === 'map' }" type="button" @click="mobileView = 'map'">
          지도
        </button>
      </nav>
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
  min-height: calc(100dvh - 76px);
  padding: 26px 0 38px;
  background:
    radial-gradient(circle at 10% 10%, rgba(142, 184, 163, 0.18), transparent 27%),
    linear-gradient(135deg, #fbfaf5 0%, #f2f6f2 100%);
}
.chatbot-shell {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 720px);
  justify-content: center;
  width: min(1280px, calc(100% - 40px));
  margin: 0 auto;
}
.chatbot-shell.map-visible {
  grid-template-columns: minmax(360px, 0.9fr) minmax(0, 1.45fr);
  gap: 18px;
}
.chat-panel,
.map-preview {
  height: min(720px, calc(100dvh - 140px));
  min-height: 600px;
  overflow: hidden;
  border: 1px solid rgba(17, 75, 59, 0.12);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 24px 60px rgba(20, 57, 47, 0.1);
}
.chat-panel {
  display: flex;
  flex-direction: column;
  padding: 26px;
}
.chat-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}
.chat-heading h1 {
  margin: 8px 0 5px;
  font-size: 30px;
  letter-spacing: -1.5px;
}
.chat-heading p {
  color: #68746f;
  font-size: 13px;
}
.new-chat-button,
.change-button {
  flex: 0 0 auto;
  border: 0;
  background: transparent;
  color: var(--green);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}
.new-chat-button {
  padding: 8px;
  border: 1px solid #d8e1dc;
  border-radius: 8px;
}
.accommodation-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 14px;
  border: 1px dashed #aebdb6;
  border-radius: 15px;
  background: #f8faf8;
}
.accommodation-card.selected {
  border-style: solid;
  background: #f3f8f5;
}
.empty-accommodation-icon {
  display: grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border-radius: 13px;
  background: #dfece5;
  color: var(--green);
  font-size: 24px;
}
.accommodation-copy {
  min-width: 0;
}
.accommodation-copy span {
  display: block;
  margin-bottom: 3px;
  color: var(--green);
  font-size: 11px;
  font-weight: 800;
}
.accommodation-copy strong {
  display: block;
  font-size: 14px;
}
.accommodation-copy p {
  overflow: hidden;
  margin-top: 3px;
  color: #71807a;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.message-list {
  flex: 1;
  min-height: 0;
  margin: 16px -5px 0;
  padding: 0 5px 12px;
  overflow-y: auto;
}
.message-row {
  display: flex;
  align-items: flex-end;
  gap: 9px;
  margin-bottom: 14px;
}
.message-row.user {
  flex-direction: row-reverse;
}
.message-avatar {
  display: grid;
  flex: 0 0 31px;
  place-items: center;
  width: 31px;
  height: 31px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}
.message-row.user .message-avatar {
  background: #d7ded9;
  color: #4b5752;
}
.message-content {
  min-width: 0;
  max-width: 88%;
}
.message-bubble {
  padding: 11px 13px;
  border-radius: 16px 16px 16px 4px;
  background: #eef4f0;
  color: #34413c;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-line;
}
.message-row.user .message-bubble {
  border-radius: 16px 16px 4px 16px;
  background: var(--green);
  color: #fff;
}
.typing {
  display: flex;
  gap: 4px;
  min-width: 50px;
}
.typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #819089;
  animation: blink 1s infinite alternate;
}
.typing i:nth-child(2) {
  animation-delay: 0.2s;
}
.typing i:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes blink {
  to {
    opacity: 0.25;
    transform: translateY(-3px);
  }
}
.recommendation-list {
  margin-top: 8px;
  padding: 11px;
  border: 1px solid #e0e7e3;
  border-radius: 13px;
  background: #fff;
}
.recommendation-list > p {
  margin-bottom: 5px;
  color: #66736d;
  font-size: 10px;
  font-weight: 800;
}
.recommendation-list button {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 5px;
  border: 0;
  border-top: 1px solid #eef1ef;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.recommendation-list button:first-of-type {
  border-top: 0;
}
.recommendation-list button.active {
  background: #eef6f1;
}
.number {
  display: grid;
  place-items: center;
  width: 23px;
  height: 23px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
}
.place-copy {
  min-width: 0;
}
.place-copy strong,
.place-copy small {
  display: block;
}
.place-copy strong {
  font-size: 12px;
}
.place-copy small {
  overflow: hidden;
  margin-top: 2px;
  color: #7a8781;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recommendation-list b {
  color: var(--green);
  font-size: 11px;
}
.suggested-questions,
.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 8px;
}
.quick-questions {
  margin-bottom: 11px;
}
.suggested-questions button,
.quick-questions button {
  padding: 7px 10px;
  border: 1px solid #d5dfda;
  border-radius: 999px;
  background: #fff;
  color: #47544f;
  font-size: 11px;
  cursor: pointer;
}
.chat-error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 8px 0 8px 40px;
  padding: 11px;
  border-radius: 10px;
  background: #fff0ed;
  color: var(--danger);
  font-size: 12px;
}
.chat-error button {
  border: 0;
  background: transparent;
  color: inherit;
  font-weight: 800;
  cursor: pointer;
}
.chat-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 9px;
  padding-top: 14px;
  border-top: 1px solid #e6ebe8;
}
.chat-input input {
  min-height: 48px;
  padding: 0 15px;
  border: 1px solid #d8dfdb;
  border-radius: 12px;
  outline: 0;
  font: inherit;
}
.chat-input input:focus {
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(17, 75, 59, 0.08);
}
.chat-input input:disabled {
  background: #f1f3f1;
}
.chat-input button {
  min-width: 82px;
  border: 0;
  border-radius: 12px;
  background: var(--green);
  color: #fff;
  font-weight: 800;
  cursor: pointer;
}
.chat-input button:disabled {
  background: #b7c1bc;
  cursor: not-allowed;
}
.map-preview {
  display: flex;
  flex-direction: column;
}
.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 21px;
  border-bottom: 1px solid #e5eae7;
}
.map-toolbar strong {
  display: block;
  font-size: 16px;
}
.map-toolbar p {
  margin-top: 3px;
  color: #78847f;
  font-size: 11px;
}
.map-toolbar > span {
  padding: 6px 9px;
  border-radius: 999px;
  background: #eef4f0;
  color: var(--green);
  font-size: 11px;
  font-weight: 800;
}
:deep(.chat-recommendation-map) {
  flex: 1;
  min-height: 0;
}
.chat-mobile-tabs {
  display: none;
}
:deep(.chat-map-marker-shell) {
  background: transparent;
  border: 0;
}
:deep(.chat-map-marker) {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 4px solid #fff;
  border-radius: 50% 50% 50% 5px;
  transform: rotate(-45deg);
  background: var(--green);
  color: #fff;
  box-shadow: 0 6px 16px rgba(23, 61, 50, 0.28);
  font-size: 11px;
  font-weight: 800;
}
:deep(.chat-map-marker.hotel) {
  background: #d9894e;
}
:deep(.chat-map-marker.active) {
  width: 42px;
  height: 42px;
  background: #b6422f;
}
:deep(.chat-map-popup img) {
  display: block;
  width: 100%;
  height: 105px;
  margin-bottom: 9px;
  border-radius: 8px;
  object-fit: cover;
}
:deep(.chat-map-popup span),
:deep(.chat-map-popup strong),
:deep(.chat-map-popup p) {
  display: block;
}
:deep(.chat-map-popup span) {
  color: var(--green);
  font-size: 10px;
  font-weight: 800;
}
:deep(.chat-map-popup strong) {
  margin: 3px 0 5px;
  font-size: 15px;
}
:deep(.chat-map-popup p) {
  color: #66736d;
  font-size: 11px;
  line-height: 1.5;
}
@media (max-width: 980px) {
  .chatbot-shell.map-visible {
    grid-template-columns: minmax(340px, 0.85fr) minmax(0, 1.15fr);
  }
  .chat-panel,
  .map-preview {
    height: min(700px, calc(100dvh - 130px));
  }
}
@media (max-width: 760px) {
  .chatbot-page {
    min-height: calc(100dvh - 76px);
    padding: 10px 0 76px;
  }
  .chatbot-shell,
  .chatbot-shell.map-visible {
    display: block;
    width: calc(100% - 16px);
  }
  .chat-panel,
  .map-preview {
    height: calc(100dvh - 104px);
    min-height: 540px;
    border-radius: 16px;
  }
  .chat-panel {
    padding: 18px 14px;
  }
  .mobile-hidden {
    display: none;
  }
  .chat-mobile-tabs {
    position: fixed;
    z-index: 15;
    right: 16px;
    bottom: 16px;
    left: 16px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 4px;
    border: 1px solid #d5dfda;
    border-radius: 14px;
    background: #fff;
    box-shadow: 0 10px 30px rgba(20, 57, 47, 0.2);
  }
  .chat-mobile-tabs button {
    min-height: 44px;
    border: 0;
    border-radius: 10px;
    background: transparent;
    font-weight: 800;
  }
  .chat-mobile-tabs button.active {
    background: var(--green);
    color: #fff;
  }
  .chat-heading h1 {
    font-size: 25px;
  }
  .accommodation-card {
    grid-template-columns: auto minmax(0, 1fr);
  }
  .accommodation-card .button,
  .change-button {
    grid-column: 1/-1;
    width: 100%;
    min-height: 38px;
  }
  .message-content {
    max-width: 86%;
  }
  .recommendation-list {
    padding: 8px;
  }
  .recommendation-list button {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .recommendation-list :deep(.place-thumbnail) {
    display: none;
  }
  .chat-input button {
    min-width: 60px;
  }
  .chat-input button span:first-child {
    display: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  .typing i {
    animation: none;
  }
}
</style>
