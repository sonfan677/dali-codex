export const LEGACY_CATEGORY_ID_MAP = {
  reading: 'culture',
  movie: 'culture',
  travel: 'outdoor',
}

export const ACTIVITY_SCENE_DEFINITIONS = [
  { id: 'local_explore', label: '在地探索', desc: '围绕大理空间、点位、路线、城市体验展开', iconHint: '地图/定位' },
  { id: 'casual_gathering', label: '轻松聚会', desc: '低门槛、轻社交、容易参加', iconHint: '聊天/碰杯' },
  { id: 'social_networking', label: '交友社交', desc: '以认识人、链接人、破冰为主', iconHint: '人群/握手' },
  { id: 'learning_sharing', label: '学习分享', desc: '听讲、交流、输入内容为主', iconHint: '书本/麦克风' },
  { id: 'workshop_experience', label: '体验工作坊', desc: '更重参与、动手、体验感', iconHint: '手作/画笔' },
  { id: 'music_performance', label: '音乐演出', desc: '演出、放映、现场娱乐氛围', iconHint: '音符/舞台' },
  { id: 'market_popups', label: '市集摆摊', desc: '摆摊、市集、试吃试用、快闪', iconHint: '摊位/购物袋' },
  { id: 'outdoor_nature', label: '户外活动', desc: '徒步、骑行、露营、自然活动', iconHint: '山/帐篷' },
  { id: 'family_pet', label: '亲子宠物', desc: '家庭、儿童、宠物友好活动', iconHint: '小孩/宠物' },
  { id: 'public_welfare', label: '公益社区', desc: '志愿、环保、社区共建、交换', iconHint: '爱心/树叶' },
  { id: 'nomad_city', label: '旅居同城', desc: '新来大理、旅居融入、数字游民等', iconHint: '小屋/行李箱' },
  { id: 'festival_theme', label: '节庆主题', desc: '三月街、火把节、节日和时令主题', iconHint: '火把/灯笼' },
]

