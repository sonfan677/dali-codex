export const ACTIVITY_CATEGORY_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'sport', label: '运动' },
  { id: 'music', label: '音乐' },
  { id: 'reading', label: '读书' },
  { id: 'game', label: '游戏' },
  { id: 'social', label: '社交' },
  { id: 'outdoor', label: '户外' },
  { id: 'other', label: '其他' },
]

export const PUBLISH_CATEGORY_OPTIONS = ACTIVITY_CATEGORY_OPTIONS.filter((item) => item.id !== 'all')

export const DISTANCE_FILTER_OPTIONS = [
  { radius: 3000, label: '3km' },
  { radius: 5000, label: '5km' },
  { radius: 10000, label: '10km' },
  { radius: 20000, label: '20km' },
  { radius: 50000, label: '50km' },
]

export function getCategoryLabel(categoryId) {
  const found = ACTIVITY_CATEGORY_OPTIONS.find((item) => item.id === categoryId)
  return found ? found.label : '其他'
}
