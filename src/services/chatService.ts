import { ChatApiError, type ChatRequest, type ChatResponse } from '@/types/chat'

interface ErrorBody {
  error?: { code?: string; message?: string; status?: number }
  detail?: string
}

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')

function apiBaseUrl() {
  if (!configuredBaseUrl)
    throw new ChatApiError(
      'API_BASE_URL_MISSING',
      'VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.',
      0,
    )
  return configuredBaseUrl.endsWith('/api') ? configuredBaseUrl : `${configuredBaseUrl}/api`
}

export const chatService = {
  async send(input: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    let response: Response
    try {
      response = await fetch(`${apiBaseUrl()}/chat`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      throw new ChatApiError(
        'NETWORK_ERROR',
        '챗봇 서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
        0,
      )
    }

    const contentType = response.headers.get('content-type') ?? ''
    const body = contentType.includes('application/json')
      ? ((await response.json()) as ChatResponse & ErrorBody)
      : null
    if (!response.ok) {
      throw new ChatApiError(
        body?.error?.code ?? 'HTTP_ERROR',
        body?.error?.message ??
          (typeof body?.detail === 'string' ? body.detail : '답변을 불러오지 못했습니다.'),
        response.status,
      )
    }
    if (!body) throw new ChatApiError('INVALID_RESPONSE', '챗봇 응답 형식이 올바르지 않습니다.', 0)
    return body
  },
}
