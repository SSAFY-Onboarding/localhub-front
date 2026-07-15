# 관광 장소(Places) REST API 명세

> **범위**: 관광 JSON 7종 로딩 → 유형 필터 → 키워드·지역 검색 → 상세 조회 (BE2 담당)
> **연동 코드**: `app/schemas/place.py`, `app/services/data_loader.py`, `app/services/place_service.py`, `app/api/places.py`
> **상태**: 구현 완료 (pytest 8건 통과, 로컬 Swagger 확인) — `게시판 REST API 명세 초안`과 동일 규약 사용

---

## 1. 공통 규약

게시판 API(`REST_API_명세_초안_게시판.md`)와 동일한 규약을 그대로 따른다.

| 항목 | 값 |
|---|---|
| Base URL (로컬) | `http://localhost:8000` |
| API Prefix | `/api` |
| 요청/응답 | `application/json`, UTF-8 |

### 1.1 에러 응답 (전역 통일)
```json
{ "error": { "code": "PLACE_NOT_FOUND", "message": "해당 관광 장소를 찾을 수 없습니다.", "status": 404 } }
```
| code | HTTP | 의미 |
|---|:---:|---|
| `VALIDATION_ERROR` | 422 | 쿼리 파라미터 검증 실패 (예: size 범위 초과) |
| `PLACE_NOT_FOUND` | 404 | 해당 id의 관광 장소 없음 |

### 1.2 페이지네이션
| 파라미터 | 기본 | 제약 |
|---|---|---|
| page | 1 | ≥ 1 |
| size | 20 | 1 ~ 100 |

응답 래퍼(게시판과 동일 형식):
```json
{ "items": [ ... ], "page": 1, "size": 20, "total": 6518, "total_pages": 326 }
```

---

## 2. 엔드포인트 목록

| # | 기능 | 메서드 | 경로 | 성공 |
|---|---|---|---|---|
| 1 | 장소 목록 조회(필터/검색) | GET | `/api/places` | 200 |
| 2 | 관광 유형 목록 조회 | GET | `/api/places/categories` | 200 |
| 3 | 장소 상세 조회 | GET | `/api/places/{place_id}` | 200 |

> 라우팅 순서 주의: `/categories`는 `/{place_id}`보다 먼저 등록돼 있어 `place_id`로 오인식되지 않는다.

---

## 3. 상세 명세

### 3.1 장소 목록 조회
```
GET /api/places
```
**Query**
| 파라미터 | 타입 | 기본 | 설명 |
|---|---|---|---|
| category | str | - | 관광 유형 (예: `음식점`, `관광지`, `쇼핑` 등, `GET /api/places/categories` 참고) |
| keyword | str | - | 이름(`name`) 또는 주소(`address`)에 포함된 문자열 검색 |
| region | str | - | 지역명 (현재 `서울`만 존재) |
| page | int | 1 | 페이지 번호 (1 이상) |
| size | int | 20 | 페이지 크기 (1~100) |

**200 OK** — 목록은 지도 마커에 필요한 필드 중심(`PlaceResponse`)
```json
{
  "items": [
    {
      "id": "12-1059877",
      "name": "양화한강공원",
      "category": "관광지",
      "address": "서울특별시 영등포구 노들로 221 (당산동)",
      "latitude": 37.5382819489,
      "longitude": 126.902365881,
      "image_url": "https://tong.visitkorea.or.kr/cms/resource_photo/46/3551346_image2_1.jpg",
      "description": null,
      "phone": null
    }
  ],
  "page": 1, "size": 20, "total": 6518, "total_pages": 326
}
```

예시:
```
GET /api/places?category=쇼핑&keyword=명동&region=서울&page=1&size=20
```

---

### 3.2 관광 유형 목록 조회
```
GET /api/places/categories
```
**200 OK**
```json
{ "categories": ["관광지", "레포츠", "문화시설", "쇼핑", "숙박", "여행코스", "축제공연행사"] }
```
> 현재 `음식점`은 원본 데이터(`서울_음식점.json`)가 존재하지 않아 목록에서 빠져 있다 (팀 결정, 4번 참고).

---

### 3.3 장소 상세 조회
```
GET /api/places/{place_id}
```
- `place_id`는 목록 응답의 `id` 값을 그대로 사용 (`{contentTypeId}-{contentid}` 합성 키)

