# 여행 일정 프런트엔드와 Places API 전환 안내

> 현재 main 브랜치의 Places API 연동을 확인하여 기본값은 실API 모드(`VITE_USE_PLACE_MOCK=false`)다.

## 현재 연동 범위

- 게시글 생성 `POST /api/posts`, 수정 `PUT /api/posts/{id}`, 상세 조회 `GET /api/posts/{id}`는 실제 백엔드 API를 사용한다.
- 여행 일정은 `schedule: ScheduleItem[]`로 게시글 요청에 실제 포함된다.
- 장소 카테고리·목록·상세 조회는 실제 Places API를 사용한다.
- mock 데이터는 백엔드 없이 UI만 개발해야 할 때 선택적으로 사용할 수 있다.
- mock 사용 여부는 `VITE_USE_PLACE_MOCK`으로 명시적으로 결정한다. API 실패 시 mock으로 자동 전환하지 않는다.

## mock을 사용하는 코드

| 파일 | 역할 | 실제 API 전환 후 처리 |
| --- | --- | --- |
| `src/mocks/places.ts` | 서울 장소 샘플 데이터 | 삭제 가능 |
| `src/services/placeService.ts` | mock/실제 API 분기 | 분기 유지 또는 mock 코드 제거 |
| `.env`의 `VITE_USE_PLACE_MOCK` | `true`일 때만 mock 모드 활성화 | 기본값 `false` 유지 |

새 환경을 구성할 때는 저장소의 `.env.example`을 복사해 `.env`를 만든다. 실제 `.env`는 Git에 포함되지 않는다.

`PlacePickerModal.vue`, `ScheduleEditor.vue` 등 UI 컴포넌트는 `placeService`만 호출하므로 전환할 때 수정할 필요가 없다.

## 실제 Places API 연동 확인 절차

1. 백엔드에 아래 엔드포인트가 병합·배포되었는지 확인한다.
   - `GET /api/places/categories`
   - `GET /api/places?region=서울&keyword=&category=&page=1&size=6`
   - `GET /api/places/{place_id}`
2. 목록 응답이 `{ items, page, size, total, total_pages }`이고 각 장소가 다음 필드를 반환하는지 확인한다.
   - `id`, `name`, `category`, `address`, `latitude`, `longitude`, `image_url`, `description`, `phone`
   - 카테고리 응답은 `{ "categories": string[] }` 형식이다.
3. 프런트 `.env`에서 `VITE_USE_PLACE_MOCK=false`인지 확인한다.
4. Vite 개발 서버를 재시작한다. 환경변수는 실행 중 자동 반영되지 않는다.
5. 장소 검색, 카테고리 필터, 페이지 이동, 게시글 등록 후 상세 일정 표시를 확인한다.
6. 브라우저에서 CORS 오류가 난다면 백엔드 허용 origin에 프런트 주소를 추가한다.

## ScheduleItem 전송 규칙

```json
{
  "day": 1,
  "order": 1,
  "place_id": "12-126508",
  "name": "경복궁",
  "type": "관광지",
  "lat": 37.5796,
  "lng": 126.977,
  "time": "10:00",
  "memo": "수문장 교대식 보기"
}
```

- 일정이 없으면 `schedule: []`를 전송한다.
- `day`와 `order`는 1부터 시작하며 UI에서 삭제·순서 변경 시 다시 연속 번호로 정규화한다.
- `name`, `type`, 좌표는 선택 당시 장소 정보를 스냅샷으로 저장한다.
- 제한은 최대 7일, 일자별 10개, 전체 30개, 메모 200자다.
- 같은 장소의 중복 등록은 허용한다.

## 확정된 API 규칙

- 게시글 상세 응답에서 일정이 없을 때는 `schedule: []`를 사용한다. 기존 데이터가 `null`이어도 프런트는 안전하게 처리한다.
- 장소 API는 `latitude`/`longitude`, ScheduleItem은 `lat`/`lng`를 사용한다. 프런트는 장소를 일정에 추가할 때 변환한다.
- 게시글 목록에는 일정 전체를 싣지 않는다. 향후 목록에 코스 여부가 필요하면 `has_schedule` 또는 `schedule_item_count`를 별도 추가한다.

## 2026-07-15 실API 검증 결과

- 장소 카테고리, 목록, 상세 조회가 모두 HTTP 200으로 응답했다.
- 일정 한 건을 포함한 게시글 생성과 상세 재조회에서 `place_id`, `lat`, `lng`가 동일하게 왕복했다.
- 검증용 게시글은 확인 직후 정상 삭제했다.
