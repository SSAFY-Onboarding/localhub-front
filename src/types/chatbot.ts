export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  accommodation_id: number
  history: ChatHistoryItem[]
}
export interface RecommendedPlace {
  id: string
  name: string
  category: string
  latitude: number
  longitude: number
  distance: number
}

export interface ChatResponse {
  answer: string
  places: RecommendedPlace[]
}
