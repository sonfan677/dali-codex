// utils/distance.js

// 计算两点距离（米），Haversine公式
export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2) ** 2 +
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
            Math.sin(dLng/2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

// 距离转文案
export function distanceToText(meters) {
  if (meters <= 1000) return '步行可达'
  if (meters <= 3000) return '10分钟可达'
  if (meters <= 8000) return '20分钟可达'
  return '较远'
}

// 时间状态（3档）
export function getTimeStatus(startTime, endTime, now = new Date()) {
  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime).getTime()
  const nowMs = now.getTime()

  if (nowMs >= endMs) return { status: 'ended', text: '已结束' }
  if (nowMs >= startMs) return { status: 'ongoing', text: '正在进行' }
  if (startMs - nowMs <= 60 * 60 * 1000) return { status: 'starting_soon', text: '即将开始' }

  const startDate = new Date(startTime)
  const today = new Date()
  const isToday = startDate.toDateString() === today.toDateString()
  const h = startDate.getHours().toString().padStart(2, '0')
  const m = startDate.getMinutes().toString().padStart(2, '0')
  return { status: 'upcoming', text: isToday ? `今天 ${h}:${m}` : `明天 ${h}:${m}` }
}

// 成团倒计时文案
export function formationTimeLeft(deadline, now = new Date()) {
  const diff = new Date(deadline).getTime() - now.getTime()
  if (diff <= 0) return '已截止'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}分钟后截止`
  return `${Math.floor(minutes / 60)}小时后截止`
}