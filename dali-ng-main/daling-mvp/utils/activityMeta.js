export const LEGACY_CATEGORY_ID_MAP = {
  reading: 'culture',
  movie: 'culture',
  travel: 'outdoor',
}

const CATEGORY_DEFINITIONS = [
  { id: 'sport', label: '运动', scene: '跑步、球类、健身' },
  { id: 'cycling', label: '骑行', scene: '单车、环湖' },
  { id: 'outdoor', label: '户外', scene: '徒步、登山、露营' },
  { id: 'music', label: '音乐', scene: '演奏、演唱、音乐会' },
  { id: 'game', label: '游戏', scene: '桌游、剧本杀、电竞' },
  { id: 'culture', label: '文化', scene: '读书、展览、手工' },
  { id: 'food', label: '美食', scene: '探店、烧烤、聚餐' },
  { id: 'photo', label: '摄影', scene: '街拍、风景、人像' },
  { id: 'wellness', label: '身心', scene: '瑜伽、冥想、太极' },
  { id: 'social', label: '交流', scene: '语言交换、分享会、聊天' },
  { id: 'other', label: '其他', scene: '以上都不匹配' },
]

export const ACTIVITY_CATEGORY_LABEL_MAP = CATEGORY_DEFINITIONS.reduce((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {
  reading: '文化',
  movie: '文化',
  travel: '户外',
})

export const DISCOVERY_CATEGORY_FILTER_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'hot', label: '热门' },
  { id: 'official', label: '官方推荐' },
  { id: 'sport', label: ACTIVITY_CATEGORY_LABEL_MAP.sport },
  { id: 'cycling', label: ACTIVITY_CATEGORY_LABEL_MAP.cycling },
  { id: 'outdoor', label: ACTIVITY_CATEGORY_LABEL_MAP.outdoor },
  { id: 'music', label: ACTIVITY_CATEGORY_LABEL_MAP.music },
  { id: 'game', label: ACTIVITY_CATEGORY_LABEL_MAP.game },
  { id: 'culture', label: ACTIVITY_CATEGORY_LABEL_MAP.culture },
  { id: 'food', label: ACTIVITY_CATEGORY_LABEL_MAP.food },
  { id: 'photo', label: ACTIVITY_CATEGORY_LABEL_MAP.photo },
  { id: 'wellness', label: ACTIVITY_CATEGORY_LABEL_MAP.wellness },
  { id: 'social', label: ACTIVITY_CATEGORY_LABEL_MAP.social },
  { id: 'other', label: ACTIVITY_CATEGORY_LABEL_MAP.other },
]

export const ACTIVITY_CATEGORY_OPTIONS = DISCOVERY_CATEGORY_FILTER_OPTIONS

export const PUBLISH_CATEGORY_OPTIONS = CATEGORY_DEFINITIONS.map((item) => ({
  id: item.id,
  label: item.label,
  scene: item.scene,
}))

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

export function normalizeCategoryId(categoryId) {
  const safe = String(categoryId || '').trim().toLowerCase()
  return LEGACY_CATEGORY_ID_MAP[safe] || safe || 'other'
}

export function getCategoryLabel(categoryId) {
  const normalized = normalizeCategoryId(categoryId)
  return ACTIVITY_CATEGORY_LABEL_MAP[normalized] || '其他'
}
