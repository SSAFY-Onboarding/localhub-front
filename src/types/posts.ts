export interface PostSummary {
  id: number
  title: string
  created_at: string
}

export interface PostDetail extends PostSummary {
  content: string
  updated_at: string
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
}

export type PostUpdateInput = PostCreateInput

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
