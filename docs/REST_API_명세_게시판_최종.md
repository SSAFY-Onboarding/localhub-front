# 게시판 REST API 명세

> **상태**: 현재 백엔드 `master` 구현 기준 As-Is 확정 명세
>
> **범위**: 익명 게시글 CRUD, 검색·정렬·페이지네이션, 여행 일정, 조회수, 추천, 비밀번호 검증
>
> **관련 화면**: `/posts`, `/posts/:id`, `/posts/new`, `/posts/:id/edit`

## 1. 공통 규약

| 항목 | 규약 |
| --- | --- |
| 로컬 Base URL | `http://localhost:8000` |
| API Prefix | `/api` |
| 요청·응답 형식 | `application/json; charset=utf-8` |
| JSON 필드명 | `snake_case` |
| 날짜 형식 | ISO 8601. 현재 응답은 UTC 기준이지만 `Z`나 오프셋을 붙이지 않음 |
| 게시글 ID | 1 이상의 정수 |
| 기본 작성자 | 서버에서 `anonymous`로 고정하며 API에 노출하지 않음 |

### 1.1 CORS

허용 Origin은 백엔드 환경변수로 관리한다. 현재 서버 설정은 Credentials를 허용하고, 요청 메서드와 헤더를 모두 허용한다. 프런트와 백엔드의 실제 배포 Origin을 허용 목록에 등록해야 한다.

### 1.2 성공 상태 코드

| HTTP | 상황 |
| ---: | --- |
| `200 OK` | 조회, 수정, 비밀번호 검증 또는 추천 성공 |
| `201 Created` | 게시글 작성 성공 |
| `204 No Content` | 게시글 삭제 성공 |

`204` 응답에는 본문을 포함하지 않는다.

### 1.3 오류 응답

```json
{
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "해당 게시글을 찾을 수 없습니다.",
    "status": 404
  }
}
```

| code | HTTP | 의미 |
| --- | ---: | --- |
| `VALIDATION_ERROR` | `422` | Path, Query 또는 Body 검증 실패 |
| `POST_NOT_FOUND` | `404` | 게시글이 존재하지 않음 |
| `INVALID_PASSWORD` | `403` | 비밀번호 불일치 |

`details`는 `VALIDATION_ERROR`에만 포함되며 필드와 원인 목록을 제공한다. 현재 등록된 공통 핸들러는 위 세 오류 유형을 정규화하며, 처리되지 않은 `500` 오류를 별도 `INTERNAL_SERVER_ERROR` 객체로 변환하는 핸들러는 아직 없다.

## 2. 데이터 스키마

### 2.1 공통 입력 필드

| 필드 | 타입 | 필수 | 제약 |
| --- | --- | :---: | --- |
| `title` | string | O | 1~100자 |
| `content` | string | O | 1~5000자 |
| `password` | string | O | 4~20자 |
| `schedule` | array \| null | X | 여행 일정. 생략 또는 `null` 가능 |

알 수 없는 요청 필드는 검증 오류로 거부한다. 작성자 필드는 요청받지 않으며 서버 내부에서 익명 작성자로 처리한다.

### 2.2 비밀번호 저장 정책

비밀번호 원문은 저장하지 않는다. 서버는 임의의 16바이트 salt와 PBKDF2-HMAC-SHA256 100,000회 반복으로 해시를 만들고 다음 형식으로 저장한다.

```text
<salt_hex>$<hash_hex>
```

수정·삭제·검증 요청에서는 같은 방식으로 계산한 값을 상수 시간 비교한다. 비밀번호와 해시 값은 모든 API 응답에서 제외한다.

