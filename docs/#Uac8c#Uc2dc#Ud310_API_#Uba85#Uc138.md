# 게시판 REST API 명세 초안

> **범위**: 커뮤니티 게시판(여행 일정 공유) CRUD + 추천 + 비밀번호 권한 확인
> **연동 코드**: `app/models/post.py`, `app/schemas/post.py` 와 1:1 일치
> **상태**: 초안 (Day1 설계 단계) — places/chat 명세는 별도 확장

---

## 1. 공통 규약

| 항목 | 값 |
|---|---|
| Base URL (로컬) | `http://localhost:8000` |
| Base URL (배포) | Render 발급 URL |
| API Prefix | `/api` |
| 요청/응답 | `application/json`, UTF-8 |
| 날짜 포맷 | ISO 8601 (서버 저장은 UTC, 표시는 KST 변환) |

### 1.1 성공 상태 코드
| 코드 | 상황 |
|---|---|
| 200 | 조회/수정/추천/검증 성공 |
| 201 | 게시글 생성 (`Location` 헤더 포함) |
| 204 | 삭제 성공 (본문 없음) |

### 1.2 에러 응답 (전역 통일)
```json
{ "error": { "code": "POST_NOT_FOUND", "message": "해당 게시글을 찾을 수 없습니다.", "status": 404 } }
```
| code | HTTP | 의미 |
|---|:---:|---|
| `VALIDATION_ERROR` | 422 | 입력값 검증 실패 |
| `POST_NOT_FOUND` | 404 | 게시글 없음 |
| `INVALID_PASSWORD` | 403 | 비밀번호 불일치 |

### 1.3 페이지네이션
| 파라미터 | 기본 | 제약 |
|---|---|---|
| page | 1 | ≥ 1 |
| size | 10 | 1 ~ 100 |

응답 래퍼:
```json
{ "items": [ ... ], "page": 1, "size": 10, "total": 42, "total_pages": 5 }
```

---

## 2. 엔드포인트 목록

| # | 기능 | 메서드 | 경로 | 성공 |
|---|---|---|---|---|
| 1 | 목록 조회 | GET | `/api/posts` | 200 |
| 2 | 상세 조회 | GET | `/api/posts/{id}` | 200 |
| 3 | 작성 | POST | `/api/posts` | 201 |
| 4 | 비밀번호 확인 | POST | `/api/posts/{id}/verify` | 200 |
| 5 | 수정 | PUT | `/api/posts/{id}` | 200 |
| 6 | 삭제 | DELETE | `/api/posts/{id}` | 204 |
| 7 | 추천 | POST | `/api/posts/{id}/like` | 200 |

---

## 3. 상세 명세

### 3.1 게시글 목록 조회
```
GET /api/posts
```
**Query**
| 파라미터 | 타입 | 기본 | 설명 |
|---|---|---|---|
| page | int | 1 | 페이지 번호 |
| size | int | 10 | 페이지 크기 |
| keyword | str | - | 검색어 |
| search_type | str | `title` | `title` \| `content` \| `title_content` \| `author` |
| sort | str | `latest` | `latest`(최신순) \| `best`(추천순=베스트 탭) |

**200 OK** — 목록은 경량(`PostSummary`), 본문·일정 제외
```json
{
  "items": [
    { "id": 42, "title": "서울 1박2일 코스", "author": "서울러",
      "view_count": 128, "like_count": 15, "created_at": "2026-07-14T10:00:00" }
  ],
  "page": 1, "size": 10, "total": 42, "total_pages": 5
}
```

---

### 3.2 게시글 상세 조회
```
GET /api/posts/{id}
```
- 조회 시 `view_count` +1
- 일정(`schedule`)은 타임라인 UI로 렌더

**200 OK** (`PostDetail`, `password_hash` 미포함)
```json
{
  "id": 42,
  "title": "서울 1박2일 코스",
  "content": "경복궁부터 한강까지...",
  "author": "서울러",
  "schedule": [
    { "day": 1, "order": 1, "place_id": "A001", "name": "경복궁",
      "type": "관광지", "lat": 37.5796, "lng": 126.9770, "time": "10:00", "memo": "한복 산책" },
    { "day": 1, "order": 2, "place_id": "F014", "name": "광장시장",
      "type": "쇼핑", "lat": 37.5700, "lng": 126.9996, "time": "12:30", "memo": "" }
  ],
  "view_count": 129,
  "like_count": 15,
  "created_at": "2026-07-14T10:00:00",
  "updated_at": "2026-07-14T10:00:00"
}
```
**404** `POST_NOT_FOUND`