export const ACTIVITY_TYPE_OPTIONS_BY_SCENE = {
  local_explore: [
    { id: 'hotspot_checkin', name: '热门点位打卡', categoryId: 'photo' },
    { id: 'city_walk', name: '城市漫游', categoryId: 'culture' },
    { id: 'village_walk', name: '村落探索', categoryId: 'culture' },
    { id: 'erhai_route', name: '洱海路线活动', categoryId: 'outdoor' },
    { id: 'cafe_hopping', name: '探店串联', categoryId: 'food' },
    { id: 'photo_walk', name: '旅拍互拍', categoryId: 'photo' },
    { id: 'museum_gallery', name: '展馆打卡', categoryId: 'culture' },
    { id: 'market_tour', name: '市集逛游', categoryId: 'culture' },
  ],
  casual_gathering: [
    { id: 'movie_night', name: '观影会', categoryId: 'culture' },
    { id: 'board_game', name: '桌游局', categoryId: 'game' },
    { id: 'party_game', name: '游戏局', categoryId: 'game' },
    { id: 'meal_gathering', name: '饭局聚会', categoryId: 'food' },
    { id: 'bar_chat', name: '夜聊小聚', categoryId: 'social' },
    { id: 'coffee_chat', name: '咖啡闲聊', categoryId: 'social' },
    { id: 'newcomer_mixer', name: '新人破冰局', categoryId: 'social' },
    { id: 'free_talk', name: '主题闲聊局', categoryId: 'social' },
  ],
  social_networking: [
    { id: 'friend_making', name: '交友局', categoryId: 'social' },
    { id: 'dating_event', name: '单身交友', categoryId: 'social' },
    { id: 'entrepreneur_meetup', name: '创业者交流会', categoryId: 'social' },
    { id: 'industry_mixer', name: '行业交流会', categoryId: 'social' },
    { id: 'social_wine', name: '社交酒会', categoryId: 'social' },
    { id: 'resource_matching', name: '资源对接会', categoryId: 'social' },
    { id: 'private_circle', name: '圈层私享会', categoryId: 'social' },
    { id: 'host_meetup', name: '主理人交流会', categoryId: 'social' },
  ],
  learning_sharing: [
    { id: 'public_class', name: '公开课', categoryId: 'culture' },
    { id: 'lecture', name: '讲座', categoryId: 'culture' },
    { id: 'industry_sharing', name: '行业分享会', categoryId: 'culture' },
    { id: 'salon', name: '主题沙龙', categoryId: 'culture' },
    { id: 'roundtable', name: '圆桌对谈', categoryId: 'culture' },
    { id: 'book_club', name: '读书会', categoryId: 'culture' },
    { id: 'language_exchange', name: '语言交换', categoryId: 'social' },
    { id: 'career_growth', name: '职业成长分享', categoryId: 'culture' },
  ],
  workshop_experience: [
    { id: 'trial_class', name: '免费体验课', categoryId: 'culture' },
    { id: 'craft_workshop', name: '手作工作坊', categoryId: 'culture' },
    { id: 'coffee_workshop', name: '咖啡体验', categoryId: 'food' },
    { id: 'tea_workshop', name: '茶体验', categoryId: 'food' },
    { id: 'art_workshop', name: '绘画/写作/摄影', categoryId: 'photo' },
    { id: 'healing_session', name: '疗愈体验', categoryId: 'wellness' },
    { id: 'movement_session', name: '瑜伽/冥想/身心活动', categoryId: 'wellness' },
    { id: 'heritage_workshop', name: '非遗体验', categoryId: 'culture' },
  ],
  music_performance: [
    { id: 'live_music', name: '音乐演出', categoryId: 'music' },
    { id: 'open_mic', name: '开放麦', categoryId: 'music' },
    { id: 'dj_party', name: 'DJ/派对活动', categoryId: 'music' },
    { id: 'standup_show', name: '脱口秀', categoryId: 'culture' },
    { id: 'improv_theater', name: '即兴戏剧', categoryId: 'culture' },
    { id: 'poetry_night', name: '诗歌夜', categoryId: 'culture' },
    { id: 'screening_event', name: '影像放映', categoryId: 'culture' },
    { id: 'art_showcase', name: '艺术展演', categoryId: 'culture' },
  ],
  market_popups: [
    { id: 'creative_market', name: '文创市集', categoryId: 'culture' },
    { id: 'food_market', name: '美食市集', categoryId: 'food' },
    { id: 'coffee_market', name: '咖啡市集', categoryId: 'food' },
    { id: 'flea_market', name: '二手闲置', categoryId: 'culture' },
    { id: 'swap_market', name: '交换活动', categoryId: 'culture' },
    { id: 'brand_popup', name: '品牌快闪', categoryId: 'culture' },
    { id: 'trial_tasting', name: '试吃试用', categoryId: 'food' },
    { id: 'cohost_market', name: '联名市集', categoryId: 'culture' },
  ],
  outdoor_nature: [
    { id: 'hiking', name: '徒步', categoryId: 'outdoor' },
    { id: 'cycling', name: '骑行', categoryId: 'cycling' },
    { id: 'camping', name: '露营', categoryId: 'outdoor' },
    { id: 'water_sport', name: '水上活动', categoryId: 'outdoor' },
    { id: 'farm_experience', name: '农场体验', categoryId: 'outdoor' },
    { id: 'stargazing', name: '观星活动', categoryId: 'outdoor' },
    { id: 'trail_walk', name: '自然轻徒步', categoryId: 'outdoor' },
    { id: 'outdoor_photo', name: '户外摄影', categoryId: 'photo' },
  ],
  family_pet: [
    { id: 'parent_child', name: '亲子活动', categoryId: 'social' },
    { id: 'family_day', name: '家庭活动', categoryId: 'social' },
    { id: 'children_workshop', name: '儿童手作', categoryId: 'culture' },
    { id: 'nature_education', name: '自然教育', categoryId: 'outdoor' },
    { id: 'pet_meetup', name: '宠物社交', categoryId: 'social' },
    { id: 'pet_walk', name: '遛宠活动', categoryId: 'outdoor' },
    { id: 'pet_friendly_market', name: '宠物友好市集', categoryId: 'culture' },
  ],
  public_welfare: [
    { id: 'volunteer_service', name: '志愿服务', categoryId: 'social' },
    { id: 'community_cleanup', name: '社区清洁行动', categoryId: 'outdoor' },
    { id: 'eco_action', name: '环保行动', categoryId: 'outdoor' },
    { id: 'public_charity_event', name: '公益筹办活动', categoryId: 'social' },
    { id: 'neighborhood_mutual_aid', name: '邻里互助', categoryId: 'social' },
    { id: 'skill_volunteer', name: '技能公益分享', categoryId: 'culture' },
    { id: 'donation_drive', name: '公益募捐', categoryId: 'culture' },
    { id: 'swap_freecycle', name: '公益交换', categoryId: 'culture' },
  ],
  nomad_city: [
    { id: 'newcomer_welcome', name: '新来大理欢迎局', categoryId: 'social' },
    { id: 'city_settlement_help', name: '本地安顿互助', categoryId: 'social' },
    { id: 'digital_nomad_meetup', name: '数字游民见面会', categoryId: 'social' },
    { id: 'remote_work_study', name: '远程工作学习局', categoryId: 'culture' },
    { id: 'co_living_social', name: '共居社交', categoryId: 'social' },
    { id: 'local_buddy_pairing', name: '同城搭子配对', categoryId: 'social' },
    { id: 'rental_life_share', name: '租房生活经验分享', categoryId: 'culture' },
    { id: 'city_language_exchange', name: '旅居语言交流', categoryId: 'social' },
  ],
  festival_theme: [
    { id: 'march_street_theme', name: '三月街主题', categoryId: 'culture' },
    { id: 'torch_festival_theme', name: '火把节主题', categoryId: 'culture' },
    { id: 'bai_folk_theme', name: '白族民俗主题', categoryId: 'culture' },
    { id: 'festival_holiday', name: '节日限定活动', categoryId: 'culture' },
    { id: 'seasonal_theme', name: '季节主题活动', categoryId: 'culture' },
    { id: 'new_year_theme', name: '跨年主题', categoryId: 'culture' },
    { id: 'valentine_theme', name: '七夕/情人节主题', categoryId: 'social' },
    { id: 'heritage_theme', name: '非遗文化主题', categoryId: 'culture' },
  ],
}