### 2.3 `ScheduleItem`

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
  "memo": "한복 체험",
  "image_url": "https://example.com/gyeongbokgung.jpg"
}
```

| 필드 | 타입 | 필수 | 설명 |
| --- | --- | :---: | --- |
| `day` | integer | O | 1 이상 |
| `order` | integer | O | 1 이상 |
| `place_id` | string | O | 장소 복합 ID |
| `name` | string | O | 장소명 |
| `type` | string | O | 장소 유형 |
| `lat` | number \| null | X | 위도 |
| `lng` | number \| null | X | 경도 |
| `time` | string \| null | X | 방문 시간 |
| `memo` | string \| null | X | 메모 |
| `image_url` | string \| null | X | 장소 썸네일 URL |

### 2.4 `PostSummary`

```json
{
  "id": 42,
  "title": "서울 1박 2일 코스",
  "created_at": "2026-07-14T01:00:00",
  "view_count": 128,
  "like_count": 15,
  "cover_image_url": "https://example.com/gyeongbokgung.jpg"
}
```

`cover_image_url`은 일정의 첫 항목에 `image_url`이 있을 때 해당 값을 사용하며, 없으면 `null`이다.

### 2.5 `PostDetail`

```json
{
  "id": 42,
  "title": "서울 1박 2일 코스",
  "content": "경복궁부터 한강까지 여행합니다.",
  "schedule": [],
  "created_at": "2026-07-14T01:00:00",
  "updated_at": "2026-07-14T01:00:00",
  "view_count": 129,
  "like_count": 15
}
```

## 3. 엔드포인트 요약

| 기능 | 메서드 | 경로 | 성공 |
| --- | --- | --- | ---: |
| 목록 조회·검색·정렬 | `GET` | `/api/posts` | `200` |
| 상세 조회 및 조회수 증가 | `GET` | `/api/posts/{id}` | `200` |
| 작성 | `POST` | `/api/posts` | `201` |
| 비밀번호 사전 검증 | `POST` | `/api/posts/{id}/verify` | `200` |
| 수정 | `PUT` | `/api/posts/{id}` | `200` |
| 삭제 | `DELETE` | `/api/posts/{id}` | `204` |
| 추천 수 증가 | `POST` | `/api/posts/{id}/like` | `200` |

## 4. 상세 명세

### 4.1 게시글 목록 조회

```http
GET /api/posts?page=1&size=10&keyword=서울&sort=likes
```

| Query | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `page` | integer | `1` | 1 이상 |
| `size` | integer | `10` | 1~100 |
| `keyword` | string | 없음 | 최대 100자. 제목·내용·내부 작성자에서 부분 검색 |
| `sort` | string | 없음 | 값이 `likes`이면 추천순, 그 외에는 최신순 |
| `author` | string | 없음 | 내부 작성자 필터. 현재 익명 작성자만 사용 |

기본 정렬은 `created_at DESC, id DESC`이다. `sort=likes`이면 추천 수를 우선해 정렬한다.

**200 OK**

```json
{
  "items": [
    {
      "id": 42,
      "title": "서울 1박 2일 코스",
      "created_at": "2026-07-14T01:00:00",
      "view_count": 128,
      "like_count": 15,
      "cover_image_url": null
    }
  ],
  "page": 1,
  "size": 10,
  "total": 1,
  "total_pages": 1
}
```

게시글이 하나도 없으면 `total_pages`는 `0`이며, 범위를 벗어난 페이지도 빈 `items`와 함께 `200`을 반환한다.

### 4.2 게시글 상세 조회

```http
GET /api/posts/{id}
```

요청할 때마다 DB의 `view_count`를 1 증가시킨 뒤 증가된 값을 포함한 `PostDetail`을 반환한다.

**오류**: `404 POST_NOT_FOUND`, `422 VALIDATION_ERROR`

### 4.3 게시글 작성

```http
POST /api/posts
Content-Type: application/json
```

```json
{
  "title": "서울 1박 2일 코스",
  "content": "경복궁부터 한강까지 여행합니다.",
  "password": "1234",
  "schedule": [
    {
      "day": 1,
      "order": 1,
      "place_id": "12-126508",
      "name": "경복궁",
      "type": "관광지",
      "lat": 37.5796,
      "lng": 126.977,
      "time": "10:00",
      "memo": null,
      "image_url": null
    }
  ]
}
```

**201 Created**

- `Location: /api/posts/{생성된 ID}` 응답 헤더
- 생성된 `PostDetail` 응답 본문

### 4.4 비밀번호 사전 검증

```http
POST /api/posts/{id}/verify
Content-Type: application/json
```

```json
{ "password": "1234" }
```

**200 OK**

```json
{ "ok": true }
```

이 API는 수정 화면 진입 전 UX를 위한 사전 검증이다. 수정과 삭제 API도 비밀번호를 다시 검증하므로 이 응답을 권한 토큰처럼 사용하지 않는다.

### 4.5 게시글 수정

```http
PUT /api/posts/{id}
Content-Type: application/json
```

```json
{
  "title": "수정된 제목",
  "content": "수정된 내용",
  "password": "1234",
  "schedule": []
}
```

`PUT`은 제목, 내용, 일정 전체를 교체한다. `schedule`을 생략하거나 `null`로 보내면 기존 일정을 제거한다. 성공하면 수정된 `PostDetail`을 반환한다.

**오류**: `403 INVALID_PASSWORD`, `404 POST_NOT_FOUND`, `422 VALIDATION_ERROR`

### 4.6 게시글 삭제

```http
DELETE /api/posts/{id}
Content-Type: application/json
```

```json
{ "password": "1234" }
```

**204 No Content**: 본문 없음

**오류**: `403 INVALID_PASSWORD`, `404 POST_NOT_FOUND`, `422 VALIDATION_ERROR`

### 4.7 게시글 추천

```http
POST /api/posts/{id}/like
Content-Length: 0
```

- 요청 본문과 인증 정보를 사용하지 않는다.
- 요청할 때마다 별도 검증 없이 `like_count`를 1 증가시킨다.
- 같은 사용자의 반복 요청도 허용한다.
- 성공 응답은 증가된 추천 수를 포함한 전체 `PostDetail`이다.

**오류**: `404 POST_NOT_FOUND`, `422 VALIDATION_ERROR`

## 5. 현재 구현 제약

- 로그인과 사용자 식별이 없어 추천 중복을 제한하지 않는다.
- 상세 조회 요청은 모두 조회수를 증가시키므로 새로고침, 수정 화면의 재조회 등도 조회수에 포함될 수 있다.
- 일정은 게시글 레코드의 JSON 데이터로 저장하며 장소 원본 데이터 변경과 자동 동기화하지 않는다.
- 추천 수 증가는 현재 읽기 후 증가·저장 방식이므로 높은 동시성에서 원자적 증가를 보장하는 별도 SQL 갱신으로 개선할 여지가 있다.
- `author` Query는 백엔드 호환 필드로 남아 있지만 현재 프런트에서 작성자 입력·표시 기능은 제공하지 않는다.

## 6. 완료 조건

- 목록과 상세 응답에 조회수·추천 수가 포함된다.
- 일정이 있는 글은 작성·조회·수정 시 `schedule`을 유지한다.
- 상세 조회 시 조회수가 증가한다.
- 추천 요청 시 추천 수가 증가하고 전체 상세 응답을 반환한다.
- 비밀번호는 해시로 저장되고 API 응답에 노출되지 않는다.
- 사전 검증과 수정·삭제의 비밀번호 재검증이 모두 동작한다.
- 생성은 `201`과 `Location`, 삭제는 본문 없는 `204`를 반환한다.
- 오류 응답이 공통 `error` 객체 형식을 따른다.
