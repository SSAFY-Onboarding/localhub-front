# 장소 연계 커뮤니티 REST API 명세 초안

> **범위**: 관광 장소 조회, 장소에서 게시글 작성 진입, 게시글과 장소 연결, 게시글 상세의 관련 장소 표시  
> **상태**: FE·BE 합의용 초안  
> **선행 명세**: `REST_API_명세_1차개정_게시판.md`  
> **대상 데이터**: 한국관광공사 TourAPI 4.0 서울 제공 JSON

## 1. 목표와 제외 범위

### 1.1 이번 단계의 목표

```text
지도에서 장소 선택
→ 장소 정보 패널
→ [이 장소 관련 글쓰기]
→ 게시글에 장소 연결
→ 게시글 상세에서 관련 장소 카드 표시
→ [지도에서 보기]
```

관련 장소가 없는 일반 게시글 작성·조회도 기존과 동일하게 지원한다.

### 1.2 이번 단계에서 제외

- 숙소 주변 명소 거리순 추천
- 장소별 관련 게시글 목록
- 게시글 목록의 장소 필터와 장소 배지
- 게시글 하나에 여러 장소 연결
- 장소 후기·질문 등 게시글 카테고리
- 관광 데이터를 SQLite 테이블로 적재하거나 외래 키로 연결

주변 명소 추천은 장소 연결 완료 후 별도 명세로 확장한다.

## 2. 합의 사항 요약

| 항목 | 결정 |
|---|---|
| 장소 식별자 | TourAPI의 `contentid` 문자열 |
| 게시글당 연결 개수 | 0개 또는 1개 |
| DB 저장 값 | `posts.related_content_id`만 저장 |
| 장소 원본 | 서버가 로딩한 서울 관광 JSON |
| 장소 유효성 검증 | 게시글 생성·수정 시 백엔드가 수행 |
| 게시글 상세 | `related_content_id`와 `related_place`를 함께 반환 |
| JSON 네이밍 | API에서는 모두 `snake_case` |
| 좌표 타입 | API 응답에서는 `number | null` |
| 장소 연결 해제 | 수정 요청에서 `related_content_id: null` 전달 |
| 연결 가능한 유형 | 서울 제공 데이터의 8개 유형 전체 |

## 3. 원본 데이터 정규화

원본 JSON의 장소 필드는 다음과 같이 API 모델로 변환한다.

| 원본 필드 | API 필드 | API 타입 | 변환 규칙 |
|---|---|---|---|
| `contentid` | `content_id` | string | 값 유지 |
| `contenttypeid` | `content_type_id` | string | 문자열로 통일 |
| `title` | `title` | string | 원문 유지 |
| `addr1` | `address` | string | 원문 유지, 빈 문자열 허용 |
| `addr2` | `address_detail` | string | 원문 유지, 빈 문자열 허용 |
| `mapy` | `latitude` | number \| null | 실수 변환 실패 또는 빈 값이면 `null` |
| `mapx` | `longitude` | number \| null | 실수 변환 실패 또는 빈 값이면 `null` |
| `firstimage` | `image_url` | string \| null | 빈 문자열이면 `null` |

파일 최상위 `contentTypeId`는 파일에 따라 숫자 또는 문자열일 수 있으므로 서버 로딩 시 문자열로 통일한다. 장소별 `contenttypeid`를 우선 사용한다.

### 3.1 콘텐츠 유형

| `content_type_id` | 이름 |
|---|---|
| `12` | 관광지 |
| `14` | 문화시설 |
| `15` | 축제공연행사 |
| `25` | 여행코스 |
| `28` | 레포츠 |
| `32` | 숙박 |
| `38` | 쇼핑 |
| `39` | 음식점 |

서버는 위 매핑으로 `content_type_name`을 생성한다. 원본의 제목·주소·이미지 URL 등 콘텐츠 값은 임의로 수정하지 않는다.

## 4. 공통 장소 스키마

### 4.1 `PlaceSummary`

```json
{
  "content_id": "2723499",
  "content_type_id": "28",
  "content_type_name": "레포츠",
  "title": "서울한양도성 백악구간",
  "address": "서울특별시 종로구 창의문로 118 (부암동)",
  "address_detail": "창의문~혜화문",
  "latitude": 37.5926044932,
  "longitude": 126.9664956513,
  "image_url": "https://tong.visitkorea.or.kr/.../image2_1.jpg"
}
```

