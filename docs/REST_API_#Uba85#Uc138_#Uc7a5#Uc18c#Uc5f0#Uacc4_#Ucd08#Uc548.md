# 여행 일정·장소 연계 게시판 REST API 명세 초안

> **범위**: 장소 검색·선택, 여행 일정 편집, 게시글 작성·수정·상세의 `schedule` 연동
>
> **상태**: FE·BE 합의용 초안
>
> **선행 명세**: `PLACES_API_명세.md`, `게시판_API_명세.md`
>
> **기준 스키마**: 백엔드 OpenAPI의 `ScheduleItem`, `PostCreate`, `PostUpdate`, `PostDetail`

## 1. 목적

사용자가 서울 관광 장소를 검색해 여행 일정 또는 코스를 구성하고 게시글과 함께 공유할 수 있게 한다.

```text
게시글 작성
→ 여행 일정 추가
→ Day 추가
→ 장소 검색·선택
→ 방문 시간·메모 입력
→ 장소 순서 조정
→ 게시글 등록
→ 상세 화면에서 Day별 타임라인 표시
```

여행 일정은 선택 기능이다. 일정이 없는 일반 게시글 CRUD도 기존과 동일하게 지원한다.

### 1.1 이번 범위에 포함

- Places API를 이용한 장소 검색과 카테고리 필터
- 게시글 하나에 여러 장소 연결
- Day별 장소 순서, 방문 시간, 메모 입력
- 작성·수정 요청의 `schedule` 저장
- 게시글 상세의 Day별 일정 타임라인
- 일정 장소에서 `/map?place={place_id}`로 이동

### 1.2 이번 범위에서 제외

- 실제 도보·차량 이동 경로와 소요 시간
- 장소 간 거리 계산과 자동 동선 최적화
- 숙소 주변 장소 자동 추천
- 드래그 앤 드롭 정렬
- 일정 복사와 북마크
- 장소별 관련 게시글 목록
- 게시글 목록 응답에 전체 일정 포함

## 2. 공통 원칙

| 항목 | 계약 |
|---|---|
| 장소 식별자 | Places API의 합성 `id`, 예: `12-1059877` |
| API 필드명 | `snake_case` |
| 일정 없는 게시글 | 요청·응답에서 `schedule: []` 권장 |
| 일정 정렬 기준 | `day ASC`, 같은 Day에서는 `order ASC` |
| 장소 정보 | 작성 당시 장소 정보 스냅샷으로 저장 |
| 사용자 입력 정보 | `time`, `memo` |
| 좌표 없는 장소 | 일정 추가 허용, 지도 이동 버튼은 숨김 |
| 일반 게시글 호환 | 빈 일정으로 기존 CRUD 유지 |

프런트는 TourAPI 원본 `contentid`를 직접 사용하지 않는다. Places API 목록 응답의 `id`를 `place_id`로 사용한다.

## 3. 장소 검색 API

기존 Places API를 그대로 사용하며 일정 전용 장소 검색 엔드포인트는 추가하지 않는다.

### 3.1 카테고리 조회

```http
GET /api/places/categories
```

```json
{
  "categories": [
    "관광지",
    "레포츠",
    "문화시설",
    "쇼핑",
    "숙박",
    "여행코스",
    "축제공연행사"
  ]
}
```

### 3.2 장소 검색

```http
GET /api/places?keyword=경복궁&category=관광지&region=서울&page=1&size=10
```

| Query | 타입 | 필수 | 설명 |
|---|---|:---:|---|
| `keyword` | string | X | 장소명 또는 주소 부분 검색 |
| `category` | string | X | 카테고리 단일 선택 |
| `region` | string | X | 현재 프런트는 `서울` 고정 |
| `page` | integer | X | 기본 1 |
| `size` | integer | X | 장소 선택 모달에서는 10 권장 |

**200 OK**

```json
{
  "items": [
    {
      "id": "12-1059877",
      "name": "경복궁",
      "category": "관광지",
      "address": "서울특별시 종로구 사직로 161",
      "latitude": 37.579617,
      "longitude": 126.977041,
      "image_url": null,
      "description": null,
      "phone": null
    }
  ],
  "page": 1,
  "size": 10,
  "total": 1,
  "total_pages": 1
}
```

## 4. `ScheduleItem` 스키마

### 4.1 API 스키마