export const ACTIVITY_THEME_OPTIONS = [
  { id: 'dali_local_life', label: '大理在地生活' },
  { id: 'erhai_sunset', label: '洱海日落' },
  { id: 'newcomer_dali', label: '初到大理' },
  { id: 'digital_nomad', label: '数字游民' },
  { id: 'march_street', label: '三月街' },
  { id: 'torch_festival', label: '火把节' },
  { id: 'bai_culture', label: '白族文化' },
  { id: 'intangible_heritage', label: '非遗体验' },
  { id: 'coffee_lifestyle', label: '咖啡生活' },
  { id: 'healing_retreat', label: '疗愈放松' },
  { id: 'summer_holiday', label: '暑期活动' },
  { id: 'national_day', label: '国庆主题' },
  { id: 'new_year', label: '跨年主题' },
  { id: 'valentine', label: '七夕/情人节' },
]

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

export const PUBLISH_SCENE_OPTIONS = ACTIVITY_SCENE_DEFINITIONS.map((item) => ({
  id: item.id,
  label: item.label,
  desc: item.desc,
}))

const SCENE_ID_SET = new Set(ACTIVITY_SCENE_DEFINITIONS.map((item) => item.id))
const SCENE_LABEL_MAP = ACTIVITY_SCENE_DEFINITIONS.reduce((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {})

const TYPE_INDEX_BY_SCENE = Object.keys(ACTIVITY_TYPE_OPTIONS_BY_SCENE).reduce((acc, sceneId) => {
  const list = ACTIVITY_TYPE_OPTIONS_BY_SCENE[sceneId] || []
  const map = {}
  list.forEach((item) => {
    map[item.id] = item
  })
  acc[sceneId] = map
  return acc
}, {})

const CATEGORY_TO_SCENE_TYPE = {
  sport: { sceneId: 'outdoor_nature', typeId: 'trail_walk' },
  cycling: { sceneId: 'outdoor_nature', typeId: 'cycling' },
  outdoor: { sceneId: 'outdoor_nature', typeId: 'hiking' },
  music: { sceneId: 'music_performance', typeId: 'live_music' },
  game: { sceneId: 'casual_gathering', typeId: 'board_game' },
  culture: { sceneId: 'learning_sharing', typeId: 'salon' },
  food: { sceneId: 'casual_gathering', typeId: 'meal_gathering' },
  photo: { sceneId: 'local_explore', typeId: 'photo_walk' },
  wellness: { sceneId: 'workshop_experience', typeId: 'movement_session' },
  social: { sceneId: 'social_networking', typeId: 'friend_making' },
  other: { sceneId: 'casual_gathering', typeId: 'free_talk' },
}

const SCENE_DEFAULT_CATEGORY_MAP = {
  local_explore: 'culture',
  casual_gathering: 'social',
  social_networking: 'social',
  learning_sharing: 'culture',
  workshop_experience: 'culture',
  music_performance: 'music',
  market_popups: 'culture',
  outdoor_nature: 'outdoor',
  family_pet: 'social',
  public_welfare: 'social',
  nomad_city: 'social',
  festival_theme: 'culture',
}

export const DISCOVERY_SCENE_FILTER_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'hot', label: '热门' },
  { id: 'official', label: '官方推荐' },
  ...ACTIVITY_SCENE_DEFINITIONS.map((item) => ({ id: item.id, label: item.label })),
  { id: 'other', label: '其它' },
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

