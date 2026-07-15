<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import AccommodationPickerModal from '@/components/chatbot/AccommodationPickerModal.vue'
import PlaceThumbnail from '@/components/PlaceThumbnail.vue'
import type { Place } from '@/types/places'

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
}

interface MockRecommendedPlace {
  id: string
  name: string
  category: string
  distance: number
  top: string
  left: string
}

const selectedAccommodation = ref<Place | null>(null)
const showAccommodationModal = ref(false)
const inputMessage = ref('')
const hasStarted = ref(false)
const isTyping = ref(false)
const messageListRef = ref<HTMLElement | null>(null)
let nextMessageId = 2

const messages = ref<ChatMessage[]>([
  {
    id: 1,
    role: 'assistant',
    content: '안녕하세요! 기준 숙소를 선택하면 주변 관광지와 여행 코스를 추천해드릴게요.',
  },
])

const quickQuestions = ['숙소 주변 관광지 추천', '하루 여행 코스 추천', '가까운 명소 알려줘']

const recommendedPlaces: MockRecommendedPlace[] = [
  { id: '1', name: '신사동 가로수길', category: '관광지', distance: 0.24, top: '35%', left: '34%' },
  { id: '2', name: '엘크레', category: '문화시설', distance: 0.29, top: '53%', left: '63%' },
  { id: '3', name: '유엠갤러리', category: '문화시설', distance: 0.35, top: '25%', left: '69%' },
]

const inputPlaceholder = computed(() =>
  selectedAccommodation.value ? '여행에 대해 질문해보세요.' : '숙소를 먼저 선택해주세요.',
)

function selectAccommodation(place: Place) {
  selectedAccommodation.value = place
  showAccommodationModal.value = false
}

async function scrollToBottom() {
  await nextTick()
  if (messageListRef.value) messageListRef.value.scrollTop = messageListRef.value.scrollHeight
}

async function sendMessage(message = inputMessage.value) {
  const trimmedMessage = message.trim()
  if (!selectedAccommodation.value || !trimmedMessage || isTyping.value) return

  hasStarted.value = true
  messages.value.push({ id: nextMessageId++, role: 'user', content: trimmedMessage })
  inputMessage.value = ''
  isTyping.value = true
  await scrollToBottom()

  window.setTimeout(async () => {
    messages.value.push({
      id: nextMessageId++,
      role: 'assistant',
      content: `${selectedAccommodation.value?.name}을 기준으로 가까운 추천 장소를 지도에 표시했어요. 현재는 화면 확인용 예시 응답이며, 다음 단계에서 실제 챗봇 API와 연결할 수 있습니다.`,
    })
    isTyping.value = false
    await scrollToBottom()
  }, 650)
}
</script>

