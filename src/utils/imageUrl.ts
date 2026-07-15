const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '') ?? ''

export function resolveImageUrl(value?: string | null) {
  const source = value?.trim()
  if (!source) return null
  if (/^(https?:|data:|blob:)/i.test(source)) return source
  if (source.startsWith('//')) return `${window.location.protocol}${source}`
  if (!configuredBaseUrl) return source
  return `${configuredBaseUrl}${source.startsWith('/') ? '' : '/'}${source}`
}
