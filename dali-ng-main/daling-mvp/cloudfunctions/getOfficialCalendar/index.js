const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const DAY_MS = 24 * 60 * 60 * 1000
const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const FIXED_MARKET_RULES = {
  dali: [
    {
      id: 'sanyuejie_market',
      title: '大理三月街集市',
      weekdays: [6],
      timeStart: '08:30',
      timeEnd: '13:30',
      categoryId: 'culture',
      categoryLabel: '文化',
      organizer: '公开集市',
      location: {
        address: '大理古城三月街牌坊周边',
        lat: 25.6948,
        lng: 100.1552,
      },
      note: '无需报名，可直接前往。具体档期以现场公告为准。',
      launchHint: '逛集市',
    },
    {
      id: 'chuangdanchang_market',
      title: '床单厂周末市集',
      weekdays: [6],
      timeStart: '10:00',
      timeEnd: '18:00',
      categoryId: 'culture',
      categoryLabel: '文化',
      organizer: '公开集市',
      location: {
        address: '床单厂艺术区',
        lat: 25.6024,
        lng: 100.2671,
      },
      note: '无需报名，可直接前往。具体档期以现场公告为准。',
      launchHint: '逛市集',
    },
    {
      id: 'yinqiao_market',
      title: '银桥周末集市',
      weekdays: [0],
      timeStart: '09:30',
      timeEnd: '15:30',
      categoryId: 'food',
      categoryLabel: '美食',
      organizer: '公开集市',
      location: {
        address: '银桥镇集市区',
        lat: 25.7835,
        lng: 100.1384,
      },
      note: '无需报名，可直接前往。具体档期以现场公告为准。',
      launchHint: '赶集',
    },
  ],
}

function toChinaParts(input) {
  const ms = new Date(input).getTime()
  if (!Number.isFinite(ms)) return null
  const d = new Date(ms + 8 * 60 * 60 * 1000)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    weekday: d.getUTCDay(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
  }
}

