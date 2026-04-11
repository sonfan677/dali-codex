const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { buildOpsTagProfile } = require('./opsTagging')
const DEFAULT_CITY_ID = 'dali'
const FESTIVAL_THEME_COLLECTION_CANDIDATES = ['festivalThemes', 'officialFestivalThemes']

function toChinaDayKeyByMs(input) {
  const ms = Number(input)
  if (!Number.isFinite(ms)) return ''
  const date = new Date(ms + 8 * 60 * 60 * 1000)
  const y = date.getUTCFullYear()
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const d = `${date.getUTCDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeFestivalThemeTag(value = '') {
  const safe = String(value || '').trim().replace(/\s+/g, '')
  if (!safe) return ''
  return safe.slice(0, 8)
}

function normalizeFestivalThemeTagList(input = [], max = 5) {
  const source = Array.isArray(input)
    ? input
    : String(input || '').split(/[,\n，、;；]/g)
  const next = []
  source.forEach((item) => {
    const safe = normalizeFestivalThemeTag(item)
    if (!safe || next.includes(safe)) return
    next.push(safe)
  })
  return next.slice(0, Math.max(0, Number(max) || 5))
}

function normalizeFestivalLocationKeywords(input = []) {
  const source = Array.isArray(input)
    ? input
    : String(input || '').split(/[,\n，、;；]/g)
  const next = []
  source.forEach((item) => {
    const safe = String(item || '').trim().toLowerCase().slice(0, 20)
    if (!safe || next.includes(safe)) return
    next.push(safe)
  })
  return next.slice(0, 6)
}

async function loadFestivalThemeRules(cityId = DEFAULT_CITY_ID) {
  const safeCityId = String(cityId || DEFAULT_CITY_ID).trim() || DEFAULT_CITY_ID
  const preferred = String(process.env.FESTIVAL_THEME_COLLECTION || '').trim()
  const candidates = preferred
    ? [preferred, ...FESTIVAL_THEME_COLLECTION_CANDIDATES]
    : FESTIVAL_THEME_COLLECTION_CANDIDATES
  for (let i = 0; i < candidates.length; i += 1) {
    const collectionName = String(candidates[i] || '').trim()
    if (!collectionName) continue
    try {
      const { data } = await db.collection(collectionName)
        .where({
          cityId: safeCityId,
          isActive: _.neq(false),
        })
        .limit(120)
        .field({
          _id: true,
          themeShortName: true,
          shortName: true,
          title: true,
          startDayKey: true,
          endDayKey: true,
          locationKeywords: true,
        })
        .get()
      const list = Array.isArray(data) ? data : []
      return list
        .map((item) => ({
          id: String(item._id || '').trim(),
          shortName: normalizeFestivalThemeTag(item.themeShortName || item.shortName || item.title || ''),
          startDayKey: String(item.startDayKey || '').trim(),
          endDayKey: String(item.endDayKey || '').trim(),
          locationKeywords: normalizeFestivalLocationKeywords(item.locationKeywords || []),
        }))
        .filter((item) => item.shortName && item.startDayKey && item.endDayKey)
        .sort((a, b) => String(a.startDayKey).localeCompare(String(b.startDayKey)))
    } catch (e) {}
  }
  return []
}

function resolveFestivalThemeAutoMatch({
  rules = [],
  startDayKey = '',
  title = '',
  description = '',
  address = '',
} = {}) {
  const safeDayKey = String(startDayKey || '').trim()
  const haystack = `${String(title || '')} ${String(description || '')} ${String(address || '')}`.toLowerCase()
  const tags = []
  const ruleIds = []
  ;(Array.isArray(rules) ? rules : []).forEach((rule) => {
    if (!rule) return
    const dateMatched = safeDayKey
      && String(rule.startDayKey || '').trim()
      && String(rule.endDayKey || '').trim()
      && safeDayKey >= String(rule.startDayKey).trim()
      && safeDayKey <= String(rule.endDayKey).trim()
    const locationMatched = Array.isArray(rule.locationKeywords)
      && rule.locationKeywords.some((keyword) => keyword && haystack.includes(String(keyword).toLowerCase()))
    if (!dateMatched && !locationMatched) return
    if (rule.shortName && !tags.includes(rule.shortName)) tags.push(rule.shortName)
    if (rule.id && !ruleIds.includes(rule.id)) ruleIds.push(rule.id)
  })
  return {
    tags: normalizeFestivalThemeTagList(tags, 5),
    ruleIds: ruleIds.slice(0, 5),
  }
}

function safeText(v) {
  return String(v || '').trim()
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const {
    activityId,
    lat,
    lng,
    address = '',
    startTime,
    endTime,
    maxParticipants,
  } = event || {}

  if (!activityId) {
    return { success: false, error: 'INVALID_ACTIVITY_ID', message: '缺少活动ID' }
  }

  const actRes = await db.collection('activities').doc(activityId).get().catch(() => null)
  if (!actRes || !actRes.data) {
    return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
  }

  const activity = actRes.data
  if (activity.publisherId !== OPENID) {
    return { success: false, error: 'UNAUTHORIZED', message: '仅发布者可编辑活动' }
  }
  if (['ENDED', 'CANCELLED'].includes(activity.status)) {
    return { success: false, error: 'NOT_EDITABLE', message: '活动已结束或已取消，无法编辑' }
  }

  const nowMs = Date.now()
  const originalStartMs = new Date(activity.startTime).getTime()
  if (Number.isFinite(originalStartMs) && originalStartMs <= nowMs) {
    return { success: false, error: 'ACTIVITY_STARTED', message: '活动已开始，暂不支持编辑' }
  }

  const newStartMs = new Date(startTime).getTime()
  const newEndMs = new Date(endTime).getTime()
  if (!Number.isFinite(newStartMs) || !Number.isFinite(newEndMs)) {
    return { success: false, error: 'INVALID_TIME', message: '活动时间不合法' }
  }
  if (newStartMs <= nowMs) {
    return { success: false, error: 'START_PASSED', message: '开始时间必须晚于现在' }
  }
  if (newEndMs <= newStartMs) {
    return { success: false, error: 'END_BEFORE_START', message: '结束时间必须晚于开始时间' }
  }

  const nextLat = Number(lat)
  const nextLng = Number(lng)
  if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
    return { success: false, error: 'INVALID_LOCATION', message: '活动地点不合法' }
  }

  let finalMax = Number(maxParticipants)
  if (!Number.isFinite(finalMax) || finalMax <= 0) {
    finalMax = 999
  }
  if (finalMax > 9999) finalMax = 9999

  const current = Number(activity.currentParticipants) || 0
  if (finalMax < current) {
    return {
      success: false,
      error: 'INVALID_MAX_CURRENT',
      message: `人数上限不能小于当前报名人数（${current}）`,
    }
  }
  if (activity.isGroupFormation) {
    const min = Number(activity.minParticipants) || 0
    if (finalMax < min) {
      return {
        success: false,
        error: 'INVALID_MAX_MIN',
        message: `人数上限不能小于成团人数（${min}）`,
      }
    }
  }

  const nextStatus = current >= finalMax ? 'FULL' : 'OPEN'
  const nextAddress = safeText(address) || activity.location?.address || ''
  const nextLocation = {
    ...(activity.location || {}),
    lat: nextLat,
    lng: nextLng,
    address: nextAddress,
  }
  const opsTagProfile = buildOpsTagProfile({
    title: activity.title,
    description: activity.description,
    sceneId: activity.sceneId,
    sceneName: activity.sceneName,
    typeId: activity.typeId,
    typeName: activity.typeName,
    categoryId: activity.categoryId,
    chargeType: activity.chargeType || activity.pricing?.chargeType || 'free',
    feeAmount: Number(activity.feeAmount ?? activity.pricing?.feeAmount ?? 0),
    maxParticipants: finalMax,
    requireApproval: !!(activity.requireApproval ?? activity.joinPolicy?.requireApproval),
    allowWaitlist: !!(activity.allowWaitlist ?? activity.joinPolicy?.allowWaitlist),
    isGroupFormation: !!activity.isGroupFormation,
    startTime,
    address: nextAddress,
    cityId: activity.cityId || 'dali',
    lat: nextLat,
    lng: nextLng,
  })

  const startDayKey = toChinaDayKeyByMs(newStartMs)
  const festivalThemeRules = await loadFestivalThemeRules(activity.cityId || DEFAULT_CITY_ID)
  const festivalThemeAutoMatch = resolveFestivalThemeAutoMatch({
    rules: festivalThemeRules,
    startDayKey,
    title: activity.title,
    description: activity.description,
    address: nextAddress,
  })
  const festivalThemeTagsAuto = normalizeFestivalThemeTagList(festivalThemeAutoMatch.tags)
  const festivalThemeTagsManual = normalizeFestivalThemeTagList(activity.festivalThemeTagsManual || [])
  const festivalThemeTags = festivalThemeTagsManual.length > 0 ? festivalThemeTagsManual : festivalThemeTagsAuto
  const festivalThemeSource = festivalThemeTagsManual.length > 0
    ? 'manual'
    : (festivalThemeTags.length > 0 ? 'auto' : 'none')

  await db.collection('activities').doc(activityId).update({
    data: {
      location: nextLocation,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      maxParticipants: finalMax,
      status: nextStatus,
      opsTagProfile,
      festivalThemeTagsAuto,
      festivalThemeTags,
      festivalThemeSource,
      festivalThemeMatchedRuleIds: festivalThemeAutoMatch.ruleIds,
      festivalThemeMatchedAt: db.serverDate(),
      modificationRiskScore: _.inc(1),
      updatedAt: db.serverDate(),
    }
  })

  return {
    success: true,
    activityId,
    status: nextStatus,
    maxParticipants: finalMax,
    location: nextLocation,
    festivalThemeTags,
    festivalThemeSource,
  }
}
