import { ApiError } from '@/types/posts'
import type { ChatRequest, ChatResponse } from '@/types/chatbot'

function chatApiUrl() {
  // 로컬 개발에서는 Vite proxy를 통해 백엔드로 전달합니다.
  // 브라우저가 직접 8000번 포트에 요청하지 않으므로 CORS 문제를 피할 수 있습니다.

  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')

  if (!configuredBaseUrl) {
    throw new ApiError(
      'API_BASE_URL_MISSING',
      'VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.',
      0,
    )
  }

  const apiBaseUrl = configuredBaseUrl.endsWith('/api')
    ? configuredBaseUrl
    : `${configuredBaseUrl}/api`

  return `${apiBaseUrl}/chat`
}

export const chatService = {
  async sendMessage(payload: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
    let response: Response

    try {
      response = await fetch(chatApiUrl(), {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error

      throw new ApiError(
        'NETWORK_ERROR',
        '챗봇 서버에 연결할 수 없습니다. 백엔드가 127.0.0.1:8000에서 실행 중인지 확인해주세요.',
        0,
      )
    }

    if (!response.ok) {
      let message = `챗봇 요청에 실패했습니다. (${response.status})`

      try {
        const body = (await response.json()) as {
          detail?: string | Array<{
            loc?: Array<string | number>
            msg?: string
            type?: string
          }>
          message?: string
        }

        if (typeof body.detail === 'string') {
          message = body.detail
        } else if (Array.isArray(body.detail)) {
          message = body.detail
            .map((item) => {
              const location = item.loc?.join('.') ?? 'request'
              const reason = item.msg ?? item.type ?? '입력값 오류'
              return `${location}: ${reason}`
            })
            .join(' / ')
        } else if (body.message) {
          message = body.message
        }
      } catch {
        // JSON 형식이 아닌 오류 응답에는 상태 코드 메시지를 사용합니다.
      }

      throw new ApiError('HTTP_ERROR', message, response.status)
    }

    return response.json() as Promise<ChatResponse>
  },
}
