import attraction from '@/assets/place-thumbnails/attraction.svg'
import course from '@/assets/place-thumbnails/course.svg'
import culture from '@/assets/place-thumbnails/culture.svg'
import defaultThumbnail from '@/assets/place-thumbnails/default.svg'
import festival from '@/assets/place-thumbnails/festival.svg'
import food from '@/assets/place-thumbnails/food.svg'
import leisure from '@/assets/place-thumbnails/leisure.svg'
import lodging from '@/assets/place-thumbnails/lodging.svg'
import shopping from '@/assets/place-thumbnails/shopping.svg'

const thumbnails: Record<string, string> = {
  관광지: attraction,
  문화시설: culture,
  축제공연행사: festival,
  여행코스: course,
  레포츠: leisure,
  숙박: lodging,
  쇼핑: shopping,
  음식점: food,
}

export function fallbackPlaceThumbnail(category: string) {
  return thumbnails[category] ?? defaultThumbnail
}
