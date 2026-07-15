# 게시판 REST API 명세

> **범위**: 선정 권역의 단일 익명 커뮤니티 게시판 CRUD, 목록 검색 및 페이지네이션  
> **상태**: MVP 구현 기준 확정안  
> **관련 화면**: `/posts`, `/posts/:id`, `/posts/new`, `/posts/:id/edit`
> **장소 연계 확장**: 단일 관련 장소 연결은 `REST_API_명세_장소연계_초안.md` 합의 후 본 명세에 반영

## 1. MVP 범위

게시판은 회원가입과 로그인 없이 사용하는 단일 익명 게시판이다. 게시글 작성 시 등록한 비밀번호를 수정·삭제 요청 시 서버에서 다시 비교하여 권한을 확인한다.

이번 MVP에서는 다음 기능을 포함하지 않는다.

- 게시글별 작성자
- 여행 일정(`schedule`) 및 게시글 하나의 다중 장소 연결
- 조회수와 추천(좋아요)
- 베스트 정렬
- 별도 비밀번호 사전 검증 API
- 댓글, 이미지, 태그, 북마크
- 게시글별 카테고리

개발의뢰서의 "선정한 1개 권역의 카테고리 게시판"은 MVP에서 선정 권역을 위한 단일 커뮤니티 게시판으로 구현한다. 게시글별 카테고리가 필요해지면 별도 요구사항으로 확장한다.

## 2. 공통 규약

| 항목 | 규약 |
|---|---|
| 로컬 Base URL | `http://localhost:8000` |
| 배포 Base URL | Render에서 발급된 HTTPS URL |
| API Prefix | `/api` |
| 요청·응답 형식 | `application/json; charset=utf-8` |
| JSON 필드명 | `snake_case` |
| 날짜 형식 | ISO 8601 UTC, 예: `2026-07-14T01:00:00Z` |
| 게시글 ID | 1 이상의 정수 |
| 목록 기본 정렬 | `created_at DESC, id DESC` |

프런트엔드는 UTC 날짜를 사용자 로컬 시간대로 변환하여 표시한다.

### 2.1 CORS

백엔드는 환경변수로 허용 Origin을 관리한다.

| 환경 | 허용 Origin 예시 |
|---|---|
| 로컬 | `http://localhost:5173` |
| 배포 | 실제 Netlify 사이트 URL |

- 허용 메서드: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- 허용 요청 헤더: `Content-Type`
- 쿠키 기반 인증을 사용하지 않으므로 Credentials는 허용하지 않는다.

### 2.2 성공 상태 코드

| HTTP | 상황 |
|---:|---|
| `200 OK` | 조회 또는 수정 성공 |
| `201 Created` | 게시글 작성 성공 |
| `204 No Content` | 게시글 삭제 성공 |

`204` 응답에는 본문을 포함하지 않는다.

### 2.3 오류 응답

모든 애플리케이션 오류는 다음 형식을 사용한다.

```json
{
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "해당 게시글을 찾을 수 없습니다.",
    "status": 404,
    "details": []
  }
}
```

| code | HTTP | 의미 |
|---|---:|---|
| `VALIDATION_ERROR` | `422` | Path, Query 또는 Body 검증 실패 |
| `POST_NOT_FOUND` | `404` | 게시글이 존재하지 않음 |
| `INVALID_PASSWORD` | `403` | 수정용 비밀번호 불일치 |
| `INTERNAL_SERVER_ERROR` | `500` | 처리되지 않은 서버 오류 |

