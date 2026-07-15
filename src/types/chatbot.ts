export interface ChatHistoryItem {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  accommodation_id: string | null
  history: ChatHistoryItem[]
}

export interface RecommendedPlace {
  id: string
  name: string
  category: string
  latitude: number
  longitude: number
  distance: number | null
  address?: string
  image_url?: string
  description?: string
  phone?: string
}

export interface MapCenter {
  latitude: number
  longitude: number
}

export interface ChatResponse {
  answer: string
  places: RecommendedPlace[]
  center: MapCenter | null
  query_type: string
}
