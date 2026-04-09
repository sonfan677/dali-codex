const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const DEFAULT_CITY_CONFIG = {
  cityId: 'dali',
  version: 'v1-default',
  center: {
    lat: 25.6065,
    lng: 100.2679,
  },
  geo: {
    defaultFenceRadius: 5000,
    minFenceRadius: 2000,
  },
  timeConfig: {
    imminentMinutes: 5,
    startingSoonMinutes: 60,
    upcomingSoonHours: 24,
    endingSoonMinutes: 30,
  }
}

const CATEGORY_MAP = {
  sport: '运动',
  cycling: '骑行',
  outdoor: '户外',
  music: '音乐',
  game: '游戏',
  culture: '文化',
  food: '美食',
  photo: '摄影',
  wellness: '身心',
  social: '交流',
  other: '其他',
}

const LEGACY_CATEGORY_ID_MAP = {
  reading: 'culture',
  movie: 'culture',
  travel: 'outdoor',
}

const SCENE_LABEL_MAP = {
  local_explore: '在地探索',
  casual_gathering: '轻松聚会',
  social_networking: '交友社交',
  learning_sharing: '学习分享',
  workshop_experience: '体验工作坊',
  music_performance: '音乐演出',
  market_popups: '市集摆摊',
  outdoor_nature: '户外活动',
  family_pet: '亲子宠物',
  public_welfare: '公益社区',
  nomad_city: '旅居同城',
  festival_theme: '节庆主题',
}