입력 검증 실패 시 `details`에 필드별 오류를 제공한다.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "입력값을 확인해 주세요.",
    "status": 422,
    "details": [
      {
        "field": "title",
        "reason": "제목은 필수입니다."
      }
    ]
  }
}
```

FastAPI의 기본 `RequestValidationError` 응답도 전역 예외 처리기를 통해 위 형식으로 변환한다. 운영 환경의 `500` 응답에는 예외 메시지나 스택 트레이스를 노출하지 않는다.

## 3. 데이터 스키마

### 3.1 입력값 정규화 및 검증

| 필드 | 타입 | 필수 | 제약 |
|---|---|:---:|---|
| `title` | string | O | 앞뒤 공백 제거 후 1~100자 |
| `content` | string | O | 앞뒤 공백 제거 후 1~5000자 |
| `password` | string | O | 4~20자, 공백만으로 구성할 수 없음 |

- 알 수 없는 Body 필드는 `422 VALIDATION_ERROR`로 거부한다.
- 필수 필드의 `null`과 빈 문자열은 허용하지 않는다.
- 제목과 내용의 앞뒤 공백은 서버에서도 제거한다.
- `password`는 값 변경을 방지하기 위해 앞뒤 공백을 자동 제거하지 않는다. 단, 공백만으로 구성된 값은 거부한다.

### 3.2 비밀번호 저장 정책

개발의뢰서에 명시된 교육 목적의 의도된 설계에 따라 비밀번호를 **평문으로 저장하고 평문으로 비교**한다. 비밀번호는 모든 API 응답, 로그 및 오류 메시지에서 제외한다.

> 이 방식은 실제 서비스에서 사용해서는 안 된다. 운영 서비스에서는 단방향 비밀번호 해시를 사용해야 한다.

### 3.3 게시글 목록 항목 `PostSummary`

```json
{
  "id": 42,
  "title": "서울 여행 코스 추천 부탁드립니다",
  "created_at": "2026-07-14T01:00:00Z"
}
```

### 3.4 게시글 상세 `PostDetail`

```json
{
  "id": 42,
  "title": "서울 여행 코스 추천 부탁드립니다",
  "content": "한강 주변 여행지를 추천해 주세요.",
  "created_at": "2026-07-14T01:00:00Z",
  "updated_at": "2026-07-14T01:00:00Z"
}
```

## 4. 엔드포인트 요약

| 기능 | 메서드 | 경로 | 성공 |
|---|---|---|---:|
| 목록 조회 및 검색 | `GET` | `/api/posts` | `200` |
| 상세 조회 | `GET` | `/api/posts/{id}` | `200` |
| 작성 | `POST` | `/api/posts` | `201` |
| 수정 | `PUT` | `/api/posts/{id}` | `200` |
| 삭제 | `DELETE` | `/api/posts/{id}` | `204` |

## 5. 상세 명세

### 5.1 게시글 목록 조회 및 검색

```http
GET /api/posts?page=1&size=10&keyword=서울
```

| Query | 타입 | 기본값 | 제약 및 설명 |
|---|---|---|---|
| `page` | integer | `1` | 1 이상 |
| `size` | integer | `10` | 1~100 |
| `keyword` | string | 없음 | 앞뒤 공백 제거 후 제목과 내용에서 부분 검색, 최대 100자 |

검색어를 생략하거나 공백만 전달하면 전체 목록을 반환한다. 존재하는 마지막 페이지를 초과한 요청은 오류가 아니라 빈 목록으로 반환한다.

**200 OK**

```json
{
  "items": [
    {
      "id": 42,
      "title": "서울 여행 코스 추천 부탁드립니다",
      "created_at": "2026-07-14T01:00:00Z"
    }
  ],
  "page": 1,
  "size": 10,
  "total": 42,
  "total_pages": 5
}
```

게시글이 없거나 페이지 범위를 초과하면 다음처럼 응답한다.

```json
{
  "items": [],
  "page": 6,
  "size": 10,
  "total": 42,
  "total_pages": 5
}
```

**오류**

- `422 VALIDATION_ERROR`: 잘못된 `page`, `size` 또는 너무 긴 검색어

### 5.2 게시글 상세 조회

```http
GET /api/posts/{id}
```

상세 조회는 서버 상태를 변경하지 않는다.

**200 OK**: `PostDetail`

**오류**

- `404 POST_NOT_FOUND`
- `422 VALIDATION_ERROR`: `id`가 양의 정수가 아님

### 5.3 게시글 작성

```http
POST /api/posts
Content-Type: application/json
```

**Body `PostCreate`**

```json
{
  "title": "서울 여행 코스 추천 부탁드립니다",
  "content": "한강 주변 여행지를 추천해 주세요.",
  "password": "1234"
}
```

**201 Created**

- 응답 헤더: `Location: /api/posts/43`
- 응답 본문: 생성된 `PostDetail`

**오류**

- `422 VALIDATION_ERROR`

### 5.4 게시글 수정

```http
PUT /api/posts/{id}
Content-Type: application/json
```

`PUT`은 수정 가능한 게시글 필드 전체를 교체한다. 제목과 내용, 비밀번호를 모두 전달해야 하며 `id`, `created_at`은 변경하지 않는다. 서버는 이 요청에서 비밀번호를 직접 비교하므로 별도 `/verify` API를 사용하지 않는다.

**Body `PostUpdate`**

```json
{
  "title": "수정된 제목",
  "content": "수정된 내용입니다.",
  "password": "1234"
}
```

**200 OK**: 수정된 `PostDetail`

**오류**

- `403 INVALID_PASSWORD`
- `404 POST_NOT_FOUND`
- `422 VALIDATION_ERROR`

### 5.5 게시글 삭제

```http
DELETE /api/posts/{id}
Content-Type: application/json
```

**Body `PostDelete`**

```json
{
  "password": "1234"
}
```

**204 No Content**: 본문 없음

**오류**

- `403 INVALID_PASSWORD`
- `404 POST_NOT_FOUND`
- `422 VALIDATION_ERROR`

프런트와 FastAPI의 현재 구성에서는 DELETE 요청 본문을 사용한다. 배포 환경의 프록시가 DELETE 본문을 전달하지 않는 문제가 확인될 경우에만 `POST /api/posts/{id}/delete`로 변경하며, 프런트와 백엔드 명세를 동시에 수정한다.

## 6. Pydantic 스키마 매핑

| 역할 | 권장 클래스 |
|---|---|
| 작성 요청 | `PostCreate` |
| 수정 요청 | `PostUpdate` |
| 삭제 요청 | `PostDelete` |
| 목록 항목 | `PostSummary` |
| 목록 응답 | `PostListResponse` |
| 상세 응답 | `PostDetail` |
| 필드 오류 | `ErrorDetail` |
| 오류 응답 | `ErrorResponse` |

모든 요청 스키마는 알 수 없는 필드를 거부하도록 설정한다. 데이터베이스 모델의 비밀번호 필드는 응답 스키마에 포함하지 않는다.

## 7. 완료 조건

- 목록은 최신순으로 일관되게 정렬된다.
- 목록의 빈 상태와 페이지 범위 초과가 `200`으로 처리된다.
- 생성 응답은 `201`과 `Location` 헤더를 반환한다.
- 잘못된 비밀번호로 수정·삭제할 수 없다.
- 존재하지 않는 게시글은 `404`를 반환한다.
- 모든 검증 오류가 통일된 `422` 형식으로 반환된다.
- 비밀번호가 API 응답과 서버 로그에 노출되지 않는다.
- 삭제 성공 응답은 본문 없는 `204`이다.
- 로컬 Vite와 배포 Netlify Origin에서 CORS가 정상 동작한다.
