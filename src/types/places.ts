export interface Place {
  id: string
  name: string
  category: string
  address: string | null
  latitude: number | null
  longitude: number | null
  image_url: string | null
  description: string | null
  phone: string | null
}

export interface PlaceListResponse {
  items: Place[]
  page: number
  size: number
  total: number
  total_pages: number
}

export interface PlaceCategoryResponse {
  categories: string[]
}

export interface PlaceSearchParams {
  keyword?: string
  category?: string
  region?: string
  page?: number
  size?: number
}