const TYPE_OPTIONS_BY_SCENE = {
  local_explore: [
    { id: 'hotspot_checkin', name: '热门点位打卡' },
    { id: 'old_town_village_walk', name: '古城/村落漫游' },
    { id: 'hidden_spot_explore', name: '小众点位探索' },
    { id: 'erhai_co_travel', name: '洱海沿线同游' },
    { id: 'store_hopping', name: '探店活动' },
    { id: 'cafe_hopping', name: '咖啡馆串联' },
    { id: 'museum_heritage_checkin', name: '博物馆/展馆/非遗点位打卡' },
    { id: 'photo_walk', name: '旅拍互拍' },
    { id: 'market_food_walk', name: '菜市场/早市/夜市/美食逛吃' },
    { id: 'sunrise_sunset_trip', name: '日落/日出活动' },
    { id: 'city_walk', name: '城市 walk' },
  ],
  casual_gathering: [
    { id: 'meal_buddy', name: '饭搭子局' },
    { id: 'board_game', name: '桌游局' },
    { id: 'movie_meetup', name: '观影会' },
    { id: 'game_party', name: '游戏局' },
    { id: 'bar_gathering', name: '小酒馆聚会' },
    { id: 'light_sports', name: '轻运动局' },
    { id: 'weekend_chill', name: '周末松弛局' },
    { id: 'random_buddy', name: '随机搭子局' },
  ],
  social_networking: [
    { id: 'friend_making', name: '交友局' },
    { id: 'singles_social', name: '单身社交' },
    { id: 'women_social', name: '女性社交局' },
    { id: 'entrepreneur_meetup', name: '创业者交流会' },
    { id: 'industry_mixer', name: '行业交流会' },
    { id: 'industry_wine_social', name: '行业社交酒会' },
    { id: 'resource_matching', name: '资源对接会' },
    { id: 'host_meetup', name: '主理人交流会' },
    { id: 'private_circle', name: '圈层私享会' },
    { id: 'closed_small_group', name: '闭门小型局' },
  ],
  learning_sharing: [
    { id: 'public_class', name: '公开课' },
    { id: 'lecture', name: '讲座' },
    { id: 'guest_sharing', name: '嘉宾分享' },
    { id: 'themed_salon', name: '主题沙龙' },
    { id: 'roundtable', name: '圆桌对谈' },
    { id: 'book_club', name: '读书会' },
    { id: 'language_exchange', name: '语言交换' },
    { id: 'career_growth', name: '职业成长分享' },
    { id: 'retrospective_review', name: '经验复盘会' },
    { id: 'knowledge_qa', name: '知识问答会' },
  ],
  workshop_experience: [
    { id: 'free_trial_class', name: '免费体验课' },
    { id: 'handicraft_class', name: '手作课' },
    { id: 'floral_workshop', name: '花艺体验' },
    { id: 'silver_craft_workshop', name: '银器体验' },
    { id: 'aroma_workshop', name: '香薰体验' },
    { id: 'pottery_workshop', name: '陶艺体验' },
    { id: 'photography_workshop', name: '摄影工作坊' },
    { id: 'writing_workshop', name: '写作工作坊' },
    { id: 'painting_workshop', name: '绘画工作坊' },
    { id: 'coffee_workshop', name: '咖啡体验' },
    { id: 'tea_workshop', name: '茶体验' },
    { id: 'cocktail_workshop', name: '调酒体验' },
    { id: 'heritage_workshop', name: '非遗体验' },
    { id: 'tie_dye_workshop', name: '白族扎染体验' },
    { id: 'jia_ma_workshop', name: '甲马体验' },
    { id: 'wa_mao_workshop', name: '瓦猫体验' },
    { id: 'meditation_yoga_workshop', name: '冥想/瑜伽体验' },
    { id: 'healing_workshop', name: '身心疗愈体验' },
    { id: 'baking_cooking_workshop', name: '烘焙/料理体验' },
  ],
  music_performance: [
    { id: 'live_music', name: '音乐演出' },
    { id: 'folk_live', name: '民谣 live' },
    { id: 'dj_party', name: 'DJ/派对' },
    { id: 'open_mic', name: '开放麦' },
    { id: 'standup_show', name: '脱口秀' },
    { id: 'improv_theater', name: '即兴戏剧' },
    { id: 'video_screening', name: '影像放映' },
    { id: 'movie_screening', name: '电影放映' },
    { id: 'poetry_night', name: '诗歌夜' },
    { id: 'art_showcase', name: '艺术展演' },
  ],
  market_popups: [
    { id: 'creative_market', name: '文创市集' },
    { id: 'food_market', name: '美食市集' },
    { id: 'coffee_market', name: '咖啡市集' },
    { id: 'secondhand_swap', name: '二手交换' },
    { id: 'idle_recycle', name: '闲置循环' },
    { id: 'tasting_event', name: '试吃活动' },
    { id: 'trial_event', name: '试用体验' },
    { id: 'brand_popup', name: '品牌快闪' },
    { id: 'cohost_event', name: '联名活动' },
    { id: 'stall_recruitment', name: '摆摊招募' },
    { id: 'pet_friendly_market', name: '宠物友好市集' },
  ],
  outdoor_nature: [
    { id: 'hiking', name: '徒步' },
    { id: 'running', name: '跑步' },
    { id: 'frisbee', name: '飞盘' },
    { id: 'walking', name: '散步' },
    { id: 'sunbathing', name: '晒太阳' },
    { id: 'baseball', name: '棒球' },
    { id: 'basketball', name: '篮球' },
    { id: 'badminton', name: '羽毛球' },
    { id: 'tennis', name: '网球' },
    { id: 'cycling', name: '骑行' },
    { id: 'camping', name: '露营' },
    { id: 'paddle_water_sports', name: '桨板/水上活动' },
    { id: 'stargazing', name: '观星活动' },
    { id: 'farm_experience', name: '农场体验' },
    { id: 'nature_photography', name: '自然摄影' },
    { id: 'light_trail_run', name: '轻越野' },
    { id: 'outdoor_social', name: '户外社交活动' },
    { id: 'mountain_healing', name: '山野疗愈' },
  ],
  family_pet: [
    { id: 'parent_child', name: '亲子活动' },
    { id: 'children_handcraft', name: '儿童手作' },
    { id: 'family_activity', name: '家庭活动' },
    { id: 'parent_child_movie', name: '亲子观影' },
    { id: 'nature_education', name: '自然教育' },
    { id: 'pet_social', name: '宠物社交' },
    { id: 'dog_walk', name: '遛狗局' },
    { id: 'pet_friendly_gathering', name: '宠物友好聚会' },
    { id: 'pet_photography', name: '宠物摄影' },
    { id: 'pet_friendly_market', name: '宠物友好市集' },
  ],
  public_welfare: [
    { id: 'volunteer_activity', name: '志愿活动' },
    { id: 'eco_activity', name: '环保活动' },
    { id: 'beach_cleanup', name: '净滩/清洁活动' },
    { id: 'charity_class', name: '公益课堂' },
    { id: 'community_building', name: '社区共建' },
    { id: 'old_item_swap', name: '旧物交换' },
    { id: 'co_creation_activity', name: '共创活动' },
    { id: 'farmer_support', name: '助农活动' },
  ],
  nomad_city: [
    { id: 'newcomer_welcome', name: '新来大理欢迎会' },
    { id: 'nomad_icebreak', name: '旅居者破冰局' },
    { id: 'digital_nomad_meetup', name: '数字游民见面会' },
    { id: 'life_guide_sharing', name: '生活指南分享会' },
    { id: 'city_buddy_group', name: '同城搭子局' },
    { id: 'host_co_creation', name: '主理人共创会' },
    { id: 'coliving_community', name: '共居社区活动' },
    { id: 'local_integration', name: '在地融入活动' },
  ],
  festival_theme: [
    { id: 'march_street_theme', name: '三月街主题活动' },
    { id: 'torch_festival_theme', name: '火把节主题活动' },
    { id: 'bai_folk_experience', name: '白族民俗体验' },
    { id: 'solar_term_activity', name: '节气活动' },
    { id: 'spring_festival_theme', name: '春节主题' },
    { id: 'valentine_theme', name: '七夕/情人节主题' },
    { id: 'labor_day_theme', name: '五一主题' },
    { id: 'summer_theme', name: '暑期主题' },
    { id: 'national_day_theme', name: '国庆主题' },
    { id: 'new_year_countdown', name: '跨年活动' },
    { id: 'rao_san_ling_experience', name: '绕三灵相关文化体验' },
    { id: 'bai_song_festival', name: '白族歌会/对歌/打歌' },
    { id: 'heritage_theme_week', name: '非遗主题周' },
    { id: 'tea_coffee_culture_theme', name: '茶文化/咖啡文化主题活动' },
    { id: 'youfeng_location_theme', name: '“有风”影视取景地主题活动' },
  ],
}