좌표·이미지가 없으면 `null`, 주소가 없으면 빈 문자열을 반환한다. 응답에서 필드를 생략하지 않는다.

### 4.2 프런트 TypeScript 타입

```ts
export interface PlaceSummary {
  content_id: string
  content_type_id: string
  content_type_name: string
  title: string
  address: string
  address_detail: string
  latitude: number | null
  longitude: number | null
  image_url: string | null
}
```

## 5. 엔드포인트 변경 요약

| 기능 | 메서드 | 경로 | 변경 구분 |
|---|---|---|---|
| 장소 단건 조회 | `GET` | `/api/locations/{content_id}` | 신규 |
| 게시글 작성 | `POST` | `/api/posts` | Body 확장 |
| 게시글 수정 | `PUT` | `/api/posts/{id}` | Body 확장 |
| 게시글 상세 | `GET` | `/api/posts/{id}` | Response 확장 |

게시글 목록과 삭제 API는 이번 단계에서 변경하지 않는다.

## 6. 장소 단건 조회

작성 화면을 직접 새로고침하거나 장소 카드를 다시 구성할 때 사용한다.

```http
GET /api/locations/{content_id}
```

### 6.1 Path

| 필드 | 타입 | 제약 |
|---|---|---|
| `content_id` | string | 숫자로 구성된 1~20자 TourAPI ID |

### 6.2 성공 응답

**200 OK**: `PlaceSummary`

```json
{
  "content_id": "2723499",
  "content_type_id": "28",
  "content_type_name": "레포츠",
  "title": "서울한양도성 백악구간",
  "address": "서울특별시 종로구 창의문로 118 (부암동)",
  "address_detail": "창의문~혜화문",
  "latitude": 37.5926044932,
  "longitude": 126.9664956513,
  "image_url": "https://tong.visitkorea.or.kr/.../image2_1.jpg"
}
```

### 6.3 오류

- `404 LOCATION_NOT_FOUND`: 서울 제공 JSON에서 장소를 찾을 수 없음
- `422 VALIDATION_ERROR`: ID 형식이 잘못됨

```json
{
  "error": {
    "code": "LOCATION_NOT_FOUND",
    "message": "해당 장소를 찾을 수 없습니다.",
    "status": 404,
    "details": []
  }
}
```

## 7. 게시글 작성 확장

```http
POST /api/posts
Content-Type: application/json
```

### 7.1 Body `PostCreate`

```json
{
  "title": "서울한양도성 주변 산책 후기를 공유합니다",
  "content": "백악구간을 걸어 본 후기입니다.",
  "password": "1234",
  "related_content_id": "2723499"
}
```

장소 없는 일반 게시글은 `null` 또는 필드 생략을 허용한다.

```json
{
  "title": "서울 여행 질문입니다",
  "content": "이번 주말에 갈 만한 곳이 있을까요?",
  "password": "1234",
  "related_content_id": null
}
```

| 필드 | 타입 | 필수 | 제약 |
|---|---|:---:|---|
| `related_content_id` | string \| null | X | `null` 또는 숫자로 구성된 1~20자 TourAPI ID |

백엔드는 ID 형식뿐 아니라 서울 제공 JSON에 실제로 존재하는지 검증한다. 좌표가 없는 장소도 게시글 연결은 허용한다.

### 7.2 성공 응답

**201 Created**

- `Location: /api/posts/{생성된 ID}`
- 본문: 확장된 `PostDetail`

### 7.3 추가 오류

- `404 LOCATION_NOT_FOUND`: 전달한 장소가 서울 제공 JSON에 존재하지 않음
- `422 VALIDATION_ERROR`: `related_content_id` 형식이 잘못됨

장소 검증 실패 시 게시글을 생성하지 않는다.

## 8. 게시글 수정 확장

```http
PUT /api/posts/{id}
Content-Type: application/json
```

### 8.1 Body `PostUpdate`

`PUT`은 수정 가능한 전체 필드를 교체하므로 `related_content_id`를 **반드시 명시**한다.

