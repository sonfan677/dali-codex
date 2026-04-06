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
      ruleType: 'lunar_days',
      lunarDays: [2, 9, 16, 23],
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
      ruleType: 'weekdays',
      weekdays: [6, 0],
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
      title: '银桥集市',
      ruleType: 'lunar_days',
      lunarDays: [5, 13, 20, 28],
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

const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260,
  0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255,
  0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40,
  0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0,
  0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4,
  0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5d0,
  0x14573, 0x052d0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570,
  0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4,
  0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a,
  0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50,
  0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552,
  0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9,
  0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60,
  0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04bd7, 0x04ad0,
  0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577,
  0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
]

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

function lYearDays(y) {
  let sum = 348
  const info = LUNAR_INFO[y - 1900]
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (info & i) ? 1 : 0
  }
  return sum + leapDays(y)
}

function leapMonth(y) {
  return LUNAR_INFO[y - 1900] & 0xf
}

function leapDays(y) {
  const lm = leapMonth(y)
  if (lm) return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29
  return 0
}

function monthDays(y, m) {
  return (LUNAR_INFO[y - 1900] & (0x10000 >> m)) ? 30 : 29
}

function solarToLunarByChinaDate(year, month, day) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  const base = Date.UTC(1900, 0, 31)
  const target = Date.UTC(year, month - 1, day)
  let offset = Math.floor((target - base) / DAY_MS)
  if (!Number.isFinite(offset) || offset < 0) return null

  let lunarYear = 1900
  let temp = 0
  while (lunarYear < 2101 && offset > 0) {
    temp = lYearDays(lunarYear)
    if (offset < temp) break
    offset -= temp
    lunarYear += 1
  }

  let leap = leapMonth(lunarYear)
  let isLeap = false
  let lunarMonth = 1
  while (lunarMonth <= 12 && offset >= 0) {
    if (leap > 0 && lunarMonth === leap + 1 && !isLeap) {
      lunarMonth -= 1
      isLeap = true
      temp = leapDays(lunarYear)
    } else {
      temp = monthDays(lunarYear, lunarMonth)
    }
    if (offset < temp) break
    offset -= temp
    if (isLeap && lunarMonth === leap) isLeap = false
    lunarMonth += 1
  }

  const lunarDay = offset + 1
  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    isLeap,
  }
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

function formatLunarDayNumber(day) {
  const n = Number(day)
  if (!Number.isFinite(n) || n < 1 || n > 30) return ''
  const map = {
    1: '初一',
    2: '初二',
    3: '初三',
    4: '初四',
    5: '初五',
    6: '初六',
    7: '初七',
    8: '初八',
    9: '初九',
    10: '初十',
    11: '十一',
    12: '十二',
    13: '十三',
    14: '十四',
    15: '十五',
    16: '十六',
    17: '十七',
    18: '十八',
    19: '十九',
    20: '二十',
    21: '廿一',
    22: '廿二',
    23: '廿三',
    24: '廿四',
    25: '廿五',
    26: '廿六',
    27: '廿七',
    28: '廿八',
    29: '廿九',
    30: '三十',
  }
  return map[n] || ''
}

function formatLunarDaysText(days = []) {
  const list = (Array.isArray(days) ? days : [])
    .map((d) => Number(d))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 30)
    .sort((a, b) => a - b)
  if (!list.length) return '农历（按公告执行）'
  return `农历${list.map((n) => formatLunarDayNumber(n)).filter(Boolean).join(' / ')}`
}

function buildMarketRules(cityId = 'dali') {
  const rules = FIXED_MARKET_RULES[cityId] || []
  return rules.map((rule) => ({
    ...rule,
    scheduleText: rule.ruleType === 'lunar_days'
      ? `${formatLunarDaysText(rule.lunarDays)}`
      : `${formatWeekdayText(rule.weekdays)}`,
  }))
}

function expandMarketEvents({ cityId = 'dali', startMs, endMs }) {
  const rules = buildMarketRules(cityId)
  const result = []
  if (!rules.length) return result

  for (let cursor = startMs; cursor < endMs; cursor += DAY_MS) {
    const dayKey = toChinaDayKey(cursor)
    const chinaParts = toChinaParts(cursor)
    const weekday = chinaParts?.weekday
    const lunar = chinaParts
      ? solarToLunarByChinaDate(chinaParts.year, chinaParts.month, chinaParts.day)
      : null
    if (!dayKey || !Number.isInteger(weekday)) continue

    rules.forEach((rule) => {
      const isWeekdayRule = String(rule.ruleType || 'weekdays') === 'weekdays'
      const isLunarRule = String(rule.ruleType || '') === 'lunar_days'
      if (isWeekdayRule) {
        if (!Array.isArray(rule.weekdays) || !rule.weekdays.includes(weekday)) return
      } else if (isLunarRule) {
        const lunarDay = Number(lunar?.lunarDay || 0)
        if (!Number.isFinite(lunarDay) || !Array.isArray(rule.lunarDays) || !rule.lunarDays.includes(lunarDay)) return
      } else {
        return
      }

      const startTime = buildDateFromDayKey(dayKey, '00:00')
      const endTime = buildDateFromDayKey(dayKey, '23:59')
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
      startText: item.source === 'market' ? '全天' : toTimeText(item.startTime),
      endText: item.source === 'market' ? '' : toTimeText(item.endTime),
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