const CATEGORY_TO_SCENE_TYPE = {
  sport: { sceneId: 'outdoor_nature', typeId: 'running' },
  cycling: { sceneId: 'outdoor_nature', typeId: 'cycling' },
  outdoor: { sceneId: 'outdoor_nature', typeId: 'hiking' },
  music: { sceneId: 'music_performance', typeId: 'live_music' },
  game: { sceneId: 'casual_gathering', typeId: 'board_game' },
  culture: { sceneId: 'learning_sharing', typeId: 'public_class' },
  food: { sceneId: 'casual_gathering', typeId: 'meal_buddy' },
  photo: { sceneId: 'local_explore', typeId: 'photo_walk' },
  wellness: { sceneId: 'workshop_experience', typeId: 'healing_workshop' },
  social: { sceneId: 'social_networking', typeId: 'friend_making' },
  other: { sceneId: 'casual_gathering', typeId: 'random_buddy' },
}

function normalizeCategoryId(categoryId = '') {
  const safe = String(categoryId || '').trim().toLowerCase()
  return LEGACY_CATEGORY_ID_MAP[safe] || safe || 'other'
}

function normalizeSceneId(sceneId = '') {
  const safe = String(sceneId || '').trim()
  return SCENE_LABEL_MAP[safe] ? safe : ''
}

function resolveTypeForScene(sceneId = '', typeId = '') {
  const list = TYPE_OPTIONS_BY_SCENE[sceneId] || []
  const safeTypeId = String(typeId || '').trim()
  if (!safeTypeId) return list[0] || null
  return list.find((item) => item.id === safeTypeId) || null
}

