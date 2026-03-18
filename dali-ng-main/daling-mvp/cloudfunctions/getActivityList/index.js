const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

exports.main = async (event, context) => {
  const { lat, lng, radius = 5000 } = event
  const now = new Date()

  const latDelta = radius / 111000
  const lngDelta = radius / (111000 * Math.cos(lat * Math.PI / 180))

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
    }))
    .filter(a => {
      // 过滤：未结束 + 在围栏内
      return a._endMs > nowMs && a._distance <= radius
    })
    .sort((a, b) => {
      if (a.isRecommended && !b.isRecommended) return -1
      if (!a.isRecommended && b.isRecommended) return 1
      const aOngoing = a._startMs <= nowMs
      const bOngoing = b._startMs <= nowMs
      if (aOngoing && !bOngoing) return -1
      if (!aOngoing && bOngoing) return 1
      return a._startMs - b._startMs
    })
    .map(a => {
      // 清理内部字段，不传给前端
      const { _endMs, _startMs, ...rest } = a
      return rest
    })

  return { success: true, activities, serverTime: nowMs }
}