```ts
export interface ScheduleItem {
  day: number
  order: number
  place_id: string
  name: string
  type: string
  lat: number | null
  lng: number | null
  image_url: string | null
  time: string | null
  memo: string | null
}
```

### 4.2 필드 계약

| 필드 | 타입 | 필수 | 제약 및 의미 |
|---|---|:---:|---|
| `day` | integer | O | 1 이상, 여행 N일 차 |
| `order` | integer | O | 1 이상, 같은 Day 안의 표시 순서 |
| `place_id` | string | O | Places API 합성 ID |
| `name` | string | O | 작성 당시 장소명 스냅샷 |
| `type` | string | O | 작성 당시 카테고리 스냅샷 |
| `lat` | number \| null | X | 작성 당시 위도 |
| `lng` | number \| null | X | 작성 당시 경도 |
| `image_url` | string \| null | X | 작성 당시 대표 이미지 URL 스냅샷 |
| `time` | string \| null | X | `HH:mm`, 방문 예정 시간 |
| `memo` | string \| null | X | 장소별 사용자 메모 |

### 4.3 Places 응답 변환

장소 선택 직후 프런트는 다음처럼 `ScheduleItem`을 생성한다.

```ts
function toScheduleItem(
  place: PlaceResponse,
  day: number,
  order: number,
): ScheduleItem {
  return {
    day,
    order,
    place_id: place.id,
    name: place.name,
    type: place.category,
    lat: place.latitude,
    lng: place.longitude,
    image_url: place.image_url,
    time: null,
    memo: null,
  }
}
```

## 5. 일정 배열 규칙

### 5.1 권장 제한

다음 값은 FE·BE가 동일하게 적용한다.

| 항목 | 제한 |
|---|---:|
| 최대 Day | 7 |
| Day별 최대 장소 | 10 |
| 전체 최대 장소 | 30 |
| `memo` 최대 길이 | 200자 |
| `time` 형식 | 24시간제 `HH:mm` |

### 5.2 정렬과 번호

- `day`는 1부터 시작하며 중간 번호가 비지 않도록 한다.
- 각 Day의 `order`는 1부터 시작하며 중간 번호가 비지 않도록 한다.
- `(day, order)` 조합은 중복될 수 없다.
- 서버는 저장 전 `day ASC`, `order ASC`로 정렬한다.
- 프런트는 추가·삭제·이동 직후 `day`, `order`를 다시 계산한다.
- 동일 장소를 여러 Day 또는 같은 Day에 다시 추가하는 것은 허용한다.

### 5.3 장소 정보 신뢰 기준

프런트는 Places API 응답으로 `name`, `type`, `lat`, `lng`, `image_url`을 채워 전송한다. 백엔드는 `place_id`로 실제 장소를 조회하고 다음 필드를 서버 데이터로 덮어쓴 뒤 저장하는 방식을 권장한다.

```text
서버 기준: place_id, name, type, lat, lng, image_url
사용자 기준: day, order, time, memo
```

이렇게 하면 프런트 조작과 오래된 장소 정보 저장을 방지하면서, 저장 시점의 장소 스냅샷을 유지할 수 있다.

## 6. 게시글 작성 API 확장

```http
POST /api/posts
Content-Type: application/json
```

### 6.1 일정이 있는 요청

```json
{
  "title": "서울 2박 3일 코스 공유합니다",
  "content": "대중교통으로 이동하기 좋은 코스입니다.",
  "password": "1234",
  "schedule": [
    {
      "day": 1,
      "order": 1,
      "place_id": "12-1059877",
      "name": "경복궁",
      "type": "관광지",
      "lat": 37.579617,
      "lng": 126.977041,
      "time": "10:00",
      "memo": "한복 대여 후 관람"
    },
    {
      "day": 1,
      "order": 2,
      "place_id": "38-126508",
      "name": "광장시장",
      "type": "쇼핑",
      "lat": 37.570122,
      "lng": 126.999731,
      "time": "13:00",
      "memo": "점심 식사"
    },
    {
      "day": 2,
      "order": 1,
      "place_id": "12-126468",
      "name": "서울숲",
      "type": "관광지",
      "lat": 37.544388,
      "lng": 127.037442,
      "time": null,
      "memo": null
    }
  ]
}
```

### 6.2 일반 게시글 요청