export function normalizeCategoryId(categoryId) {
  const safe = String(categoryId || '').trim().toLowerCase()
  return LEGACY_CATEGORY_ID_MAP[safe] || safe || 'other'
}

export function getCategoryLabel(categoryId) {
  const normalized = normalizeCategoryId(categoryId)
  return ACTIVITY_CATEGORY_LABEL_MAP[normalized] || '其他'
}

export function normalizeSceneId(sceneId) {
  const safe = String(sceneId || '').trim()
  return SCENE_ID_SET.has(safe) ? safe : ''
}

export function getSceneLabel(sceneId = '') {
  const safe = normalizeSceneId(sceneId)
  return SCENE_LABEL_MAP[safe] || '未分类场景'
}

export function getTypesByScene(sceneId = '') {
  const safe = normalizeSceneId(sceneId)
  return safe ? [...(ACTIVITY_TYPE_OPTIONS_BY_SCENE[safe] || [])] : []
}

export function resolveTypeForScene(sceneId = '', typeId = '') {
  const safeScene = normalizeSceneId(sceneId)
  if (!safeScene) return null
  const safeType = String(typeId || '').trim()
  if (safeType && TYPE_INDEX_BY_SCENE[safeScene]?.[safeType]) {
    return TYPE_INDEX_BY_SCENE[safeScene][safeType]
  }
  const first = (ACTIVITY_TYPE_OPTIONS_BY_SCENE[safeScene] || [])[0]
  return first || null
}

export function resolveCategoryBySceneType(sceneId = '', typeId = '') {
  const type = resolveTypeForScene(sceneId, typeId)
  if (type?.categoryId) return type.categoryId
  const safeScene = normalizeSceneId(sceneId)
  if (safeScene && SCENE_DEFAULT_CATEGORY_MAP[safeScene]) return SCENE_DEFAULT_CATEGORY_MAP[safeScene]
  return 'other'
}

export function resolveSceneTypeFromLegacyFields(input = {}) {
  const sceneIdFromInput = normalizeSceneId(input?.sceneId)
  const sceneId = sceneIdFromInput || CATEGORY_TO_SCENE_TYPE[normalizeCategoryId(input?.categoryId)]?.sceneId || 'casual_gathering'
  const resolvedType = resolveTypeForScene(sceneId, input?.typeId) || resolveTypeForScene(sceneId, '')
  const finalSceneId = sceneId
  const finalTypeId = String(resolvedType?.id || '')
  return {
    sceneId: finalSceneId,
    sceneName: getSceneLabel(finalSceneId),
    typeId: finalTypeId,
    typeName: String(resolvedType?.name || '未分类'),
  }
}

export function normalizeThemeIds(themeIds = [], max = 3) {
  const allow = new Set(ACTIVITY_THEME_OPTIONS.map((item) => item.id))
  const unique = []
  ;(Array.isArray(themeIds) ? themeIds : []).forEach((item) => {
    const id = String(item || '').trim()
    if (!id || !allow.has(id) || unique.includes(id)) return
    unique.push(id)
  })
  return unique.slice(0, Math.max(0, Number(max) || 3))
}