---

### 3.3 게시글 작성
```
POST /api/posts
```
**Body** (`PostCreate`)
```json
{
  "title": "서울 1박2일 코스",
  "content": "경복궁부터 한강까지...",
  "author": "서울러",
  "password": "1234",
  "schedule": [
    { "day": 1, "order": 1, "place_id": "A001", "name": "경복궁",
      "type": "관광지", "lat": 37.5796, "lng": 126.9770, "time": "10:00", "memo": "한복 산책" }
  ]
}
```
| 필드 | 필수 | 제약 |
|---|:---:|---|
| title | O | 1~100자 |
| content | O | 1자 이상 |
| author | O | 1~30자 |
| password | O | 4~20자 (해시 저장, 응답 미포함) |
| schedule | X | 일정 배열 (없으면 `[]`) |

**201 Created** → `Location: /api/posts/43`, 본문은 `PostDetail`
**422** `VALIDATION_ERROR`

---

### 3.4 비밀번호 확인 (수정 진입 전)
```
POST /api/posts/{id}/verify
```
프론트에서 "수정" 클릭 시 모달로 검증 → 통과하면 수정 화면 진입.
**Body**
```json
{ "password": "1234" }
```
**200 OK**
```json
{ "verified": true }
```
**403** `INVALID_PASSWORD` / **404** `POST_NOT_FOUND`

---

### 3.5 게시글 수정
```
PUT /api/posts/{id}
```
서버에서 비밀번호를 **재검증**한다 (verify만 믿지 않음).
**Body** (`PostUpdate`)
```json
{
  "title": "서울 1박2일 코스 (수정)",
  "content": "일정 보강",
  "password": "1234",
  "schedule": [ ... ]
}
```
**200 OK** → `PostDetail`
**403** `INVALID_PASSWORD` / **404** `POST_NOT_FOUND` / **422** `VALIDATION_ERROR`

---

### 3.6 게시글 삭제
```
DELETE /api/posts/{id}
```
**Body**
```json
{ "password": "1234" }
```
**204 No Content** (본문 없음)
**403** `INVALID_PASSWORD` / **404** `POST_NOT_FOUND`

---

### 3.7 게시글 추천 (좋아요)
```
POST /api/posts/{id}/like
```

- 요청 Body와 인증 정보는 사용하지 않는다.
- 요청할 때마다 별도 검증 없이 `like_count`를 1 증가시킨다.
- 동일 사용자의 반복 추천과 연속 추천을 허용한다.
- 프런트는 요청 처리 중에만 버튼을 비활성화하며, 완료 후 다시 추천할 수 있다.

```http
POST /api/posts/42/like
Content-Length: 0
```

**200 OK**
```json
{ "id": 42, "like_count": 16 }
```

**오류**

- **404** `POST_NOT_FOUND`
- **422** `VALIDATION_ERROR`: 게시글 ID가 양의 정수가 아님

동시 요청에서도 증가 값이 유실되지 않도록 DB에서 원자적으로 증가시킨다.

```sql
UPDATE posts
SET like_count = like_count + 1
WHERE id = :post_id;
```

`posts.like_count`의 기본값은 `0`이며 음수가 될 수 없다. 목록 응답 `PostSummary`와 상세 응답 `PostDetail`은 항상 `like_count`를 포함한다.

> 인증 및 사용자 식별이 없는 교육용 MVP 기능이다. 중복 추천을 허용하므로 추천 수를 사용자별 선호도나 신뢰 가능한 통계로 해석하지 않는다.

---

## 4. 스키마 ↔ 코드 매핑

| API 스키마 | Pydantic 클래스 | 위치 |
|---|---|---|
| 작성 요청 | `PostCreate` | `app/schemas/post.py` |
| 수정 요청 | `PostUpdate` | 〃 |
| 비번 확인 | `PasswordVerify` | 〃 |
| 목록 응답 | `PostSummary` + `PostListResponse` | 〃 |
| 상세 응답 | `PostDetail` | 〃 |
| 일정 항목 | `ScheduleItem` | 〃 |
| 추천 응답 | `LikeResponse` | 〃 |

> **다음 단계(Day1~2)**: 위 명세를 구현하는 `app/api/posts.py`(라우터) + `app/services/post_service.py`(로직). 이어서 `places`, `chat` 명세/구현.