function resolveSceneTypeFromLegacyFields(input = {}) {
  const sceneIdFromInput = normalizeSceneId(input?.sceneId)
  const normalizedCategoryId = normalizeCategoryId(input?.categoryId || 'other')
  const fallback = CATEGORY_TO_SCENE_TYPE[normalizedCategoryId] || CATEGORY_TO_SCENE_TYPE.other
  const finalSceneId = sceneIdFromInput || fallback.sceneId
  const resolvedType = resolveTypeForScene(finalSceneId, input?.typeId) || resolveTypeForScene(finalSceneId, fallback.typeId)
  return {
    sceneId: finalSceneId,
    sceneName: SCENE_LABEL_MAP[finalSceneId] || '未分类场景',
    typeId: String(resolvedType?.id || ''),
    typeName: String(resolvedType?.name || '未分类'),
  }
}

function normalizeNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function mergeCityConfig(raw = {}, cityId = '') {
  const finalCityId = cityId || raw.cityId || DEFAULT_CITY_CONFIG.cityId
  return {
    cityId: finalCityId,
    version: raw.version || DEFAULT_CITY_CONFIG.version,
    center: {
      lat: normalizeNumber(raw.center?.lat, DEFAULT_CITY_CONFIG.center.lat),
      lng: normalizeNumber(raw.center?.lng, DEFAULT_CITY_CONFIG.center.lng),
    },
    geo: {
      defaultFenceRadius: normalizeNumber(raw.geo?.defaultFenceRadius, DEFAULT_CITY_CONFIG.geo.defaultFenceRadius),
      minFenceRadius: normalizeNumber(raw.geo?.minFenceRadius, DEFAULT_CITY_CONFIG.geo.minFenceRadius),
    },
    timeConfig: {
      imminentMinutes: normalizeNumber(raw.timeConfig?.imminentMinutes, DEFAULT_CITY_CONFIG.timeConfig.imminentMinutes),
      startingSoonMinutes: normalizeNumber(raw.timeConfig?.startingSoonMinutes, DEFAULT_CITY_CONFIG.timeConfig.startingSoonMinutes),
      upcomingSoonHours: normalizeNumber(raw.timeConfig?.upcomingSoonHours, DEFAULT_CITY_CONFIG.timeConfig.upcomingSoonHours),
      endingSoonMinutes: normalizeNumber(raw.timeConfig?.endingSoonMinutes, DEFAULT_CITY_CONFIG.timeConfig.endingSoonMinutes),
    },
  }
}

async function loadCityConfig(cityId = 'dali') {
  const finalCityId = cityId || DEFAULT_CITY_CONFIG.cityId
  try {
    const { data } = await db.collection('cityConfigs')
      .where({ cityId: finalCityId })
      .limit(1)
      .get()
    if (data && data[0]) return mergeCityConfig(data[0], finalCityId)
  } catch (e) {}

  try {
    const { data } = await db.collection('cityConfig')
      .where({ cityId: finalCityId })
      .limit(1)
      .get()
    if (data && data[0]) return mergeCityConfig(data[0], finalCityId)
  } catch (e) {}

  return mergeCityConfig({}, finalCityId)
}