```json
{
  "title": "수정된 제목",
  "content": "수정된 내용입니다.",
  "password": "1234",
  "related_content_id": "2723499"
}
```

| 의도 | 전송 값 |
|---|---|
| 기존 장소 연결 유지 | 기존 `content_id` |
| 다른 장소로 변경 | 새 `content_id` |
| 장소 연결 해제 | `null` |

장소 ID가 유효하더라도 비밀번호가 일치하지 않으면 수정하지 않는다. 비밀번호와 장소 유효성 검증이 모두 성공한 뒤 하나의 트랜잭션으로 반영한다.

### 8.2 오류 우선순위

정보 노출과 불필요한 장소 조회를 줄이기 위해 다음 순서를 권장한다.

1. 게시글 존재 확인 → `404 POST_NOT_FOUND`
2. 비밀번호 확인 → `403 INVALID_PASSWORD`
3. 요청 필드 및 장소 확인 → `422` 또는 `404 LOCATION_NOT_FOUND`
4. 수정 반영

## 9. 게시글 상세 응답 확장

```http
GET /api/posts/{id}
```

### 9.1 장소가 연결된 게시글

```json
{
  "id": 42,
  "title": "서울한양도성 주변 산책 후기를 공유합니다",
  "content": "백악구간을 걸어 본 후기입니다.",
  "related_content_id": "2723499",
  "related_place": {
    "content_id": "2723499",
    "content_type_id": "28",
    "content_type_name": "레포츠",
    "title": "서울한양도성 백악구간",
    "address": "서울특별시 종로구 창의문로 118 (부암동)",
    "address_detail": "창의문~혜화문",
    "latitude": 37.5926044932,
    "longitude": 126.9664956513,
    "image_url": "https://tong.visitkorea.or.kr/.../image2_1.jpg"
  },
  "created_at": "2026-07-14T01:00:00Z",
  "updated_at": "2026-07-14T01:00:00Z"
}
```

### 9.2 장소가 없는 일반 게시글

```json
{
  "id": 43,
  "title": "서울 여행 질문입니다",
  "content": "이번 주말에 갈 만한 곳이 있을까요?",
  "related_content_id": null,
  "related_place": null,
  "created_at": "2026-07-14T02:00:00Z",
  "updated_at": "2026-07-14T02:00:00Z"
}
```

### 9.3 저장된 장소가 현재 JSON에서 사라진 경우

게시글 조회 자체는 실패시키지 않는다.

```json
{
  "related_content_id": "2723499",
  "related_place": null
}
```

프런트는 이 경우 게시글 본문을 정상 표시하고 관련 장소 영역에 `현재 제공 데이터에서 장소 정보를 찾을 수 없습니다.`라고 표시한다.

### 9.4 프런트 TypeScript 타입 변경

```ts
export interface PostDetail extends PostSummary {
  content: string
  related_content_id: string | null
  related_place: PlaceSummary | null
  created_at: string
  updated_at: string
}

export interface PostCreateInput {
  title: string
  content: string
  password: string
  related_content_id?: string | null
}

export interface PostUpdateInput {
  title: string
  content: string
  password: string
  related_content_id: string | null
}
```

## 10. DB 변경

관광 장소는 JSON에서 조회하므로 `posts`와 물리적 외래 키를 만들지 않는다.

```python
related_content_id = Column(String(20), nullable=True, index=True)
```

- 기존 게시글 마이그레이션 값: `NULL`
- 게시글 삭제 시 장소 데이터에는 영향 없음
- JSON 로딩 인덱스 권장 형태: `dict[str, Place]`, 키는 `contentid`
- 서버 시작 시 중복 `contentid`가 있으면 로그로 남기고 데이터 담당자와 확인

향후 장소별 게시글 조회를 추가할 수 있도록 DB 인덱스는 이번 단계에서 생성한다.

## 11. 프런트 라우팅과 상태 전달

### 11.1 장소에서 작성 화면으로 이동

```text
/posts/new?related_content_id=2723499
```

작성 화면 진입 시:

1. 쿼리의 `related_content_id` 확인
2. `GET /api/locations/{content_id}` 호출
3. 성공하면 작성 폼 위에 장소 카드 표시
4. 실패하면 일반 게시글로 전환할지 사용자에게 안내
5. `[연결 해제]` 선택 시 쿼리와 폼 상태에서 ID 제거

