export const categoryColors: Record<string, string> = {
  관광지: '#3f6ee8',
  문화시설: '#7358d8',
  축제공연행사: '#a94fc4',
  여행코스: '#168fa8',
  레포츠: '#277fc4',
  숙박: '#52669f',
  쇼핑: '#a84f91',
}

const categoryIconPaths: Record<string, string> = {
  관광지:
    'M9 3 7.2 5H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.2L15 3H9Zm3 14a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z',
  문화시설: 'M12 2 2 8v2h20V8L12 2ZM5 12v7H3v3h18v-3h-2v-7h-3v7h-2v-7h-4v7H8v-7H5Z',
  축제공연행사: 'M16 3v10.6a4 4 0 1 0 2 3.4V7h4V3h-6ZM8 9v6.6a4 4 0 1 0 2 3.4V9H8Z',
  여행코스:
    'M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm12 12a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM5 11v1a6 6 0 0 0 6 6h2v-2h-2a4 4 0 0 1-4-4v-1H5Zm8-5v2h4v4h2V6h-6Z',
  레포츠:
    'M18 2H6v2H3v4a5 5 0 0 0 5 5h1v4H6v2h12v-2h-3v-4h1a5 5 0 0 0 5-5V4h-3V2ZM8 11a3 3 0 0 1-3-3V6h1v5h2Zm8 0H8V4h8v7Zm3-3a3 3 0 0 1-3 3V6h3v2Z',
  숙박: 'M4 11V6h4a4 4 0 0 1 4 4v1h8a2 2 0 0 1 2 2v6h-2v-2H4v2H2V5h2v6Zm2-3v3h4v-1a2 2 0 0 0-2-2H6Zm-2 5v2h16v-2H4Z',
  쇼핑: 'M7 7V6a5 5 0 0 1 10 0v1h3l1 14H3L4 7h3Zm2 0h6V6a3 3 0 0 0-6 0v1Zm0 4H7v2h2v-2Zm8 0h-2v2h2v-2Z',
}

const fallbackIconPath =
  'M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 10a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z'

export function categoryColor(category: string) {
  return categoryColors[category] ?? '#3659d9'
}

export function categoryIconPath(category: string) {
  return categoryIconPaths[category] ?? fallbackIconPath
}

export function categoryMarkerIconSvg(category: string) {
  const path = categoryIconPath(category)
  return `<svg class="map-marker-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${path}"></path></svg>`
}