function toChinaDayKey(input) {
  const parts = toChinaParts(input)
  if (!parts || typeof parts !== 'object') return ''
  const y = parts.year
  const m = `${parts.month}`.padStart(2, '0')
  const d = `${parts.day}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toChinaDisplayDate(dayKey = '') {
  const [y, m, d] = dayKey.split('-')
  if (!y || !m || !d) return dayKey
  const weekday = toChinaWeekdayFromDayKey(dayKey)
  return `${m}月${d}日 ${WEEK_LABELS[weekday] || ''}`.trim()
}

function toTimeText(input) {
  const parts = toChinaParts(input)
  if (!parts || typeof parts !== 'object') return '--:--'
  const hh = `${parts.hour}`.padStart(2, '0')
  const mm = `${parts.minute}`.padStart(2, '0')
  return `${hh}:${mm}`
}

function buildChinaDate(y, m, d, hh = 0, mm = 0) {
  return new Date(Date.UTC(y, m - 1, d, hh - 8, mm, 0, 0))
}

function buildDateFromDayKey(dayKey = '', hm = '09:00') {
  const [y, m, d] = String(dayKey).split('-').map((v) => Number(v))
  const [hh, mm] = String(hm || '09:00').split(':').map((v) => Number(v))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date(NaN)
  const safeH = Number.isFinite(hh) ? hh : 9
  const safeM = Number.isFinite(mm) ? mm : 0
  return buildChinaDate(y, m, d, safeH, safeM)
}

function toChinaWeekdayFromDayKey(dayKey = '') {
  const [y, m, d] = String(dayKey).split('-').map((v) => Number(v))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return -1
  return buildChinaDate(y, m, d, 0, 0).getUTCDay()
}

function normalizeMonthRange(event = {}, nowMs = Date.now()) {
  const mode = String(event?.mode || '').toLowerCase()
  const hasMonthParam = Number.isFinite(Number(event?.year)) && Number.isFinite(Number(event?.month))
  if (mode === 'month' || hasMonthParam) {
    const nowParts = toChinaParts(nowMs)
    const year = Number.isFinite(Number(event?.year)) ? Number(event.year) : nowParts.year
    const month = Number.isFinite(Number(event?.month)) ? Number(event.month) : nowParts.month
    const safeMonth = month >= 1 && month <= 12 ? month : nowParts.month
    const safeYear = Number.isFinite(year) && year > 2000 ? year : nowParts.year
    const startTime = buildChinaDate(safeYear, safeMonth, 1, 0, 0)
    const nextYear = safeMonth === 12 ? safeYear + 1 : safeYear
    const nextMonth = safeMonth === 12 ? 1 : safeMonth + 1
    const endTime = buildChinaDate(nextYear, nextMonth, 1, 0, 0)
    return {
      mode: 'month',
      year: safeYear,
      month: safeMonth,
      startMs: startTime.getTime(),
      endMs: endTime.getTime(),
      days: Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / DAY_MS)),
    }
  }
  const days = Math.max(1, Math.min(31, Number(event?.days || 14)))
  return {
    mode: 'range',
    year: 0,
    month: 0,
    startMs: nowMs,
    endMs: nowMs + days * DAY_MS,
    days,
  }
}

function formatWeekdayText(weekdays = []) {
  const list = (Array.isArray(weekdays) ? weekdays : [])
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    .sort((a, b) => a - b)
  if (!list.length) return '按公告执行'
  return list.map((idx) => WEEK_LABELS[idx]).join(' / ')
}

function buildMarketRules(cityId = 'dali') {
  const rules = FIXED_MARKET_RULES[cityId] || []
  return rules.map((rule) => ({
    ...rule,
    scheduleText: `${formatWeekdayText(rule.weekdays)} ${rule.timeStart || '--:--'}-${rule.timeEnd || '--:--'}`,
  }))
}

function expandMarketEvents({ cityId = 'dali', startMs, endMs }) {
  const rules = buildMarketRules(cityId)
  const result = []
  if (!rules.length) return result

  const cursorStart = new Date(startMs)
  for (let cursor = startMs; cursor < endMs; cursor += DAY_MS) {
    const dayKey = toChinaDayKey(cursor)
    const weekday = toChinaParts(cursor)?.weekday
    if (!dayKey || !Number.isInteger(weekday)) continue

    rules.forEach((rule) => {
      if (!Array.isArray(rule.weekdays) || !rule.weekdays.includes(weekday)) return
      const startTime = buildDateFromDayKey(dayKey, rule.timeStart || '09:00')
      const endTime = buildDateFromDayKey(dayKey, rule.timeEnd || '17:00')
      const startTs = startTime.getTime()
      if (!Number.isFinite(startTs) || startTs < startMs || startTs >= endMs) return
      result.push({
        source: 'market',
        _id: `${rule.id}_${dayKey}`,
        marketId: rule.id,
        title: rule.title || '固定集市',
        categoryId: rule.categoryId || 'culture',
        categoryLabel: rule.categoryLabel || '文化',
        startTime,
        endTime,
        location: rule.location || {},
        quota: 0,
        joined: null,
        organizer: rule.organizer || '公开集市',
        note: rule.note || '无需报名，可直接前往',
        scheduleText: rule.scheduleText || '',
        isSignupRequired: false,
        activityId: '',
        launchHint: rule.launchHint || '一起去逛逛',
      })
    })
  }

  // 防止极端情况下游标起点不在整日边界时漏首日
  if (cursorStart.getMinutes() || cursorStart.getHours()) {
    const firstDayKey = toChinaDayKey(startMs)
    const firstWeekday = toChinaWeekdayFromDayKey(firstDayKey)
    rules.forEach((rule) => {
      if (!Array.isArray(rule.weekdays) || !rule.weekdays.includes(firstWeekday)) return
      const startTime = buildDateFromDayKey(firstDayKey, rule.timeStart || '09:00')
      const startTs = startTime.getTime()
      if (!Number.isFinite(startTs) || startTs < startMs || startTs >= endMs) return
      const already = result.find((item) => item._id === `${rule.id}_${firstDayKey}`)
      if (already) return
      result.push({
        source: 'market',
        _id: `${rule.id}_${firstDayKey}`,
        marketId: rule.id,
        title: rule.title || '固定集市',
        categoryId: rule.categoryId || 'culture',
        categoryLabel: rule.categoryLabel || '文化',
        startTime,
        endTime: buildDateFromDayKey(firstDayKey, rule.timeEnd || '17:00'),
        location: rule.location || {},
        quota: 0,
        joined: null,
        organizer: rule.organizer || '公开集市',
        note: rule.note || '无需报名，可直接前往',
        scheduleText: rule.scheduleText || '',
        isSignupRequired: false,
        activityId: '',
        launchHint: rule.launchHint || '一起去逛逛',
      })
    })
  }

  return result
}

function summarizeDayItems(items = []) {
  const summary = { market: 0, activity: 0, calendarEvent: 0 }
  items.forEach((item) => {
    if (item.source === 'market') summary.market += 1
    else if (item.source === 'activity') summary.activity += 1
    else summary.calendarEvent += 1
  })
  return summary
}

exports.main = async (event = {}) => {
  const cityId = String(event?.cityId || 'dali')
  const nowMs = Date.now()
  const range = normalizeMonthRange(event, nowMs)
  const startMs = range.startMs
  const endMs = range.endMs

  const { data: activities } = await db.collection('activities')
    .where({
      cityId,
      isRecommended: true,
      status: _.in(['OPEN', 'FULL']),
      startTime: _.gte(new Date(startMs)).and(_.lt(new Date(endMs))),
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
      startTime: _.gte(new Date(startMs)).and(_.lt(new Date(endMs))),
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

  const marketEvents = expandMarketEvents({ cityId, startMs, endMs })

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
    ...marketEvents,
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
      sourceCount: summarizeDayItems(day.items),
      items: day.items.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    }))

  const monthMeta = range.mode === 'month'
    ? {
      year: range.year,
      month: range.month,
      monthKey: `${range.year}-${`${range.month}`.padStart(2, '0')}`,
    }
    : null

  return {
    success: true,
    cityId,
    days: range.days,
    mode: range.mode,
    monthMeta,
    marketRules: buildMarketRules(cityId).map((rule) => ({
      id: rule.id,
      title: rule.title,
      scheduleText: rule.scheduleText,
      location: rule.location || {},
      note: rule.note || '无需报名，可直接前往',
      launchHint: rule.launchHint || '一起去逛逛',
      categoryId: rule.categoryId || 'culture',
      categoryLabel: rule.categoryLabel || '文化',
    })),
    calendarDays,
    totalItems: merged.length,
    serverTimestamp: nowMs,
    range: {
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
    },
  }
}