프런트가 지도에서 전달받은 장소 객체를 보유하고 있어도 새로고침과 직접 URL 접근을 위해 단건 조회 API를 최종 기준으로 사용한다.

### 11.2 게시글에서 지도 이동

```text
/map?place=2723499
```

지도 화면은 `place` 쿼리를 읽어 해당 마커를 선택하고 정보 패널을 연다. 장소의 좌표가 `null`이면 `[지도에서 보기]` 버튼을 표시하지 않는다.

### 11.3 작성·수정 화면 표시

연결된 장소는 숨겨진 ID만 보관하지 않고 사용자가 확인할 수 있는 카드로 표시한다.

```text
관련 장소
┌──────────────────────────────────┐
│ 레포츠                            │
│ 서울한양도성 백악구간             │
│ 서울특별시 종로구 창의문로 118    │
│                       [연결 해제] │
└──────────────────────────────────┘
```

## 12. FE·BE 책임 분리

### 백엔드

- 서울 JSON 8종 로딩 및 `contentid` 인덱스 생성
- 원본 필드를 `PlaceSummary`로 정규화
- 장소 단건 조회 API 제공
- 게시글 생성·수정 시 장소 존재 검증
- `related_content_id` 저장 및 마이그레이션
- 상세 응답에 `related_place` 조합
- 공통 오류 응답 형식 유지

### 프런트엔드

- 지도 장소 패널의 관련 글쓰기 버튼
- 작성 URL의 `related_content_id` 처리
- 작성·수정 폼의 장소 카드와 연결 해제
- 상세 화면의 관련 장소 카드
- 지도 이동 쿼리 처리
- 로딩, 장소 없음, 연결 데이터 유실 상태 처리

## 13. 오류·예외 시나리오

| 상황 | 백엔드 | 프런트 |
|---|---|---|
| 관련 장소 없이 작성 | 정상 생성 | 일반 게시글 UI |
| 존재하지 않는 장소로 작성 | `404 LOCATION_NOT_FOUND` | 장소 카드 오류, 본문 유지 |
| 장소 좌표 없음 | 연결 허용 | 지도 보기 버튼 숨김 |
| 장소 주소 없음 | 빈 문자열 반환 | `주소 정보 없음` 표시 |
| 장소 이미지 없음 | `image_url: null` | 기본 플레이스홀더 표시 |
| 기존 게시글의 장소가 JSON에서 사라짐 | 게시글 `200`, `related_place: null` | 장소 정보 유실 안내 |
| 잘못된 비밀번호로 장소 변경 | `403 INVALID_PASSWORD` | 수정 내용 유지, 비밀번호만 초기화 |
| 장소 단건 조회 실패 | 공통 오류 응답 | 재시도 또는 연결 해제 제공 |

## 14. 완료 조건

- 장소 없이 기존 게시글 CRUD가 그대로 동작한다.
- 지도에서 선택한 장소로 작성 화면에 진입할 수 있다.
- 작성 화면을 새로고침해도 장소 카드가 복원된다.
- 서버가 존재하지 않는 장소 ID의 저장을 거부한다.
- 장소 연결 게시글의 상세 응답에 `related_place`가 포함된다.
- 수정 시 장소 연결 유지·변경·해제가 모두 동작한다.
- 연결된 장소가 JSON에서 없어져도 게시글 본문은 조회된다.
- 좌표 없는 장소에는 지도 보기 버튼이 노출되지 않는다.
- API 필드명은 모두 `snake_case`로 일관된다.
- 원본 데이터 출처와 라이선스가 화면 또는 프로젝트 문서에 표시된다.

## 15. 구현 순서

```text
1. DB 컬럼 및 마이그레이션
2. 서울 JSON 로더와 contentid 인덱스
3. GET /api/locations/{content_id}
4. POST·PUT 게시글 장소 검증 및 저장
5. GET 게시글 상세 related_place 조합
6. FE 타입과 서비스 함수 변경
7. 지도 → 글쓰기 → 상세 → 지도 사용자 흐름
8. 통합 및 예외 테스트
```

