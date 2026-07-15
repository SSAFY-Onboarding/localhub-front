import { ApiError } from '@/types/posts'
import type { ChatRequest, ChatResponse } from '@/types/chatbot'

const configuredBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ||
  'http://127.0.0.1:8000'

function apiBaseUrl() {
  return configuredBaseUrl.endsWith('/api')
    ? configuredBaseUrl
    : `${configuredBaseUrl}/api`
}

export const chatService = {
  async sendMessage(
    payload: ChatRequest,
    signal?: AbortSignal,
  ): Promise<ChatResponse> {
    let response: Response

    try {
      response = await fetch(`${apiBaseUrl()}/chat`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      throw new ApiError(
        'NETWORK_ERROR',
        '챗봇 서버에 연결할 수 없습니다.',
        0,
      )
    }

    if (!response.ok) {
      let message =
        response.status >= 500
          ? '챗봇 서버 내부에서 오류가 발생했습니다.'
          : `챗봇 요청에 실패했습니다. (${response.status})`

      try {
        const body = (await response.json()) as {
          detail?:
            | string
            | Array<{
                loc?: Array<string | number>
                msg?: string
              }>
          message?: string
        }

        if (typeof body.detail === 'string') {
          message = body.detail
        } else if (Array.isArray(body.detail)) {
          message = body.detail
            .map((item) => {
              const location = item.loc?.slice(1).join('.')
              return location
                ? `${location}: ${item.msg ?? '입력값 오류'}`
                : item.msg ?? '입력값 오류'
            })
            .join(' / ')
        } else if (body.message) {
          message = body.message
        }
      } catch {
        // JSON이 아닌 500 응답은 기본 문구 사용
      }

      throw new ApiError('HTTP_ERROR', message, response.status)
    }

    return response.json() as Promise<ChatResponse>
  },
}
