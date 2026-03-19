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

const TIME_THRESHOLD = {
  imminentMs: 5 * 60 * 1000,
  startingSoonMs: 60 * 60 * 1000,
  upcomingSoonMs: 24 * 60 * 60 * 1000,
  endingSoonMs: 30 * 60 * 1000,
}

function formatStartText(startDate, nowDate) {
  const h = startDate.getHours().toString().padStart(2, '0')
  const m = startDate.getMinutes().toString().padStart(2, '0')
  const startDay = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime()
  const nowDay = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime()
  const diffDay = Math.floor((startDay - nowDay) / (24 * 60 * 60 * 1000))
  if (diffDay === 0) return `今天 ${h}:${m}`
  if (diffDay === 1) return `明天 ${h}:${m}`
  const mo = startDate.getMonth() + 1
  const day = startDate.getDate()
  return `${mo}/${day} ${h}:${m}`
}

// 时间状态（完整枚举）
export function getTimeStatus(startTime, endTime, now = new Date()) {
  const startMs = new Date(startTime).getTime()
  const endMs = new Date(endTime).getTime()
  const nowMs = now.getTime()

  if (nowMs >= endMs) return { status: 'ended', text: '已结束' }
  if (nowMs >= startMs) {
    if (endMs - nowMs <= TIME_THRESHOLD.endingSoonMs) {
      return { status: 'ending_soon', text: '即将结束' }
    }
    return { status: 'ongoing', text: '正在进行' }
  }

  const toStart = startMs - nowMs
  if (toStart <= TIME_THRESHOLD.imminentMs) return { status: 'imminent', text: '马上开始' }
  if (toStart <= TIME_THRESHOLD.startingSoonMs) return { status: 'starting_soon', text: '即将开始' }
  if (toStart <= TIME_THRESHOLD.upcomingSoonMs) {
    return { status: 'upcoming_soon', text: formatStartText(new Date(startTime), new Date(nowMs)) }
  }
  return { status: 'upcoming_far', text: formatStartText(new Date(startTime), new Date(nowMs)) }
}

// 成团倒计时文案
export function formationTimeLeft(deadline, now = new Date()) {
  const diff = new Date(deadline).getTime() - now.getTime()
  if (diff <= 0) return '已截止'
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}分钟后截止`
  return `${Math.floor(minutes / 60)}小时后截止`
}
