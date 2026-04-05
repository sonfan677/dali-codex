export const ACTIVITY_CATEGORY_LABEL_MAP = {
  sport: '运动',
  music: '音乐',
  reading: '读书',
  game: '游戏',
  social: '社交',
  outdoor: '户外',
  food: '美食',
  movie: '电影',
  travel: '旅行',
  other: '其他',
}

export const DISCOVERY_CATEGORY_FILTER_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'hot', label: '热门' },
  { id: 'official', label: '官方推荐' },
  { id: 'sport', label: ACTIVITY_CATEGORY_LABEL_MAP.sport },
  { id: 'music', label: ACTIVITY_CATEGORY_LABEL_MAP.music },
  { id: 'reading', label: ACTIVITY_CATEGORY_LABEL_MAP.reading },
  { id: 'game', label: ACTIVITY_CATEGORY_LABEL_MAP.game },
  { id: 'social', label: ACTIVITY_CATEGORY_LABEL_MAP.social },
  { id: 'outdoor', label: ACTIVITY_CATEGORY_LABEL_MAP.outdoor },
  { id: 'food', label: ACTIVITY_CATEGORY_LABEL_MAP.food },
  { id: 'movie', label: ACTIVITY_CATEGORY_LABEL_MAP.movie },
  { id: 'travel', label: ACTIVITY_CATEGORY_LABEL_MAP.travel },
  { id: 'other', label: ACTIVITY_CATEGORY_LABEL_MAP.other },
]

export const ACTIVITY_CATEGORY_OPTIONS = DISCOVERY_CATEGORY_FILTER_OPTIONS

export const PUBLISH_CATEGORY_OPTIONS = [
  { id: 'sport', label: ACTIVITY_CATEGORY_LABEL_MAP.sport },
  { id: 'music', label: ACTIVITY_CATEGORY_LABEL_MAP.music },
  { id: 'reading', label: ACTIVITY_CATEGORY_LABEL_MAP.reading },
  { id: 'game', label: ACTIVITY_CATEGORY_LABEL_MAP.game },
  { id: 'social', label: ACTIVITY_CATEGORY_LABEL_MAP.social },
  { id: 'outdoor', label: ACTIVITY_CATEGORY_LABEL_MAP.outdoor },
  { id: 'food', label: ACTIVITY_CATEGORY_LABEL_MAP.food },
  { id: 'movie', label: ACTIVITY_CATEGORY_LABEL_MAP.movie },
  { id: 'travel', label: ACTIVITY_CATEGORY_LABEL_MAP.travel },
  { id: 'other', label: ACTIVITY_CATEGORY_LABEL_MAP.other },
]

export const DISTANCE_FILTER_OPTIONS = [
  { id: 'sort_near', label: '从近到远', type: 'sort', sortBy: 'distance_asc', radius: 2000000 },
  { id: 'sort_far', label: '从远到近', type: 'sort', sortBy: 'distance_desc', radius: 2000000 },
  { id: 'r_1', label: '1km', type: 'radius', radius: 1000 },
  { id: 'r_3', label: '3km', type: 'radius', radius: 3000 },
  { id: 'r_5', label: '5km', type: 'radius', radius: 5000 },
  { id: 'r_10', label: '10km', type: 'radius', radius: 10000 },
  { id: 'r_20', label: '20km', type: 'radius', radius: 20000 },
  { id: 'r_50', label: '50km', type: 'radius', radius: 50000 },
  { id: 'r_100', label: '100km', type: 'radius', radius: 100000 },
  { id: 'r_1000', label: '1000km', type: 'radius', radius: 1000000 },
]

export function getCategoryLabel(categoryId) {
  return ACTIVITY_CATEGORY_LABEL_MAP[categoryId] || '其他'
}