**200 OK** (`PlaceResponse`)
```json
{
  "id": "12-1059877",
  "name": "양화한강공원",
  "category": "관광지",
  "address": "서울특별시 영등포구 노들로 221 (당산동)",
  "latitude": 37.5382819489,
  "longitude": 126.902365881,
  "image_url": "https://tong.visitkorea.or.kr/cms/resource_photo/46/3551346_image2_1.jpg",
  "description": null,
  "phone": null
}
```
**404** `PLACE_NOT_FOUND` — 존재하지 않는 id 요청 시

---

## 4. 데이터 모델 및 정규화 규칙

### 4.1 `PlaceResponse` (공개 응답 모델)
```python
class PlaceResponse(BaseModel):
    id: str
    name: str
    category: str
    address: str | None
    latitude: float | None
    longitude: float | None
    image_url: str | None
    description: str | None
    phone: str | None
```

### 4.2 `contentTypeId` → `category` 매핑
| contentTypeId | category |
|---|---|
| 12 | 관광지 |
| 14 | 문화시설 |
| 15 | 축제공연행사 |
| 25 | 여행코스 |
| 28 | 레포츠 |
| 32 | 숙박 |
| 38 | 쇼핑 |
| 39 | 음식점 (현재 데이터 없음) |

### 4.3 결측값·이상치 처리
| 원본 필드 | 처리 |
|---|---|
| `addr1`/`addr2` | 빈 문자열이면 `address = None`, 있으면 `"addr1 addr2"`로 결합 |
| `mapy`(위도)/`mapx`(경도) | 빈 값/변환 실패/한국 범위(lat 33~39, lng 124~132) 밖이면 `None` (레코드는 유지) |
| `firstimage`/`firstimage2` | `firstimage` 우선, 없으면 `firstimage2`, 둘 다 없으면 `image_url = None` |
| `tel` | 빈 문자열이면 `phone = None` |
| `contentid` 없는 항목 | 고유 ID 생성 불가로 로딩에서 제외 |
| JSON 파일 자체 파싱 실패 | 해당 파일만 스킵(경고 로그), 전체 API는 정상 동작 |

### 4.4 ID 생성 규칙
`id = f"{contentTypeId}-{contentid}"` — 콘텐츠 유형이 달라도 `contentid`가 겹칠 수 있어 합성 키 사용.

---

## 5. 서비스 계층 재사용 함수 (챗봇 연동용)

`app/services/place_service.py`의 `search_places()`는 API 레이어를 거치지 않고 바로 import해서 쓸 수 있는 순수 함수다.

```python
from app.services.place_service import search_places

search_places(
    keyword="바다",
    category="관광지",
    region="부산",
    limit=5,
)  # -> list[PlaceResponse]
```

---

## 6. 스키마 ↔ 코드 매핑

| API 스키마 | Pydantic 클래스 | 위치 |
|---|---|---|
| 공개 응답 | `PlaceResponse` | `app/schemas/place.py` |
| 내부 레코드(region 포함) | `PlaceRecord` | 〃 |
| 목록 응답 | `PlaceListResponse` | 〃 |
| 카테고리 응답 | `CategoryListResponse` | 〃 |
| 404 예외 | `PlaceNotFound` | `app/core/exceptions.py` |
| 라우터 | `router` | `app/api/places.py` |
| 로딩/정규화 | `load_all_places`, `get_places` | `app/services/data_loader.py` |
| 필터/검색/페이지네이션 | `list_places`, `get_categories`, `get_place`, `search_places` | `app/services/place_service.py` |

---

## 7. 알려진 제약사항

1. `서울_음식점.json`이 리포에 커밋된 적이 없어 음식점 카테고리 데이터가 없음(팀 결정으로 없이 진행, 총 6,518건 기준). 추후 파일이 추가되면 `db/`에 넣기만 하면 코드 수정 없이 자동 반영됨.
2. 현재는 `서울` 지역 데이터만 존재. `region` 파라미터는 다지역 확장을 대비해 미리 받아두는 상태.
3. `description` 필드는 원본 데이터에 대응 필드가 없어 항상 `null` (추후 상세 설명 데이터 확보 시 채울 수 있음).