function normalizeKeyword(val) {
  return String(val || '').trim().toLowerCase()
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function getTimeStatus(startMs, endMs, nowMs, cityConfig) {
  const timeCfg = cityConfig?.timeConfig || DEFAULT_CITY_CONFIG.timeConfig
  if (nowMs >= endMs) return 'ENDED'
  if (nowMs >= startMs) {
    if (endMs - nowMs <= timeCfg.endingSoonMinutes * 60 * 1000) {
      return 'ENDING_SOON'
    }
    return 'ONGOING'
  }

  const toStart = startMs - nowMs
  if (toStart <= timeCfg.imminentMinutes * 60 * 1000) return 'IMMINENT'
  if (toStart <= timeCfg.startingSoonMinutes * 60 * 1000) return 'STARTING_SOON'
  if (toStart <= timeCfg.upcomingSoonHours * 60 * 60 * 1000) return 'UPCOMING_SOON'
  return 'UPCOMING_FAR'
}

function getTimeWeight(status) {
  const weights = {
    IMMINENT: 2.0,
    STARTING_SOON: 1.5,
    ONGOING: 1.3,
    UPCOMING_SOON: 1.2,
    ENDING_SOON: 0.8,
    UPCOMING_FAR: 0.8,
    ENDED: 0,
  }
  return weights[status] || 1
}

function resolveDefaultSortBucket(item = {}, nowMs = Date.now()) {
  const isRecommended = !!item.isRecommended
  if (isRecommended) return 0
  const startMs = new Date(item.startTime).getTime()
  const endMs = new Date(item.endTime).getTime()
  if (Number.isFinite(startMs) && Number.isFinite(endMs) && nowMs >= startMs && nowMs < endMs) {
    return 1
  }
  return 2
}

function chunkArray(arr, size) {
  const list = []
  for (let i = 0; i < arr.length; i += size) {
    list.push(arr.slice(i, i + size))
  }
  return list
}

function mapRiskLevelByScore(score = 0) {
  const n = Number(score || 0)
  if (n >= 70) return 'L3'
  if (n >= 40) return 'L2'
  if (n >= 20) return 'L1'
  return 'L0'
}

function getActiveRiskTagsFromMeta(meta = [], nowMs = Date.now()) {
  if (!Array.isArray(meta)) return []
  return meta
    .filter((item) => {
      if (!item || item.status === 'expired') return false
      const expiresAtMs = new Date(item.expiresAt).getTime()
      if (Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs) return false
      return true
    })
    .map((item) => item.label || item.code || '')
    .filter(Boolean)
}

function buildTrustProfile(activity, user, nowMs) {
  const hasPlatformVerified = !!(
    user?.platformVerified ||
    user?.trustVerified ||
    user?.verifyStatus === 'platform_verified' ||
    activity?.trustProfile?.trustLevel === 'A'
  )
  const isRealVerified = !!(user?.isVerified || user?.verifyStatus === 'approved' || activity?.isVerified)

  let trustLevel = 'C'
  if (hasPlatformVerified) trustLevel = 'A'
  else if (isRealVerified) trustLevel = 'B'

  const displayStars = trustLevel === 'A' ? 5 : trustLevel === 'B' ? 4 : 3
  const identityLabel = trustLevel === 'A'
    ? '平台核验'
    : trustLevel === 'B'
      ? '已认证'
      : '新入驻'

  const tags = new Set()
  if (trustLevel === 'C') tags.add('新入驻')
  const startMs = new Date(activity.startTime).getTime()
  if (Number.isFinite(startMs) && startMs > nowMs && startMs - nowMs <= 24 * 60 * 60 * 1000) {
    tags.add('临时组织')
  }
  const modificationRiskScore = Number(activity.modificationRiskScore || activity.modificationRisk || 0)
  if (modificationRiskScore >= 2) tags.add('曾发生变更')

  const riskTagsFromMeta = getActiveRiskTagsFromMeta(activity?.riskTagMeta, nowMs)
  riskTagsFromMeta.forEach((tag) => tags.add(tag))
  ;(Array.isArray(activity?.riskTags) ? activity.riskTags : []).forEach((tag) => tags.add(tag))
  const presetTags = Array.isArray(activity?.trustProfile?.riskTags) ? activity.trustProfile.riskTags : []
  presetTags.forEach((tag) => tags.add(tag))
  const riskTags = [...tags].slice(0, 3)

  const fallbackScore = trustLevel === 'A' ? 8 : trustLevel === 'B' ? 18 : 32
  const riskScore = Number.isFinite(Number(activity?.riskScore))
    ? Number(activity.riskScore)
    : fallbackScore + (modificationRiskScore >= 3 ? 30 : modificationRiskScore >= 2 ? 16 : 0)
  const riskLevel = activity?.riskLevel ||
    activity?.riskControl?.autoRiskLevel ||
    activity?.trustProfile?.riskLevel ||
    mapRiskLevelByScore(riskScore)

  return {
    trustLevel,
    displayStars,
    starText: `${'★'.repeat(displayStars)}${'☆'.repeat(5 - displayStars)}`,
    identityLabel,
    riskTags,
    riskLevel,
    riskScore,
    internalScore: trustLevel === 'A' ? 90 : trustLevel === 'B' ? 75 : 60,
  }
}

exports.main = async (event, context) => {
  const targetCityId = String(event?.cityId || DEFAULT_CITY_CONFIG.cityId)
  const cityConfig = await loadCityConfig(targetCityId)
  const inputLat = Number(event?.lat)
  const inputLng = Number(event?.lng)
  const centerLat = Number.isFinite(inputLat)
    ? inputLat
    : Number(cityConfig?.center?.lat || DEFAULT_CITY_CONFIG.center.lat)
  const centerLng = Number.isFinite(inputLng)
    ? inputLng
    : Number(cityConfig?.center?.lng || DEFAULT_CITY_CONFIG.center.lng)
  if (!Number.isFinite(centerLat) || !Number.isFinite(centerLng)) {
    return { success: false, error: 'INVALID_LOCATION', message: '缺少有效定位坐标' }
  }

  const {
    radius,
    keyword = '',
    sceneId = 'all',
    categoryId = 'all',
    queryMode = 'nearby',
    sortBy = 'default',
    limit = 100,
  } = event || {}
  const normalizedQueryMode = String(queryMode || 'nearby').toLowerCase() === 'all' ? 'all' : 'nearby'
  const normalizedSortBy = String(sortBy || 'default').toLowerCase()
  const inputRadius = Number(radius)
  const defaultRadius = cityConfig.geo.defaultFenceRadius
  const minRadius = cityConfig.geo.minFenceRadius
  const safeRadius = Math.max(
    minRadius,
    Number.isFinite(inputRadius) && inputRadius > 0 ? inputRadius : defaultRadius
  )
  const normalizedKeyword = normalizeKeyword(keyword)
  const keywordTokens = normalizedKeyword.split(/\s+/).filter(Boolean)
  const normalizedCategoryId = String(categoryId || 'all').toLowerCase() === 'all'
    ? 'all'
    : normalizeCategoryId(categoryId)
  const normalizedSceneId = String(sceneId || 'all').toLowerCase() === 'all'
    ? 'all'
    : (normalizeSceneId(sceneId) || 'all')
  const now = new Date()
  const safeLimit = Math.max(20, Math.min(1000, Number(limit) || 200))

  const whereQuery = {
    cityId: targetCityId,
    status: _.in(['OPEN', 'FULL']),
  }

  if (normalizedQueryMode !== 'all') {
    const latDelta = safeRadius / 111000
    const lngDelta = safeRadius / (111000 * Math.cos(centerLat * Math.PI / 180))
    whereQuery['location.lat'] = _.gt(centerLat - latDelta).and(_.lt(centerLat + latDelta))
    whereQuery['location.lng'] = _.gt(centerLng - lngDelta).and(_.lt(centerLng + lngDelta))
  }

  const { data } = await db.collection('activities')
    .where(whereQuery)
    .orderBy('startTime', 'asc')
    .limit(safeLimit)
    .get()

  const nowMs = now.getTime()
  const isSceneDirectMatch = normalizedSceneId !== 'all'
  const isCategoryDirectMatch = normalizedCategoryId !== 'all' && !!CATEGORY_MAP[normalizedCategoryId]

  // 在应用层过滤时间（兼容 Date对象、时间戳数字、字符串 三种格式）
  const mappedList = data
    .map((a) => {
      const normalizedItemCategoryId = normalizeCategoryId(a.categoryId || 'other')
      const sceneType = resolveSceneTypeFromLegacyFields({
        sceneId: a.sceneId,
        typeId: a.typeId,
        categoryId: normalizedItemCategoryId,
      })
      const finalSceneId = sceneType.sceneId
      const finalTypeId = sceneType.typeId
      return {
        ...a,
        categoryId: normalizedItemCategoryId,
        categoryLabel: CATEGORY_MAP[normalizedItemCategoryId] || '其他',
        sceneId: finalSceneId,
        sceneName: a.sceneName || sceneType.sceneName || '未分类场景',
        typeId: finalTypeId,
        typeName: a.typeName || sceneType.typeName || '未分类',
        _distance: Number.isFinite(Number(a?.location?.lat)) && Number.isFinite(Number(a?.location?.lng))
          ? getDistance(centerLat, centerLng, Number(a.location.lat), Number(a.location.lng))
          : null,
        _endMs: new Date(a.endTime).getTime(),
        _startMs: new Date(a.startTime).getTime(),
        _statusByTime: getTimeStatus(new Date(a.startTime).getTime(), new Date(a.endTime).getTime(), nowMs, cityConfig),
      }
    })
    .filter(a => {
      // 过滤：未结束 + 在用户选择半径内
      if (a._endMs <= nowMs) return false
      if (normalizedQueryMode === 'all') return true
      return Number.isFinite(Number(a._distance)) && Number(a._distance) <= safeRadius
    })
    .filter((a) => {
      if (isSceneDirectMatch && String(a.sceneId || '') !== normalizedSceneId) {
        return false
      }
      if (!isSceneDirectMatch && isCategoryDirectMatch && normalizeCategoryId(a.categoryId || 'other') !== normalizedCategoryId) {
        return false
      }
      if (!keywordTokens.length) return true
      const haystack = [
        a.title,
        a.description,
        a.location?.address,
        a.publisherNickname,
        a.sceneName,
        a.typeName,
        a.categoryLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return keywordTokens.every((token) => haystack.includes(token))
    })

  const publisherIds = [...new Set(mappedList.map((a) => a.publisherId).filter(Boolean))]
  const userMap = {}
  if (publisherIds.length > 0) {
    for (const ids of chunkArray(publisherIds, 20)) {
      const { data: users } = await db.collection('users')
        .where({ _openid: _.in(ids) })
        .field({
          _openid: true,
          isVerified: true,
          verifyStatus: true,
          platformVerified: true,
          trustVerified: true,
        })
        .get()
      users.forEach((u) => { userMap[u._openid] = u })
    }
  }

  const activities = mappedList
    .sort((a, b) => {
      if (normalizedSortBy === 'distance_asc' || normalizedSortBy === 'distance_desc') {
        const ad = Number.isFinite(Number(a._distance)) ? Number(a._distance) : Number.POSITIVE_INFINITY
        const bd = Number.isFinite(Number(b._distance)) ? Number(b._distance) : Number.POSITIVE_INFINITY
        if (ad !== bd) {
          return normalizedSortBy === 'distance_asc' ? ad - bd : bd - ad
        }
      }

      const bucketDiff = resolveDefaultSortBucket(a, nowMs) - resolveDefaultSortBucket(b, nowMs)
      if (bucketDiff !== 0) return bucketDiff
      const startDiff = a._startMs - b._startMs
      if (startDiff !== 0) return startDiff
      const createdDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (Number.isFinite(createdDiff) && createdDiff !== 0) return createdDiff
      return 0
    })
    .map(a => {
      // 清理内部字段，不传给前端
      const { _endMs, _startMs, _statusByTime, ...rest } = a
      const trustProfile = buildTrustProfile(rest, userMap[rest.publisherId], nowMs)
      return {
        ...rest,
        categoryId: normalizeCategoryId(rest.categoryId || 'other'),
        categoryLabel: CATEGORY_MAP[normalizeCategoryId(rest.categoryId || 'other')] || '其他',
        sceneId: rest.sceneId,
        sceneName: rest.sceneName,
        typeId: rest.typeId,
        typeName: rest.typeName,
        trustProfile,
        timeStatus: _statusByTime,
        timeWeight: getTimeWeight(_statusByTime),
      }
    })

  return {
    success: true,
    cityId: targetCityId,
    activities,
    query: {
      mode: normalizedQueryMode,
      radius: safeRadius,
      sceneId: normalizedSceneId,
      categoryId: normalizedCategoryId,
      keyword: normalizedKeyword,
      sortBy: normalizedSortBy,
    },
    config: {
      cityId: targetCityId,
      cityConfigVersion: cityConfig.version,
      center: cityConfig.center || DEFAULT_CITY_CONFIG.center,
      defaultFenceRadius: cityConfig.geo.defaultFenceRadius,
      minFenceRadius: cityConfig.geo.minFenceRadius,
    },
    serverTime: nowMs,
    serverTimestamp: nowMs,
  }
}
