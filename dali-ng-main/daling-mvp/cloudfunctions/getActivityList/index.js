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

exports.main = async (event, context) => {
  const { lat, lng, radius = CITY_CONFIG.geo.defaultFenceRadius, cityId = CITY_CONFIG.cityId } = event
  const safeRadius = Number(radius) || CITY_CONFIG.geo.defaultFenceRadius
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
  const activities = data
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
      return {
        ...rest,
        timeStatus: _statusByTime,
        timeWeight: getTimeWeight(_statusByTime),
      }
    })

  return {
    success: true,
    cityId,
    activities,
    serverTime: nowMs,
    serverTimestamp: nowMs,
  }
}