<template>
  <section :class="['chatbot-page', { 'is-started': hasStarted }]">
    <div class="chatbot-shell">
      <section class="chat-panel">
        <div class="chat-heading">
          <span class="eyebrow">LOCAL AI GUIDE</span>
          <h1>AI 여행 추천</h1>
          <p>숙소를 기준으로 가까운 여행지를 한눈에 확인해보세요.</p>
        </div>

        <div :class="['accommodation-card', { selected: selectedAccommodation }]">
          <template v-if="selectedAccommodation">
            <PlaceThumbnail
              :src="selectedAccommodation.image_url"
              :name="selectedAccommodation.name"
              :category="selectedAccommodation.category"
              size="picker"
            />
            <div class="accommodation-copy">
              <span>기준 숙소</span>
              <strong>{{ selectedAccommodation.name }}</strong>
              <p>{{ selectedAccommodation.address }}</p>
            </div>
            <button class="change-button" type="button" @click="showAccommodationModal = true">
              숙소 변경
            </button>
          </template>
          <template v-else>
            <div class="empty-accommodation-icon" aria-hidden="true">⌂</div>
            <div class="accommodation-copy">
              <span>기준 숙소</span>
              <strong>아직 선택된 숙소가 없습니다.</strong>
              <p>여행 추천을 받으려면 숙소를 먼저 선택해주세요.</p>
            </div>
            <button class="button primary" type="button" @click="showAccommodationModal = true">
              숙소 선택하기
            </button>
          </template>
        </div>

        <div ref="messageListRef" class="message-list" aria-live="polite">
          <div
            v-for="message in messages"
            :key="message.id"
            :class="['message-row', message.role]"
          >
            <div class="message-avatar" aria-hidden="true">{{ message.role === 'assistant' ? 'L' : '나' }}</div>
            <div class="message-bubble">{{ message.content }}</div>
          </div>
          <div v-if="isTyping" class="message-row assistant">
            <div class="message-avatar" aria-hidden="true">L</div>
            <div class="message-bubble typing"><i></i><i></i><i></i></div>
          </div>

          <div v-if="hasStarted" class="recommendation-list">
            <p class="recommendation-title">추천 장소</p>
            <button v-for="(place, index) in recommendedPlaces" :key="place.id" type="button">
              <span class="number">{{ index + 1 }}</span>
              <span>
                <strong>{{ place.name }}</strong>
                <small>{{ place.category }}</small>
              </span>
              <b>{{ place.distance }}km</b>
            </button>
          </div>
        </div>

        <div v-if="selectedAccommodation && !hasStarted" class="quick-questions">
          <button v-for="question in quickQuestions" :key="question" type="button" @click="sendMessage(question)">
            {{ question }}
          </button>
        </div>

        <form class="chat-input" @submit.prevent="sendMessage()">
          <input
            v-model="inputMessage"
            :disabled="!selectedAccommodation || isTyping"
            :placeholder="inputPlaceholder"
          />
          <button type="submit" :disabled="!selectedAccommodation || !inputMessage.trim() || isTyping">
            <span>전송</span>
            <span aria-hidden="true">➜</span>
          </button>
        </form>
      </section>

      <section v-if="hasStarted" class="map-preview" aria-label="지도 미리보기">
        <div class="map-toolbar">
          <div>
            <strong>숙소 주변 추천 지도</strong>
            <p>{{ selectedAccommodation?.name }} 기준</p>
          </div>
          <span>UI 미리보기</span>
        </div>

        <div class="mock-map">
          <div class="map-road road-one"></div>
          <div class="map-road road-two"></div>
          <div class="map-road road-three"></div>
          <div class="map-river"></div>
          <div class="map-label label-one">강남구</div>
          <div class="map-label label-two">신사동</div>

          <div class="hotel-marker">
            <span>H</span>
            <p>{{ selectedAccommodation?.name }}</p>
          </div>

          <div
            v-for="(place, index) in recommendedPlaces"
            :key="place.id"
            class="place-marker"
            :style="{ top: place.top, left: place.left }"
          >
            <span>{{ index + 1 }}</span>
            <div>
              <strong>{{ place.name }}</strong>
              <small>숙소에서 {{ place.distance }}km</small>
            </div>
          </div>

          <div class="map-summary">
            <span>추천 장소 {{ recommendedPlaces.length }}곳</span>
            <strong>가장 가까운 장소 {{ recommendedPlaces[0]?.distance ?? 0 }}km</strong>
          </div>
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
  min-height: calc(100vh - 76px);
  padding: 42px 0 56px;
  background:
    radial-gradient(circle at 10% 10%, rgba(142, 184, 163, 0.18), transparent 27%),
    linear-gradient(135deg, #fbfaf5 0%, #f2f6f2 100%);
}
.chatbot-shell {
  width: min(1280px, calc(100% - 40px));
  margin: 0 auto;
  display: grid;
  grid-template-columns: minmax(0, 720px);
  justify-content: center;
  transition: grid-template-columns 0.35s ease;
}
.is-started .chatbot-shell {
  grid-template-columns: minmax(340px, 0.9fr) minmax(0, 1.9fr);
  gap: 18px;
}
.chat-panel,
.map-preview {
  min-height: 690px;
  border: 1px solid rgba(17, 75, 59, 0.12);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 24px 60px rgba(20, 57, 47, 0.1);
  overflow: hidden;
}
.chat-panel {
  display: flex;
  flex-direction: column;
  padding: 30px;
}
.chat-heading {
  text-align: center;
  margin-bottom: 23px;
}
.is-started .chat-heading {
  text-align: left;
}
.chat-heading .eyebrow {
  justify-content: center;
}
.is-started .chat-heading .eyebrow {
  justify-content: flex-start;
}
.chat-heading h1 {
  margin: 9px 0 7px;
  font-size: clamp(28px, 4vw, 40px);
  letter-spacing: -1.8px;
}
.is-started .chat-heading h1 {
  font-size: 28px;
}
.chat-heading p {
  color: #68746f;
  font-size: 14px;
}
.accommodation-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 16px;
  border: 1px dashed #aebdb6;
  border-radius: 16px;
  background: #f8faf8;
}
.accommodation-card.selected {
  border-style: solid;
  background: #f3f8f5;
}
.empty-accommodation-icon {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 14px;
  background: #dfece5;
  color: var(--green);
  font-size: 25px;
}
.accommodation-copy {
  min-width: 0;
}
.accommodation-copy span {
  display: block;
  color: var(--green);
  font-size: 11px;
  font-weight: 800;
  margin-bottom: 4px;
}
.accommodation-copy strong {
  display: block;
  font-size: 15px;
}
.accommodation-copy p {
  margin-top: 4px;
  color: #71807a;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.change-button {
  border: 0;
  background: transparent;
  color: var(--green);
  font-weight: 800;
  font-size: 12px;
  cursor: pointer;
}
.message-list {
  flex: 1;
  min-height: 210px;
  margin: 20px -5px 0;
  padding: 0 5px 16px;
  overflow-y: auto;
}
.message-row {
  display: flex;
  gap: 9px;
  align-items: flex-end;
  margin-bottom: 15px;
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
.message-bubble {
  max-width: 82%;
  padding: 12px 14px;
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
.typing i:nth-child(2) { animation-delay: 0.2s; }
.typing i:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { to { opacity: 0.25; transform: translateY(-3px); } }
.quick-questions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 13px;
}
.quick-questions button {
  padding: 9px 12px;
  border: 1px solid #d5dfda;
  border-radius: 999px;
  background: #fff;
  color: #47544f;
  font-size: 12px;
  cursor: pointer;
}
.quick-questions button:hover {
  border-color: var(--green);
  color: var(--green);
}
.chat-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 9px;
  padding-top: 16px;
  border-top: 1px solid #e6ebe8;
}
.chat-input input {
  min-height: 50px;
  padding: 0 16px;
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
  min-width: 92px;
  border: 0;
  border-radius: 12px;
  background: var(--green);
  color: white;
  font-weight: 800;
  cursor: pointer;
}
.chat-input button:disabled {
  background: #b7c1bc;
  cursor: not-allowed;
}
.recommendation-list {
  margin: 18px 0 5px 40px;
  padding: 14px;
  border: 1px solid #e0e7e3;
  border-radius: 14px;
  background: #fff;
}
.recommendation-title {
  margin-bottom: 9px;
  color: #5d6b65;
  font-size: 11px;
  font-weight: 800;
}
.recommendation-list button {
  width: 100%;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 9px 0;
  border: 0;
  border-top: 1px solid #eef1ef;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.recommendation-list button:first-of-type { border-top: 0; }
.recommendation-list .number {
  display: grid;
  place-items: center;
  width: 25px;
  height: 25px;
  border-radius: 50%;
  background: var(--green);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}
.recommendation-list strong,
.recommendation-list small {
  display: block;
}
.recommendation-list strong { font-size: 13px; }
.recommendation-list small { margin-top: 2px; color: #82908a; font-size: 10px; }
.recommendation-list b { color: var(--green); font-size: 12px; }
.map-preview {
  display: flex;
  flex-direction: column;
}
.map-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5eae7;
}
.map-toolbar strong { display: block; font-size: 17px; }
.map-toolbar p { margin-top: 4px; color: #78847f; font-size: 12px; }
.map-toolbar > span {
  padding: 6px 9px;
  border-radius: 999px;
  background: #eef4f0;
  color: var(--green);
  font-size: 11px;
  font-weight: 800;
}
.mock-map {
  position: relative;
  flex: 1;
  min-height: 620px;
  overflow: hidden;
  background:
    linear-gradient(rgba(127, 163, 144, 0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(127, 163, 144, 0.08) 1px, transparent 1px),
    #eaf0e9;
  background-size: 42px 42px;
}
.map-road {
  position: absolute;
  height: 22px;
  background: #fffdf5;
  border: 1px solid #d9d8cd;
  transform-origin: center;
  box-shadow: 0 0 0 5px rgba(255,255,255,0.5);
}
.road-one { width: 115%; top: 43%; left: -7%; transform: rotate(-10deg); }
.road-two { width: 95%; top: 62%; left: 10%; transform: rotate(20deg); }
.road-three { width: 85%; top: 24%; left: 8%; transform: rotate(74deg); }
.map-river {
  position: absolute;
  width: 120%;
  height: 90px;
  left: -10%;
  bottom: 9%;
  transform: rotate(-4deg);
  background: #cbdfe4;
  border: 1px solid #b6d0d7;
}
.map-label {
  position: absolute;
  color: rgba(49, 83, 70, 0.36);
  font-weight: 800;
  letter-spacing: 4px;
}
.label-one { top: 12%; left: 12%; font-size: 26px; }
.label-two { bottom: 24%; right: 16%; font-size: 18px; }
.hotel-marker,
.place-marker {
  position: absolute;
  z-index: 3;
}
.hotel-marker {
  top: 44%;
  left: 47%;
  transform: translate(-50%, -50%);
  text-align: center;
}
.hotel-marker > span,
.place-marker > span {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 4px solid #fff;
  border-radius: 50% 50% 50% 5px;
  transform: rotate(-45deg);
  background: #d9894e;
  color: #fff;
  box-shadow: 0 7px 18px rgba(40, 72, 61, 0.25);
  font-weight: 800;
}
.hotel-marker > span { margin: 0 auto; }
.hotel-marker > span::first-letter,
.place-marker > span { line-height: 1; }
.hotel-marker p {
  margin-top: 10px;
  padding: 6px 9px;
  border-radius: 7px;
  background: rgba(255,255,255,0.94);
  box-shadow: 0 4px 12px rgba(44,72,63,0.14);
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
}
.place-marker {
  display: flex;
  align-items: center;
  gap: 8px;
}
.place-marker > span {
  width: 34px;
  height: 34px;
  background: var(--green);
}
.place-marker > div {
  padding: 7px 9px;
  border-radius: 8px;
  background: rgba(255,255,255,0.95);
  box-shadow: 0 5px 15px rgba(44,72,63,0.14);
  white-space: nowrap;
}
.place-marker strong,
.place-marker small { display: block; }
.place-marker strong { font-size: 11px; }
.place-marker small { margin-top: 2px; color: #75827c; font-size: 9px; }
.map-summary {
  position: absolute;
  right: 22px;
  bottom: 22px;
  display: grid;
  gap: 5px;
  padding: 14px 16px;
  border-radius: 13px;
  background: rgba(16, 47, 40, 0.92);
  color: #fff;
  box-shadow: 0 12px 26px rgba(16,47,40,0.22);
}
.map-summary span { color: #c6d7d0; font-size: 11px; }
.map-summary strong { font-size: 13px; }
@media (max-width: 980px) {
  .is-started .chatbot-shell {
    grid-template-columns: 1fr;
  }
  .chat-panel,
  .map-preview { min-height: auto; }
  .mock-map { min-height: 520px; }
}
@media (max-width: 640px) {
  .chatbot-page { padding: 18px 0 30px; }
  .chatbot-shell { width: min(100% - 20px, 1280px); }
  .chat-panel { padding: 20px 16px; border-radius: 16px; }
  .accommodation-card { grid-template-columns: auto minmax(0,1fr); }
  .accommodation-card .button,
  .change-button { grid-column: 1 / -1; width: 100%; min-height: 40px; }
  .chat-input button { min-width: 68px; }
  .chat-input button span:first-child { display: none; }
  .recommendation-list { margin-left: 0; }
  .map-preview { border-radius: 16px; }
  .place-marker > div { display: none; }
}
</style>
