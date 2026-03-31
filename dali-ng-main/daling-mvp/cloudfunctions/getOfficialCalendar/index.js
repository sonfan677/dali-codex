const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function toChinaDayKey(input) {
  const ms = new Date(input).getTime()
  if (!Number.isFinite(ms)) return ''
  const d = new Date(ms + 8 * 60 * 60 * 1000)
  const y = d.getUTCFullYear()
  const m = `${d.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${d.getUTCDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toChinaDisplayDate(dayKey = '') {
  const [y, m, d] = dayKey.split('-')
  if (!y || !m || !d) return dayKey
  return `${m}月${d}日`
}

function toTimeText(input) {
  const ms = new Date(input).getTime()
  if (!Number.isFinite(ms)) return '--:--'
  const dt = new Date(ms)
  const hh = `${dt.getHours()}`.padStart(2, '0')
  const mm = `${dt.getMinutes()}`.padStart(2, '0')
  return `${hh}:${mm}`
}

exports.main = async (event) => {
  const cityId = String(event?.cityId || 'dali')
  const days = Math.max(1, Math.min(31, Number(event?.days || 14)))
  const nowMs = Date.now()
  const endMs = nowMs + days * 24 * 60 * 60 * 1000

  const { data: activities } = await db.collection('activities')
    .where({
      cityId,
      isRecommended: true,
      status: _.in(['OPEN', 'FULL']),
      startTime: _.gte(new Date(nowMs)).and(_.lte(new Date(endMs))),
    })
    .orderBy('startTime', 'asc')
    .limit(200)
    .field({
      _id: true,
      title: true,
      categoryId: true,
      categoryLabel: true,
      startTime: true,
      endTime: true,
      location: true,
      currentParticipants: true,
      maxParticipants: true,
      publisherNickname: true,
      isRecommended: true,
    })
    .get()
    .catch(() => ({ data: [] }))

  const { data: extraEvents } = await db.collection('officialCalendarEvents')
    .where({
      cityId,
      isActive: _.neq(false),
      startTime: _.gte(new Date(nowMs)).and(_.lte(new Date(endMs))),
    })
    .orderBy('startTime', 'asc')
    .limit(200)
    .field({
      _id: true,
      title: true,
      categoryId: true,
      categoryLabel: true,
      startTime: true,
      endTime: true,
      location: true,
      quota: true,
      organizer: true,
    })
    .get()
    .catch(() => ({ data: [] }))

  const merged = [
    ...(activities || []).map((item) => ({
      source: 'activity',
      _id: item._id,
      title: item.title || '官方活动',
      categoryId: item.categoryId || 'other',
      categoryLabel: item.categoryLabel || '其他',
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location || {},
      quota: item.maxParticipants || 0,
      joined: item.currentParticipants || 0,
      organizer: item.publisherNickname || '官方运营',
      activityId: item._id,
    })),
    ...(extraEvents || []).map((item) => ({
      source: 'calendar_event',
      _id: item._id,
      title: item.title || '官方日历活动',
      categoryId: item.categoryId || 'other',
      categoryLabel: item.categoryLabel || '其他',
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location || {},
      quota: Number(item.quota || 0),
      joined: null,
      organizer: item.organizer || '官方运营',
      activityId: '',
    })),
  ]

  const dayMap = {}
  merged.forEach((item) => {
    const dayKey = toChinaDayKey(item.startTime)
    if (!dayKey) return
    if (!dayMap[dayKey]) {
      dayMap[dayKey] = {
        dayKey,
        displayDate: toChinaDisplayDate(dayKey),
        count: 0,
        items: [],
      }
    }
    dayMap[dayKey].count += 1
    dayMap[dayKey].items.push({
      ...item,
      startText: toTimeText(item.startTime),
      endText: toTimeText(item.endTime),
    })
  })

  const calendarDays = Object.values(dayMap)
    .sort((a, b) => String(a.dayKey).localeCompare(String(b.dayKey)))
    .map((day) => ({
      ...day,
      items: day.items.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    }))

  return {
    success: true,
    cityId,
    days,
    calendarDays,
    totalItems: merged.length,
    serverTimestamp: nowMs,
  }
}
