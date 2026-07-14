import type {
  LikeResponse,
  PostCreateInput,
  PostDetail,
  PostListResponse,
  PostUpdateInput,
} from '@/types/posts'
import { ApiError, type FieldError } from '@/types/posts'

interface ErrorBody {
  error?: {
    code?: string
    message?: string
    status?: number
    details?: FieldError[]
  }
  detail?: string | Array<{
    loc?: Array<string | number>
    msg?: string
  }>
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')

function getApiBaseUrl() {
  if (!configuredBaseUrl) {
    throw new ApiError(
      'API_BASE_URL_MISSING',
      'VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.',
      0,
    )
  }
  return configuredBaseUrl.endsWith('/api') ? configuredBaseUrl : `${configuredBaseUrl}/api`
}

function validationDetails(detail: ErrorBody['detail']): FieldError[] {
  if (!Array.isArray(detail)) return []
  return detail.map((item) => ({
    field: String(item.loc?.at(-1) ?? 'request'),
    reason: item.msg ?? '입력값을 확인해 주세요.',
  }))
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch {
    throw new ApiError(
      'NETWORK_ERROR',
      '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
      0,
    )
  }

  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') ?? ''
  const body = contentType.includes('application/json')
    ? ((await response.json()) as ErrorBody & T)
    : null

  if (!response.ok) {
    const fastApiDetails = validationDetails(body?.detail)
    const fastApiMessage = typeof body?.detail === 'string' ? body.detail : undefined
    throw new ApiError(
      body?.error?.code ?? (response.status === 422 ? 'VALIDATION_ERROR' : 'HTTP_ERROR'),
      body?.error?.message ?? fastApiMessage ?? '요청을 처리하지 못했습니다.',
      response.status,
      body?.error?.details ?? fastApiDetails,
    )
  }

  if (!body) {
    throw new ApiError('INVALID_RESPONSE', '서버 응답 형식이 올바르지 않습니다.', response.status)
  }
  return body as T
}

export const postService = {
  async getPosts(page = 1, size = 10, keyword = ''): Promise<PostListResponse> {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (keyword.trim()) params.set('keyword', keyword.trim())
    return request<PostListResponse>(`/posts?${params.toString()}`)
  },

  async getPost(id: number): Promise<PostDetail> {
    return request<PostDetail>(`/posts/${id}`)
  },

  createPost(input: PostCreateInput): Promise<PostDetail> {
    return request<PostDetail>('/posts', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },

  updatePost(id: number, input: PostUpdateInput): Promise<PostDetail> {
    return request<PostDetail>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },

  deletePost(id: number, password: string): Promise<void> {
    return request<void>(`/posts/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    })
  },

  likePost(id: number): Promise<LikeResponse> {
    return request<LikeResponse>(`/posts/${id}/like`, { method: 'POST' })
  },
}