```json
{
  "title": "서울 여행 질문입니다",
  "content": "주말에 방문하기 좋은 곳이 있을까요?",
  "password": "1234",
  "schedule": []
}
```

`schedule`을 생략하거나 `null`로 보내는 기존 요청도 호환할 수 있지만, 신규 프런트는 항상 배열을 전송한다.

### 6.3 성공 응답

**201 Created**

- `Location: /api/posts/{post_id}`
- 본문: 생성된 `PostDetail`

### 6.4 오류

- `404 PLACE_NOT_FOUND`: 일정에 포함된 `place_id`가 Places 데이터에 없음
- `422 VALIDATION_ERROR`: 개별 필드 타입·길이·시간 형식 오류
- `422 INVALID_SCHEDULE`: 일정 개수, Day, 순서 또는 중복 규칙 위반

일정 항목 하나라도 유효하지 않으면 게시글 전체를 생성하지 않는다.

## 7. 게시글 수정 API 확장

```http
PUT /api/posts/{post_id}
Content-Type: application/json
```

`PUT`은 수정 가능한 전체 값을 교체하므로 신규 프런트는 `schedule`을 항상 명시한다.

```json
{
  "title": "수정된 서울 여행 코스",
  "content": "둘째 날 일정을 변경했습니다.",
  "password": "1234",
  "schedule": [
    {
      "day": 1,
      "order": 1,
      "place_id": "12-1059877",
      "name": "경복궁",
      "type": "관광지",
      "lat": 37.579617,
      "lng": 126.977041,
      "time": "10:30",
      "memo": "입장 시간 변경"
    }
  ]
}
```

일정을 모두 삭제하려면 빈 배열을 전송한다.

```json
{
  "schedule": []
}
```

위 예시는 의미 설명용이며 실제 `PUT` 요청에는 `title`, `content`, `password`도 함께 전송해야 한다.

### 7.1 검증 순서

1. 게시글 존재 확인 → `404 POST_NOT_FOUND`
2. 비밀번호 확인 → `403 INVALID_PASSWORD`
3. 일정 구조 검증 → `422 INVALID_SCHEDULE`
4. 모든 `place_id` 확인 → `404 PLACE_NOT_FOUND`
5. 게시글과 일정 전체 교체

검증과 저장은 하나의 트랜잭션으로 처리한다.

## 8. 게시글 상세 응답

```http
GET /api/posts/{post_id}
```

```json
{
  "id": 42,
  "title": "서울 2박 3일 코스 공유합니다",
  "content": "대중교통으로 이동하기 좋은 코스입니다.",
  "schedule": [
    {
      "day": 1,
      "order": 1,
      "place_id": "12-1059877",
      "name": "경복궁",
      "type": "관광지",
      "lat": 37.579617,
      "lng": 126.977041,
      "time": "10:00",
      "memo": "한복 대여 후 관람"
    },
    {
      "day": 1,
      "order": 2,
      "place_id": "38-126508",
      "name": "광장시장",
      "type": "쇼핑",
      "lat": 37.570122,
      "lng": 126.999731,
      "time": "13:00",
      "memo": "점심 식사"
    }
  ],
  "created_at": "2026-07-15T01:00:00Z",
  "updated_at": null,
  "view_count": 1,
  "like_count": 0
}
```

### 8.1 응답 규칙

- 일정은 항상 `day ASC`, `order ASC`로 반환한다.
- 일정이 없으면 `schedule: []`를 반환하는 것을 권장한다.
- 기존 데이터 호환으로 `null`이 반환될 수 있으므로 프런트는 `post.schedule ?? []`로 정규화한다.
- 게시글 목록 `PostSummary`에는 `schedule`을 포함하지 않는다.
- 저장된 장소가 이후 Places 원본에서 사라져도 기존 스냅샷 일정은 그대로 조회한다.

## 9. 프런트 TypeScript 계약

```ts
export interface ScheduleItem {
  day: number
  order: number
  place_id: string
  name: string
  type: string
  lat: number | null
  lng: number | null
  image_url: string | null
  time: string | null
  memo: string | null
}

export interface PostDetail extends PostSummary {
  content: string
  schedule: ScheduleItem[] | null
  updated_at: string | null
}

export interface PostCreateInput {
  title: string
  content: string
  password: string
  schedule: ScheduleItem[]
}

export type PostUpdateInput = PostCreateInput
```

프런트 편집 상태에서는 `schedule`을 항상 배열로 관리한다.

