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
  festival_theme: '节庆主题',
}

const TYPE_OPTIONS_BY_SCENE = {
  local_explore: [
    { id: 'hotspot_checkin', name: '热门点位打卡' },
    { id: 'city_walk', name: '城市漫游' },
    { id: 'village_walk', name: '村落探索' },
    { id: 'erhai_route', name: '洱海路线活动' },
    { id: 'cafe_hopping', name: '探店串联' },
    { id: 'photo_walk', name: '旅拍互拍' },
    { id: 'museum_gallery', name: '展馆打卡' },
    { id: 'market_tour', name: '市集逛游' },
  ],
  casual_gathering: [
    { id: 'movie_night', name: '观影会' },
    { id: 'board_game', name: '桌游局' },
    { id: 'party_game', name: '游戏局' },
    { id: 'meal_gathering', name: '饭局聚会' },
    { id: 'bar_chat', name: '夜聊小聚' },
    { id: 'coffee_chat', name: '咖啡闲聊' },
    { id: 'newcomer_mixer', name: '新人破冰局' },
    { id: 'free_talk', name: '主题闲聊局' },
  ],
  social_networking: [
    { id: 'friend_making', name: '交友局' },
    { id: 'dating_event', name: '单身交友' },
    { id: 'entrepreneur_meetup', name: '创业者交流会' },
    { id: 'industry_mixer', name: '行业交流会' },
    { id: 'social_wine', name: '社交酒会' },
    { id: 'resource_matching', name: '资源对接会' },
    { id: 'private_circle', name: '圈层私享会' },
    { id: 'host_meetup', name: '主理人交流会' },
  ],
  learning_sharing: [
    { id: 'public_class', name: '公开课' },
    { id: 'lecture', name: '讲座' },
    { id: 'industry_sharing', name: '行业分享会' },
    { id: 'salon', name: '主题沙龙' },
    { id: 'roundtable', name: '圆桌对谈' },
    { id: 'book_club', name: '读书会' },
    { id: 'language_exchange', name: '语言交换' },
    { id: 'career_growth', name: '职业成长分享' },
  ],
  workshop_experience: [
    { id: 'trial_class', name: '免费体验课' },
    { id: 'craft_workshop', name: '手作工作坊' },
    { id: 'coffee_workshop', name: '咖啡体验' },
    { id: 'tea_workshop', name: '茶体验' },
    { id: 'art_workshop', name: '绘画/写作/摄影' },
    { id: 'healing_session', name: '疗愈体验' },
    { id: 'movement_session', name: '瑜伽/冥想/身心活动' },
    { id: 'heritage_workshop', name: '非遗体验' },
  ],
  music_performance: [
    { id: 'live_music', name: '音乐演出' },
    { id: 'open_mic', name: '开放麦' },
    { id: 'dj_party', name: 'DJ/派对活动' },
    { id: 'standup_show', name: '脱口秀' },
    { id: 'improv_theater', name: '即兴戏剧' },
    { id: 'poetry_night', name: '诗歌夜' },
    { id: 'screening_event', name: '影像放映' },
    { id: 'art_showcase', name: '艺术展演' },
  ],
  market_popups: [
    { id: 'creative_market', name: '文创市集' },
    { id: 'food_market', name: '美食市集' },
    { id: 'coffee_market', name: '咖啡市集' },
    { id: 'flea_market', name: '二手闲置' },
    { id: 'swap_market', name: '交换活动' },
    { id: 'brand_popup', name: '品牌快闪' },
    { id: 'trial_tasting', name: '试吃试用' },
    { id: 'cohost_market', name: '联名市集' },
  ],
  outdoor_nature: [
    { id: 'hiking', name: '徒步' },
    { id: 'cycling', name: '骑行' },
    { id: 'camping', name: '露营' },
    { id: 'water_sport', name: '水上活动' },
    { id: 'farm_experience', name: '农场体验' },
    { id: 'stargazing', name: '观星活动' },
    { id: 'trail_walk', name: '自然轻徒步' },
    { id: 'outdoor_photo', name: '户外摄影' },
  ],
  family_pet: [
    { id: 'parent_child', name: '亲子活动' },
    { id: 'family_day', name: '家庭活动' },
    { id: 'children_workshop', name: '儿童手作' },
    { id: 'nature_education', name: '自然教育' },
    { id: 'pet_meetup', name: '宠物社交' },
    { id: 'pet_walk', name: '遛宠活动' },
    { id: 'pet_friendly_market', name: '宠物友好市集' },
  ],
  festival_theme: [
    { id: 'march_street_theme', name: '三月街主题' },
    { id: 'torch_festival_theme', name: '火把节主题' },
    { id: 'bai_folk_theme', name: '白族民俗主题' },
    { id: 'festival_holiday', name: '节日限定活动' },
    { id: 'seasonal_theme', name: '季节主题活动' },
    { id: 'new_year_theme', name: '跨年主题' },
    { id: 'valentine_theme', name: '七夕/情人节主题' },
    { id: 'heritage_theme', name: '非遗文化主题' },
  ],
}

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
