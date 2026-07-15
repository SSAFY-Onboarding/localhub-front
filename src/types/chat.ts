export type ChatRole = 'user' | 'assistant'

export interface ChatHistoryMessage {
  role: ChatRole
  content: string
  place_ids?: string[]
}

export interface RecommendedPlace {
  id: string
  name: string
  category: string
  address: string | null
  latitude: number
  longitude: number
  image_url: string | null
  distance_km: number
  reason: string
}

export interface ChatRequest {
  accommodation_id: string
  message: string
  history: ChatHistoryMessage[]
}

export interface ChatResponse {
  answer: string
  places: RecommendedPlace[]
  suggested_questions: string[]
}

export interface ChatMessage {
  id: number
  role: ChatRole
  content: string
  places?: RecommendedPlace[]
  suggestedQuestions?: string[]
}

export class ChatApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message)
  }
}
