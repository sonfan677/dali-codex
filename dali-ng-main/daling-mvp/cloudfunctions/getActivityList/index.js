const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const CITY_CONFIG = {
  cityId: 'dali',
  geo: {
    defaultFenceRadius: 5000,
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
  other: '其他',
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

function getTimeStatus(startMs, endMs, nowMs) {
  if (nowMs >= endMs) return 'ENDED'
  if (nowMs >= startMs) {
    if (endMs - nowMs <= CITY_CONFIG.timeConfig.endingSoonMinutes * 60 * 1000) {
      return 'ENDING_SOON'
    }
    return 'ONGOING'
  }

  const toStart = startMs - nowMs
  if (toStart <= CITY_CONFIG.timeConfig.imminentMinutes * 60 * 1000) return 'IMMINENT'
  if (toStart <= CITY_CONFIG.timeConfig.startingSoonMinutes * 60 * 1000) return 'STARTING_SOON'
  if (toStart <= CITY_CONFIG.timeConfig.upcomingSoonHours * 60 * 60 * 1000) return 'UPCOMING_SOON'
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

function chunkArray(arr, size) {
  const list = []
  for (let i = 0; i < arr.length; i += size) {
    list.push(arr.slice(i, i + size))
  }
  return list
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

  const tags = []
  if (trustLevel === 'C') tags.push('新入驻')
  const startMs = new Date(activity.startTime).getTime()
  if (Number.isFinite(startMs) && startMs > nowMs && startMs - nowMs <= 24 * 60 * 60 * 1000) {
    tags.push('临时组织')
  }
  const modificationRiskScore = Number(activity.modificationRiskScore || activity.modificationRisk || 0)
  if (modificationRiskScore >= 2) tags.push('曾发生变更')

  const presetTags = Array.isArray(activity?.trustProfile?.riskTags) ? activity.trustProfile.riskTags : []
  const riskTags = [...new Set([...presetTags, ...tags])].slice(0, 3)
  const riskLevel = activity?.trustProfile?.riskLevel || (trustLevel === 'A' ? 'L0' : trustLevel === 'B' ? 'L1' : 'L2')

  return {
    trustLevel,
    displayStars,
    starText: `${'★'.repeat(displayStars)}${'☆'.repeat(5 - displayStars)}`,
    identityLabel,
    riskTags,
    riskLevel,
    internalScore: trustLevel === 'A' ? 90 : trustLevel === 'B' ? 75 : 60,
  }
}

exports.main = async (event, context) => {
  const {
    lat,
    lng,
    radius = CITY_CONFIG.geo.defaultFenceRadius,
    cityId = CITY_CONFIG.cityId,
    keyword = '',
    categoryId = 'all',
  } = event || {}
  const safeRadius = Number(radius) || CITY_CONFIG.geo.defaultFenceRadius
  const normalizedKeyword = normalizeKeyword(keyword)
  const normalizedCategoryId = String(categoryId || 'all')
  const now = new Date()

  const latDelta = safeRadius / 111000
  const lngDelta = safeRadius / (111000 * Math.cos(lat * Math.PI / 180))

  // 先只用位置和状态过滤，不过滤时间（兼容字符串时间格式）
  const { data } = await db.collection('activities')
    .where({
      status: _.in(['OPEN', 'FULL']),
      'location.lat': _.gt(lat - latDelta).and(_.lt(lat + latDelta)),
      'location.lng': _.gt(lng - lngDelta).and(_.lt(lng + lngDelta)),
    })
    .orderBy('startTime', 'asc')
    .limit(50)
    .get()

  const nowMs = now.getTime()

  // 在应用层过滤时间（兼容 Date对象、时间戳数字、字符串 三种格式）
  const mappedList = data
    .map(a => ({
      ...a,
      _distance: getDistance(lat, lng, a.location.lat, a.location.lng),
      _endMs: new Date(a.endTime).getTime(),   // 统一转成毫秒
      _startMs: new Date(a.startTime).getTime(),
      _statusByTime: getTimeStatus(new Date(a.startTime).getTime(), new Date(a.endTime).getTime(), nowMs),
    }))
    .filter(a => {
      // 过滤：未结束 + 在围栏内
      if (a._endMs <= nowMs) return false
      const baseRadius = Number(a.location?.radius) || CITY_CONFIG.geo.defaultFenceRadius
      const effectiveRadius = a._statusByTime === 'ONGOING'
        ? Math.round(baseRadius * 1.2)
        : baseRadius
      return a._distance <= effectiveRadius
    })
    .filter((a) => {
      const itemCategoryId = a.categoryId || 'other'
      if (normalizedCategoryId !== 'all' && itemCategoryId !== normalizedCategoryId) {
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
      if (a.isRecommended && !b.isRecommended) return -1
      if (!a.isRecommended && b.isRecommended) return 1
      const weightDiff = getTimeWeight(b._statusByTime) - getTimeWeight(a._statusByTime)
      if (weightDiff !== 0) return weightDiff
      return a._startMs - b._startMs
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
    cityId,
    activities,
    query: {
      radius: safeRadius,
      categoryId: normalizedCategoryId,
      keyword: normalizedKeyword,
    },
    serverTime: nowMs,
    serverTimestamp: nowMs,
  }
}
