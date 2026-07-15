export interface PostSummary {
  id: number
  title: string
  like_count: number
  view_count: number
  created_at: string
}

export interface PostDetail extends PostSummary {
  content: string
  updated_at: string | null
  schedule: ScheduleItem[]
}

export interface ScheduleItem {
  day: number
  order: number
  place_id: string
  name: string
  type: string
  lat: number | null
  lng: number | null
  image_url: string | null
  time: string | null
  memo: string | null
}

export interface PostListResponse {
  items: PostSummary[]
  page: number
  size: number
  total: number
  total_pages: number
}

export interface PostCreateInput {
  title: string
  content: string
  password: string
  schedule: ScheduleItem[]
}

export type PostUpdateInput = PostCreateInput

export interface LikeResponse {
  id: number
  like_count: number
}

export interface FieldError {
  field: string
  reason: string
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details: FieldError[] = [],
  ) {
    super(message)
  }
}
