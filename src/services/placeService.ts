import { mockPlaces } from '@/mocks/places'
import { ApiError } from '@/types/posts'
import type {
  Place,
  PlaceCategoryResponse,
  PlaceListResponse,
  PlaceSearchParams,
} from '@/types/places'

const useMock = import.meta.env.VITE_USE_PLACE_MOCK === 'true'
const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '')

function apiBaseUrl() {
  if (!configuredBaseUrl)
    throw new ApiError(
      'API_BASE_URL_MISSING',
      'VITE_API_BASE_URL 환경변수가 설정되지 않았습니다.',
      0,
    )
  return configuredBaseUrl.endsWith('/api') ? configuredBaseUrl : `${configuredBaseUrl}/api`
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl()}${path}`, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('NETWORK_ERROR', '장소 서버에 연결할 수 없습니다.', 0)
  }
  if (!response.ok)
    throw new ApiError('HTTP_ERROR', '장소 정보를 불러오지 못했습니다.', response.status)
  return response.json() as Promise<T>
}

function mockSearch(params: PlaceSearchParams): PlaceListResponse {
  const keyword = params.keyword?.trim().toLocaleLowerCase('ko-KR') ?? ''
  const filtered = mockPlaces.filter(
    (place) =>
      (!params.category || place.category === params.category) &&
      (!keyword ||
        `${place.name} ${place.address ?? ''}`.toLocaleLowerCase('ko-KR').includes(keyword)),
  )
  const page = Math.max(1, params.page ?? 1)
  const size = Math.max(1, params.size ?? 6)
  return {
    items: filtered.slice((page - 1) * size, page * size),
    page,
    size,
    total: filtered.length,
    total_pages: Math.ceil(filtered.length / size),
  }
}

export const placeService = {
  isMock: useMock,
  async getCategories(signal?: AbortSignal): Promise<string[]> {
    if (useMock) return [...new Set(mockPlaces.map((place) => place.category))]
    const response = await get<PlaceCategoryResponse>('/places/categories', signal)
    return response.categories
  },
  async getPlaces(params: PlaceSearchParams, signal?: AbortSignal): Promise<PlaceListResponse> {
    if (useMock) return mockSearch(params)
    const query = new URLSearchParams({
      region: params.region ?? '서울',
      page: String(params.page ?? 1),
      size: String(params.size ?? 6),
    })
    if (params.keyword?.trim()) query.set('keyword', params.keyword.trim())
    if (params.category) query.set('category', params.category)
    return get<PlaceListResponse>(`/places?${query}`, signal)
  },
  async getPlace(id: string, signal?: AbortSignal): Promise<Place> {
    if (useMock) {
      const place = mockPlaces.find((item) => item.id === id)
      if (!place) throw new ApiError('PLACE_NOT_FOUND', '장소를 찾을 수 없습니다.', 404)
      return place
    }
    return get<Place>(`/places/${encodeURIComponent(id)}`, signal)
  },
}
