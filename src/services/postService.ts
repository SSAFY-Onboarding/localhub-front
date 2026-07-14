import type {
  PostCreateInput,
  PostDetail,
  PostListResponse,
  PostUpdateInput,
} from '@/types/posts'
import { ApiError } from '@/types/posts'

interface StoredPost extends PostDetail {
  password: string
}

const STORAGE_KEY = 'localhub_mock_posts'
const delay = (ms = 220) => new Promise((resolve) => window.setTimeout(resolve, ms))

const seedPosts: StoredPost[] = [
  {
    id: 6,
    title: '서울숲 근처 조용한 산책 코스 추천해요',
    content: '서울숲에서 성수동 골목까지 천천히 걷기 좋은 코스입니다. 오후에는 사람이 많아 오전 방문을 추천해요.',
    password: '1234',
    created_at: '2026-07-14T01:20:00Z',
    updated_at: '2026-07-14T01:20:00Z',
  },
  {
    id: 5,
    title: '이번 주말 한강 야외 행사 아시는 분?',
    content: '여의도나 반포 한강공원에서 열리는 야외 행사를 찾고 있습니다. 가족과 함께 갈 만한 곳이면 좋겠습니다.',
    password: '1234',
    created_at: '2026-07-13T08:10:00Z',
    updated_at: '2026-07-13T08:10:00Z',
  },
  {
    id: 4,
    title: '광장시장 평일 오전 방문 후기',
    content: '평일 오전에는 비교적 여유롭게 둘러볼 수 있었습니다. 대중교통으로 방문하는 편이 편리합니다.',
    password: '1234',
    created_at: '2026-07-12T03:40:00Z',
    updated_at: '2026-07-12T03:40:00Z',
  },
  {
    id: 3,
    title: '비 오는 날 가기 좋은 서울 문화시설',
    content: '국립중앙박물관은 실내 동선이 넓고 상설 전시도 풍부해서 비 오는 날 방문하기 좋았습니다.',
    password: '1234',
    created_at: '2026-07-11T05:30:00Z',
    updated_at: '2026-07-11T05:30:00Z',
  },
  {
    id: 2,
    title: '경복궁 주변 반나절 코스 공유합니다',
    content: '경복궁에서 시작해 서촌과 청계천을 잇는 반나절 코스입니다. 편한 신발을 추천합니다.',
    password: '1234',
    created_at: '2026-07-10T02:00:00Z',
    updated_at: '2026-07-10T02:00:00Z',
  },
  {
    id: 1,
    title: 'LocalHub 서울 커뮤니티가 열렸습니다',
    content: '서울의 장소와 행사, 여행 경험을 자유롭게 나눠 주세요. 작성 시 설정한 비밀번호는 수정과 삭제에 필요합니다.',
    password: '1234',
    created_at: '2026-07-09T00:00:00Z',
    updated_at: '2026-07-09T00:00:00Z',
  },
]

function readPosts(): StoredPost[] {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedPosts))
    return structuredClone(seedPosts)
  }
  try {
    return JSON.parse(saved) as StoredPost[]
  } catch {
    return structuredClone(seedPosts)
  }
}

function writePosts(posts: StoredPost[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts))
}

function validate(input: PostCreateInput) {
  const details = []
  const title = input.title.trim()
  const content = input.content.trim()
  if (!title || title.length > 100) details.push({ field: 'title', reason: '제목은 1~100자로 입력해 주세요.' })
  if (!content || content.length > 5000) details.push({ field: 'content', reason: '내용은 1~5000자로 입력해 주세요.' })
  if (input.password.length < 4 || input.password.length > 20 || !input.password.trim()) {
    details.push({ field: 'password', reason: '비밀번호는 공백이 아닌 4~20자로 입력해 주세요.' })
  }
  if (details.length) throw new ApiError('VALIDATION_ERROR', '입력값을 확인해 주세요.', 422, details)
  return { title, content }
}

export const postService = {
  async getPosts(page = 1, size = 10, keyword = ''): Promise<PostListResponse> {
    await delay()
    const normalized = keyword.trim().toLowerCase()
    const posts = readPosts()
      .filter((post) => !normalized || `${post.title} ${post.content}`.toLowerCase().includes(normalized))
      .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
    const total = posts.length
    return {
      items: posts.slice((page - 1) * size, page * size).map(({ id, title, created_at }) => ({ id, title, created_at })),
      page,
      size,
      total,
      total_pages: Math.ceil(total / size),
    }
  },

  async getPost(id: number): Promise<PostDetail> {
    await delay()
    const found = readPosts().find((item) => item.id === id)
    if (!found) throw new ApiError('POST_NOT_FOUND', '해당 게시글을 찾을 수 없습니다.', 404)
    const { password: _password, ...post } = found
    return post
  },

  async createPost(input: PostCreateInput): Promise<PostDetail> {
    await delay()
    const normalized = validate(input)
    const posts = readPosts()
    const now = new Date().toISOString()
    const post: StoredPost = {
      id: Math.max(0, ...posts.map((item) => item.id)) + 1,
      ...normalized,
      password: input.password,
      created_at: now,
      updated_at: now,
    }
    writePosts([post, ...posts])
    const { password: _password, ...detail } = post
    return detail
  },

  async updatePost(id: number, input: PostUpdateInput): Promise<PostDetail> {
    await delay()
    const normalized = validate(input)
    const posts = readPosts()
    const index = posts.findIndex((item) => item.id === id)
    if (index < 0) throw new ApiError('POST_NOT_FOUND', '해당 게시글을 찾을 수 없습니다.', 404)
    const current = posts[index]
    if (!current || current.password !== input.password) throw new ApiError('INVALID_PASSWORD', '비밀번호가 일치하지 않습니다.', 403)
    const updated: StoredPost = { ...current, ...normalized, updated_at: new Date().toISOString() }
    posts[index] = updated
    writePosts(posts)
    const { password: _password, ...detail } = updated
    return detail
  },

  async deletePost(id: number, password: string): Promise<void> {
    await delay()
    const posts = readPosts()
    const target = posts.find((item) => item.id === id)
    if (!target) throw new ApiError('POST_NOT_FOUND', '해당 게시글을 찾을 수 없습니다.', 404)
    if (target.password !== password) throw new ApiError('INVALID_PASSWORD', '비밀번호가 일치하지 않습니다.', 403)
    writePosts(posts.filter((item) => item.id !== id))
  },
}