```ts
const schedule = ref<ScheduleItem[]>(post.schedule ?? [])
```

## 10. 프런트 상태 변경 규칙

### 10.1 장소 추가

```text
day = 선택된 Day
order = 해당 Day 장소 수 + 1
time = null
memo = null
```

### 10.2 장소 이동

- 위·아래 버튼으로 같은 Day 안에서 이동한다.
- Day 간 이동은 대상 Day 선택 방식으로 제공할 수 있다.
- 이동 직후 양쪽 Day의 `order`를 1부터 다시 계산한다.

### 10.3 장소 삭제

- 삭제 직후 해당 Day의 `order`를 다시 계산한다.
- 마지막 장소가 삭제되어도 Day 자체는 유지할 수 있다.

### 10.4 Day 삭제

- Day에 장소가 있으면 확인 후 삭제한다.
- 뒤의 Day 번호를 1씩 당긴다.
- 모든 항목의 `day`, `order`를 다시 계산한다.

## 11. 상세 화면 표시 규칙

```text
여행 일정 · 2일

Day 1
10:00  경복궁
       관광지
       한복 대여 후 관람
       [지도에서 보기]

13:00  광장시장
       쇼핑
       점심 식사

Day 2
시간 미정  서울숲
           관광지
```

- `time: null`이면 `시간 미정` 또는 시간 영역 생략
- `memo: null`이면 메모 영역 생략
- `lat`, `lng`가 모두 있을 때만 지도 버튼 표시
- 지도 버튼 경로: `/map?place={place_id}`
- 장소 순서는 `time`이 아니라 `order`를 기준으로 표시

## 12. 공통 오류 응답

기존 게시판 API의 오류 형식을 유지한다.

```json
{
  "error": {
    "code": "INVALID_SCHEDULE",
    "message": "여행 일정 정보를 확인해 주세요.",
    "status": 422,
    "details": [
      {
        "field": "schedule[2].order",
        "reason": "같은 Day에서 순서가 중복되었습니다."
      }
    ]
  }
}
```

| 코드 | HTTP | 의미 |
|---|---:|---|
| `VALIDATION_ERROR` | 422 | 개별 필드 타입·길이 오류 |
| `INVALID_SCHEDULE` | 422 | 일정 배열의 구조·순서·개수 위반 |
| `PLACE_NOT_FOUND` | 404 | 일정 장소가 Places 데이터에 없음 |
| `POST_NOT_FOUND` | 404 | 게시글이 없음 |
| `INVALID_PASSWORD` | 403 | 수정 비밀번호 불일치 |

## 13. 추가 백엔드 합의·구현 필요 사항

현재 OpenAPI에서 확인된 것은 `ScheduleItem` 필드 타입과 `day/order >= 1` 제약이다. 다음 항목은 백엔드와 추가 합의 후 구현 여부를 확인해야 한다.

- `schedule: null`을 응답에서 `[]`로 정규화할지
- 전체 30개, 7일, Day별 10개 제한
- `time`의 `HH:mm` 검증
- `memo` 200자 제한
- `(day, order)` 중복 및 연속성 검증
- `place_id` 존재 검증
- `name`, `type`, `lat`, `lng` 서버 값 덮어쓰기
- 저장·응답 전 일정 정렬
- 수정 시 `schedule` 생략의 의미

권장 결론은 다음과 같다.

```text
신규 프런트는 schedule을 항상 배열로 전송
백엔드는 null/생략을 기존 호환 목적으로만 빈 일정 처리
PUT은 전달된 schedule로 전체 교체
장소 스냅샷 필드는 Places 데이터를 기준으로 보정
```

## 14. 완료 조건

- 일정 없이 기존 게시글을 작성·수정할 수 있다.
- 장소 검색 결과를 Day에 추가할 수 있다.
- Day 추가·삭제와 장소 순서 변경이 가능하다.
- 작성·수정 후 일정이 동일한 순서로 복원된다.
- 잘못된 비밀번호에서는 편집 중인 일정이 유지된다.
- 유효하지 않은 장소 또는 일정은 전체 요청이 실패한다.
- 상세 화면에서 Day별 일정이 올바른 순서로 표시된다.
- 좌표가 있는 일정 장소는 지도 화면으로 이동할 수 있다.
- 기존 `schedule: null` 게시글도 오류 없이 표시된다.
