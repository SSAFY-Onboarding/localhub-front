# LocalHub Seoul Frontend

서울의 관광 장소를 지도에서 탐색하고, 여행 일정을 커뮤니티에 공유하며, AI에게 지역 기반 장소를 추천받을 수 있는 LocalHub의 Vue 프런트엔드입니다.

백엔드 저장소 `localhub-back`과 함께 실행하는 것을 기준으로 합니다.

## 주요 기능

- 서울 관광 데이터 7개 유형 지도 시각화
- 현재 지도 영역 검색, 키워드 검색, 다중 카테고리 필터
- 마커 클러스터링, 카테고리 아이콘, 장소 썸네일과 상세 팝업
- 익명 커뮤니티 게시글 작성·조회·수정·삭제
- 게시글 비밀번호 확인, 조회수와 추천 수 표시
- 장소를 Day별 여행 일정으로 구성하고 게시글에 첨부
- 게시글 일정의 타임라인 및 지도 표시
- 숙소 또는 질문 속 서울 지역을 기준으로 한 AI 장소 추천
- 데스크톱·태블릿·모바일 반응형 UI

## 기술 스택

- Vue 3, TypeScript
- Vite
- Vue Router
- Leaflet, Leaflet.markercluster
- Vitest, Vue Test Utils
- Playwright
- ESLint, Oxlint, Prettier

## 실행 요구사항

- Node.js `22.18.0` 이상 또는 `24.12.0` 이상
- npm
- 실행 중인 LocalHub 백엔드 API

## 시작하기

### 1. 의존성 설치

```bash
npm ci
```

### 2. 환경변수 설정

`.env.example`을 복사해 `.env`를 만듭니다.

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_PLACE_MOCK=false
```

| 환경변수 | 설명 |
| --- | --- |
| `VITE_API_BASE_URL` | 백엔드 주소. `/api`를 붙이지 않은 서버 기준 URL 권장 |
| `VITE_USE_PLACE_MOCK` | `true`이면 장소 선택 UI에서 로컬 mock 데이터를 사용 |

환경변수를 변경한 뒤에는 Vite 개발 서버를 다시 시작해야 합니다. 게시판과 챗봇은 mock 모드와 관계없이 백엔드 연결이 필요합니다.

### 3. 개발 서버 실행

```bash
npm run dev
```

기본 접속 주소는 `http://localhost:5173`입니다.

## 사용 가능한 명령어

| 명령어 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 실행 |
| `npm run build` | 타입 검사 후 프로덕션 빌드 |
| `npm run build-only` | Vite 프로덕션 빌드만 실행 |
| `npm run preview` | 빌드 결과 로컬 미리보기 |
| `npm run type-check` | Vue·TypeScript 타입 검사 |
| `npm run lint` | Oxlint와 ESLint 검사 및 자동 수정 |
| `npm run format` | `src/` 포맷 정리 |
| `npm run test:unit` | Vitest 단위 테스트 실행 |
| `npm run test:e2e` | Playwright E2E 테스트 실행 |

Playwright를 처음 사용하는 환경에서는 브라우저를 먼저 설치합니다.

```bash
npx playwright install
```

## 화면 경로

| 경로 | 화면 |
| --- | --- |
| `/` | 홈 |
| `/map` | 장소 지도·검색·목록 |
| `/chatbot` | AI 여행 장소 추천 |
| `/posts` | 커뮤니티 게시글 목록 |
| `/posts/new` | 게시글 작성 |
| `/posts/:id` | 게시글 상세 |
| `/posts/:id/edit` | 게시글 수정 |

`public/_redirects`에는 Vue Router의 History 모드를 위한 SPA fallback 설정이 포함되어 있습니다.

## 주요 디렉터리

```text
src/
├─ assets/       전역 스타일과 장소 fallback 이미지
├─ components/   공통 UI, 일정 편집·표시, 챗봇 컴포넌트
├─ mocks/        선택적으로 사용하는 장소 mock 데이터
├─ router/       화면 라우팅
├─ services/     posts, places, chat API 접근 계층
├─ types/        API 및 화면 TypeScript 타입
├─ utils/        이미지 URL과 카테고리 시각화 유틸리티
└─ views/        라우트 단위 화면
```

## API 연동

프런트엔드 서비스는 다음 백엔드 API를 사용합니다.

- `/api/places`, `/api/places/map`, `/api/places/categories`
- `/api/posts`
- `/api/chat`

필드와 응답 형식은 `docs/`의 명세를 참고합니다.

- [화면 구조 및 동작 계획](./docs/site_map_plan.md)
- [게시판 API 명세](./docs/REST_API_명세_게시판_최종.md)
- [장소 API 명세](./docs/REST_API_명세_장소.md)
- [여행 일정 연계 명세](./docs/REST_API_명세_장소연계_초안.md)
- [챗봇 MVP 명세](./docs/챗봇_MVP_기능_명세.md)

## 개발 시 주의사항

- `.env`는 저장소에 커밋하지 않습니다.
- 장소 ID는 `{contentTypeId}-{contentid}` 형식의 문자열입니다.
- 장소 API는 `latitude`·`longitude`, 게시글 일정은 `lat`·`lng`를 사용합니다.
- 게시글 상세 조회 API는 요청할 때마다 조회수를 증가시킵니다.
- 로그인 기능이 없는 MVP이므로 게시글 추천은 여러 번 요청할 수 있습니다.
