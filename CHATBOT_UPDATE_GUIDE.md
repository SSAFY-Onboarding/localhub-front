# 챗봇 API 연동 업데이트

## 적용 파일
- `src/views/HomeView.vue`
- `src/views/ChatbotView.vue`
- `src/components/PlaceThumbnail.vue`
- `src/components/chatbot/AccommodationPickerModal.vue`
- `src/components/chatbot/ChatbotMap.vue`
- `src/services/chatService.ts`
- `src/types/chatbot.ts`
- `src/utils/imageUrl.ts`

## 환경변수
`.env`
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_PLACE_MOCK=false
```

## 사용하는 API
- 숙소 검색: `GET /api/places?region=서울&category=숙박&page=1&size=6`
- 챗봇: `POST /api/chat`

## 실행
```bash
npm install
npm run dev
```
