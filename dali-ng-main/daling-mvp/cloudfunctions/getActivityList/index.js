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
  const normalizedCategoryId = String(categoryId || 'all')
  const now = new Date()
  const safeLimit = Math.max(20, Math.min(200, Number(limit) || 100))

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
  const isCategoryDirectMatch = normalizedCategoryId !== 'all' && !!CATEGORY_MAP[normalizedCategoryId]

  // 在应用层过滤时间（兼容 Date对象、时间戳数字、字符串 三种格式）
  const mappedList = data
    .map(a => ({
      ...a,
      _distance: Number.isFinite(Number(a?.location?.lat)) && Number.isFinite(Number(a?.location?.lng))
        ? getDistance(centerLat, centerLng, Number(a.location.lat), Number(a.location.lng))
        : null,
      _endMs: new Date(a.endTime).getTime(),   // 统一转成毫秒
      _startMs: new Date(a.startTime).getTime(),
      _statusByTime: getTimeStatus(new Date(a.startTime).getTime(), new Date(a.endTime).getTime(), nowMs, cityConfig),
    }))
    .filter(a => {
      // 过滤：未结束 + 在用户选择半径内
      if (a._endMs <= nowMs) return false
      if (normalizedQueryMode === 'all') return true
      return Number.isFinite(Number(a._distance)) && Number(a._distance) <= safeRadius
    })
    .filter((a) => {
      const itemCategoryId = a.categoryId || 'other'
      if (isCategoryDirectMatch && itemCategoryId !== normalizedCategoryId) {
        return false
      }
      if (!normalizedKeyword) return true
      const haystack = [
        a.title,
        a.description,
        a.location?.address,
        a.publisherNickname,
        a.categoryLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedKeyword)
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
        categoryId: rest.categoryId || 'other',
        categoryLabel: rest.categoryLabel || CATEGORY_MAP[rest.categoryId] || '其他',
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
