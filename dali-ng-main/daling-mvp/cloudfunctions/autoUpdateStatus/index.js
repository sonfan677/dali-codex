const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const DAY_MS = 24 * 60 * 60 * 1000
const SUPPLY_METRICS_COLLECTION = 'supplyMetrics'

const DEFAULT_CITY_CONFIG = {
  cityId: 'dali',
  version: 'v1-default',
  groupFormation: {
    organizerDecisionTimeoutHours: 24,
  },
  operations: {
    supplyAlertThreshold: {
      minDailyActivities: 5,
      minFormationRate: 0.4,
      minD1RetentionRate: 0.25,
    },
  },
}

const cityConfigCache = {}

function normalizeNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function mergeCityConfig(raw = {}, cityId = '') {
  const finalCityId = cityId || raw.cityId || DEFAULT_CITY_CONFIG.cityId
  return {
    cityId: finalCityId,
    version: raw.version || DEFAULT_CITY_CONFIG.version,
    groupFormation: {
      organizerDecisionTimeoutHours: normalizeNumber(
        raw.groupFormation?.organizerDecisionTimeoutHours,
        DEFAULT_CITY_CONFIG.groupFormation.organizerDecisionTimeoutHours
      ),
    },
    operations: {
      supplyAlertThreshold: {
        minDailyActivities: normalizeNumber(
          raw.operations?.supplyAlertThreshold?.minDailyActivities,
          DEFAULT_CITY_CONFIG.operations.supplyAlertThreshold.minDailyActivities
        ),
        minFormationRate: normalizeNumber(
          raw.operations?.supplyAlertThreshold?.minFormationRate,
          DEFAULT_CITY_CONFIG.operations.supplyAlertThreshold.minFormationRate
        ),
        minD1RetentionRate: normalizeNumber(
          raw.operations?.supplyAlertThreshold?.minD1RetentionRate,
          DEFAULT_CITY_CONFIG.operations.supplyAlertThreshold.minD1RetentionRate
        ),
      },
    },
  }
}

async function loadCityConfig(cityId = DEFAULT_CITY_CONFIG.cityId) {
  const finalCityId = String(cityId || DEFAULT_CITY_CONFIG.cityId)
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

async function getCityConfig(cityId = DEFAULT_CITY_CONFIG.cityId) {
  const finalCityId = String(cityId || DEFAULT_CITY_CONFIG.cityId)
  if (!cityConfigCache[finalCityId]) {
    cityConfigCache[finalCityId] = await loadCityConfig(finalCityId)
  }
  return cityConfigCache[finalCityId]
}

function toChinaDateKey(input = Date.now()) {
  const ms = new Date(input).getTime()
  const chinaMs = ms + 8 * 60 * 60 * 1000
  const d = new Date(chinaMs)
  const y = d.getUTCFullYear()
  const m = `${d.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${d.getUTCDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getChinaDayRange(dateKey) {
  const [y, m, d] = String(dateKey || '').split('-').map((item) => Number(item))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    const now = Date.now()
    const start = new Date(now - (now % DAY_MS))
    const end = new Date(start.getTime() + DAY_MS)
    return { start, end }
  }
  const startMs = Date.UTC(y, m - 1, d, 0, 0, 0) - 8 * 60 * 60 * 1000
  return {
    start: new Date(startMs),
    end: new Date(startMs + DAY_MS),
  }
}

function formatDateText(value) {
  const d = new Date(value)
  if (!Number.isFinite(d.getTime())) return ''
  const mo = d.getMonth() + 1
  const day = d.getDate()
  const h = `${d.getHours()}`.padStart(2, '0')
  const m = `${d.getMinutes()}`.padStart(2, '0')
  return `${mo}月${day}日 ${h}:${m}`
}

async function safeCount(queryBuilder, fallbackMaxFetch = 5000) {
  try {
    const res = await queryBuilder().count()
    const total = Number(res?.total)
    if (Number.isFinite(total)) return total
  } catch (e) {}
  const list = await fetchByPage(queryBuilder, 100, fallbackMaxFetch)
  return list.length
}

function chunkArray(arr = [], size = 20) {
  const list = []
  for (let i = 0; i < arr.length; i += size) {
    list.push(arr.slice(i, i + size))
  }
  return list
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function mapRiskLevelByScore(score = 0) {
  const n = Number(score || 0)
  if (n >= 70) return 'L3'
  if (n >= 40) return 'L2'
  if (n >= 20) return 'L1'
  return 'L0'
}

function mapLabelToCode(label = '') {
  const map = {
    新入驻: 'new_entry',
    临时组织: 'temporary_org',
    曾发生变更: 'activity_volatility',
    举报待处理: 'pending_report',
    待发布者决策: 'pending_organizer',
    参与波动: 'participant_volatility',
  }
  return map[label] || `legacy_${label}`
}

function toJson(value) {
  try {
    return JSON.stringify(value)
  } catch (e) {
    return ''
  }
}

async function buildReportStatsMap(activityIds = []) {
  const statsMap = {}
  const ids = [...new Set(activityIds.filter(Boolean))]
  if (!ids.length) return statsMap

  for (const group of chunkArray(ids, 20)) {
    const { data: reports } = await db.collection('adminActions')
      .where({
        action: 'report',
        targetId: _.in(group),
      })
      .field({
        targetId: true,
        reportStatus: true,
        createdAt: true,
      })
      .limit(500)
      .get()
      .catch(() => ({ data: [] }))

    ;(reports || []).forEach((item) => {
      const key = item.targetId
      if (!key) return
      if (!statsMap[key]) {
        statsMap[key] = {
          totalReports: 0,
          pendingReports: 0,
          handledReports: 0,
          ignoredReports: 0,
          latestReportAt: null,
        }
      }
      const row = statsMap[key]
      row.totalReports += 1
      const status = item.reportStatus || 'PENDING'
      if (status === 'HANDLED') row.handledReports += 1
      else if (status === 'IGNORED') row.ignoredReports += 1
      else row.pendingReports += 1

      const ts = new Date(item.createdAt).getTime()
      const latestTs = new Date(row.latestReportAt).getTime()
      if (Number.isFinite(ts) && (!Number.isFinite(latestTs) || ts > latestTs)) {
        row.latestReportAt = item.createdAt
      }
    })
  }
  return statsMap
}

function computeRiskEvaluation(activity, reportStats = {}, nowMs = Date.now()) {
  const trustLevel = activity?.trustProfile?.trustLevel ||
    (activity?.isVerified ? 'B' : 'C')
  const baseRiskScore = trustLevel === 'A' ? 6 : trustLevel === 'B' ? 16 : 30

  let riskScore = baseRiskScore
  const reasonCodes = []
  if (trustLevel === 'C') reasonCodes.push('BASE_TRUST_C')
  else if (trustLevel === 'B') reasonCodes.push('BASE_TRUST_B')

  const modificationRiskScore = Number(activity.modificationRiskScore || 0)
  if (modificationRiskScore >= 3) {
    riskScore += 36
    reasonCodes.push('MODIFICATION_HIGH')
  } else if (modificationRiskScore >= 2) {
    riskScore += 18
    reasonCodes.push('MODIFICATION_MEDIUM')
  }

  const pendingReports = Number(reportStats.pendingReports || 0)
  if (pendingReports > 0) {
    riskScore += Math.min(45, pendingReports * 15)
    reasonCodes.push('PENDING_REPORT')
  }

  const startMs = new Date(activity.startTime).getTime()
  const endMs = new Date(activity.endTime).getTime()
  if (Number.isFinite(startMs) && startMs > nowMs && startMs - nowMs <= 24 * 60 * 60 * 1000) {
    riskScore += 8
    reasonCodes.push('TEMPORARY_ORG')
  }
  if (Number.isFinite(startMs) && startMs > nowMs && startMs - nowMs <= 2 * 60 * 60 * 1000) {
    riskScore += 6
    reasonCodes.push('STARTING_SOON')
  }
  if (activity.formationStatus === 'PENDING_ORGANIZER') {
    riskScore += 18
    reasonCodes.push('PENDING_ORGANIZER')
  }
  if (activity.status === 'CANCELLED') {
    riskScore += 25
    reasonCodes.push('ACTIVITY_CANCELLED')
  }
  if (activity.isRecommended && trustLevel === 'A') {
    riskScore = Math.max(0, riskScore - 3)
    reasonCodes.push('OFFICIAL_RECOMMENDED')
  }

  const tagRules = [
    {
      code: 'new_entry',
      label: '新入驻',
      enabled: trustLevel === 'C',
      expiresAt: null,
      reasonCode: 'BASE_TRUST_C',
    },
    {
      code: 'activity_volatility',
      label: '曾发生变更',
      enabled: modificationRiskScore >= 2,
      expiresAt: new Date(nowMs + 30 * DAY_MS),
      reasonCode: modificationRiskScore >= 3 ? 'MODIFICATION_HIGH' : 'MODIFICATION_MEDIUM',
    },
    {
      code: 'temporary_org',
      label: '临时组织',
      enabled: Number.isFinite(startMs) && startMs > nowMs && startMs - nowMs <= 24 * 60 * 60 * 1000,
      expiresAt: Number.isFinite(endMs) ? new Date(endMs) : new Date(nowMs + DAY_MS),
      reasonCode: 'TEMPORARY_ORG',
    },
    {
      code: 'pending_report',
      label: '举报待处理',
      enabled: pendingReports > 0,
      expiresAt: new Date(nowMs + 7 * DAY_MS),
      reasonCode: 'PENDING_REPORT',
    },
    {
      code: 'pending_organizer',
      label: '待发布者决策',
      enabled: activity.formationStatus === 'PENDING_ORGANIZER',
      expiresAt: activity.organizerDecisionDeadline ? new Date(activity.organizerDecisionDeadline) : new Date(nowMs + DAY_MS),
      reasonCode: 'PENDING_ORGANIZER',
    },
  ]

  const riskLevel = mapRiskLevelByScore(riskScore)
  return {
    trustLevel,
    riskScore,
    riskLevel,
    reasonCodes: [...new Set(reasonCodes)],
    tagRules,
  }
}

function normalizeRiskTagMeta(activity = {}, nowMs = Date.now()) {
  const nowDate = new Date(nowMs)
  const legacyTags = safeArray(activity?.riskTags)
  const fromTrustProfile = safeArray(activity?.trustProfile?.riskTags)
  const current = safeArray(activity?.riskTagMeta).map((item) => ({
    code: item?.code || '',
    label: item?.label || item?.code || '',
    source: item?.source || 'manual',
    status: item?.status || 'active',
    createdAt: item?.createdAt || activity?.createdAt || nowDate,
    expiresAt: item?.expiresAt || null,
    rollbackAt: item?.rollbackAt || null,
    reasonCode: item?.reasonCode || '',
  })).filter((item) => item.code && item.label)

  const knownCodes = new Set(current.map((item) => item.code))
  ;[...legacyTags, ...fromTrustProfile].forEach((label) => {
    const code = mapLabelToCode(label)
    if (knownCodes.has(code)) return
    current.push({
      code,
      label,
      source: 'manual',
      status: 'active',
      createdAt: activity?.createdAt || nowDate,
      expiresAt: null,
      rollbackAt: null,
      reasonCode: 'LEGACY_TAG',
    })
    knownCodes.add(code)
  })

  let ttlExpiredCount = 0
  current.forEach((item) => {
    if (item.status !== 'active') return
    const expiresAtMs = new Date(item.expiresAt).getTime()
    if (!Number.isFinite(expiresAtMs) || expiresAtMs > nowMs) return
    item.status = 'expired'
    item.rollbackAt = nowDate
    item.reasonCode = item.reasonCode || 'TTL_EXPIRED'
    ttlExpiredCount += 1
  })

  return { meta: current, ttlExpiredCount }
}

function applyAutoTagRules(meta = [], tagRules = [], nowMs = Date.now()) {
  const nowDate = new Date(nowMs)
  let autoRollbackCount = 0
  const list = safeArray(meta).map((item) => ({ ...item }))

  const findActiveAuto = (code) => list.find((item) => item.code === code && item.source === 'auto' && item.status === 'active')

  safeArray(tagRules).forEach((rule) => {
    const exists = findActiveAuto(rule.code)
    if (rule.enabled) {
      if (exists) {
        exists.label = rule.label
        exists.expiresAt = rule.expiresAt || null
        exists.reasonCode = rule.reasonCode || exists.reasonCode || ''
      } else {
        list.push({
          code: rule.code,
          label: rule.label,
          source: 'auto',
          status: 'active',
          createdAt: nowDate,
          expiresAt: rule.expiresAt || null,
          rollbackAt: null,
          reasonCode: rule.reasonCode || '',
        })
      }
      return
    }

    if (exists) {
      exists.status = 'expired'
      exists.rollbackAt = nowDate
      exists.reasonCode = 'AUTO_RECOVERED'
      autoRollbackCount += 1
    }
  })

  return {
    meta: list,
    autoRollbackCount,
  }
}

function getActiveTagLabels(meta = [], nowMs = Date.now()) {
  return safeArray(meta)
    .filter((item) => {
      if (item.status !== 'active') return false
      const expiresAtMs = new Date(item.expiresAt).getTime()
      if (Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs) return false
      return true
    })
    .map((item) => item.label || item.code || '')
    .filter(Boolean)
}

async function refreshActivityRiskLayers(nowMs) {
  const activeActivities = await fetchByPage(
    () => db.collection('activities')
      .where({ status: _.in(['OPEN', 'FULL']) })
      .orderBy('createdAt', 'asc'),
    100,
    2000
  )
  if (!activeActivities.length) {
    return { scanned: 0, updated: 0, ttlRollbackCount: 0, manualOverrideRollbackCount: 0 }
  }

  const reportStatsMap = await buildReportStatsMap(activeActivities.map((item) => item._id))
  let updated = 0
  let ttlRollbackCount = 0

  for (const activity of activeActivities) {
    const reportStats = reportStatsMap[activity._id] || {}
    const evalResult = computeRiskEvaluation(activity, reportStats, nowMs)

    const normalized = normalizeRiskTagMeta(activity, nowMs)
    ttlRollbackCount += normalized.ttlExpiredCount
    const applied = applyAutoTagRules(normalized.meta, evalResult.tagRules, nowMs)
    ttlRollbackCount += applied.autoRollbackCount

    const activeTags = getActiveTagLabels(applied.meta, nowMs)
    const currentDecayStartedAt = activity.decayStartedAt || null
    const currentParticipantFeedback = activity.participantFeedback && typeof activity.participantFeedback === 'object'
      ? activity.participantFeedback
      : { held: 0, notHeld: 0 }
    const effectiveScore = Number.isFinite(Number(activity.effectiveScore))
      ? Number(activity.effectiveScore)
      : (evalResult.trustLevel === 'A' ? 85 : evalResult.trustLevel === 'B' ? 70 : 60)

    const riskControl = {
      autoDecisionCoverage: 0.8,
      autoRiskScore: evalResult.riskScore,
      autoRiskLevel: evalResult.riskLevel,
      autoReasonCodes: evalResult.reasonCodes,
      manualReviewRequired: evalResult.riskLevel === 'L3',
      needsBatchReview: evalResult.riskLevel === 'L2',
      lastEvaluatedAt: new Date(nowMs),
      ttlRollbackCount: Number(activity?.riskControl?.ttlRollbackCount || 0) + normalized.ttlExpiredCount + applied.autoRollbackCount,
    }

    const nextTrustProfile = {
      ...(activity.trustProfile || {}),
      riskTags: activeTags.slice(0, 3),
      riskLevel: evalResult.riskLevel,
    }

    const nextSnapshot = {
      riskLevel: evalResult.riskLevel,
      riskScore: evalResult.riskScore,
      riskReasonCodes: evalResult.reasonCodes,
      riskTags: activeTags,
      riskTagMeta: applied.meta,
      riskControl,
      effectiveScore,
      decayStartedAt: currentDecayStartedAt,
      participantFeedback: currentParticipantFeedback,
      trustProfile: nextTrustProfile,
    }
    const prevSnapshot = {
      riskLevel: activity.riskLevel || '',
      riskScore: Number(activity.riskScore || 0),
      riskReasonCodes: safeArray(activity.riskReasonCodes),
      riskTags: safeArray(activity.riskTags),
      riskTagMeta: safeArray(activity.riskTagMeta),
      riskControl: {
        autoRiskScore: Number(activity?.riskControl?.autoRiskScore || 0),
        autoRiskLevel: activity?.riskControl?.autoRiskLevel || '',
        autoReasonCodes: safeArray(activity?.riskControl?.autoReasonCodes),
        manualReviewRequired: !!activity?.riskControl?.manualReviewRequired,
        needsBatchReview: !!activity?.riskControl?.needsBatchReview,
      },
      effectiveScore: Number.isFinite(Number(activity.effectiveScore)) ? Number(activity.effectiveScore) : null,
      decayStartedAt: activity.decayStartedAt || null,
      participantFeedback: activity.participantFeedback && typeof activity.participantFeedback === 'object'
        ? activity.participantFeedback
        : { held: 0, notHeld: 0 },
      trustProfile: {
        ...(activity.trustProfile || {}),
        riskTags: safeArray(activity?.trustProfile?.riskTags),
        riskLevel: activity?.trustProfile?.riskLevel || '',
      },
    }

    if (toJson(prevSnapshot) === toJson(nextSnapshot)) continue

    await db.collection('activities').doc(activity._id).update({
      data: {
        ...nextSnapshot,
        riskAutoVersion: 'v1.0',
        riskAutoEvaluatedAt: db.serverDate(),
      },
    })
    updated += 1
  }

  let manualOverrideRollbackCount = 0
  const expiringActions = await fetchByPage(
    () => db.collection('adminActions')
      .where({
        targetType: 'activity',
        expiresAt: _.lte(new Date(nowMs)),
        rollbackAt: null,
      })
      .orderBy('createdAt', 'asc'),
    50,
    500
  )

  for (const actionRow of expiringActions) {
    const beforeActivity = actionRow?.beforeState?.activity || actionRow?.beforeState || null
    const targetActivityId = actionRow?.linkedActivityId || actionRow?.targetId
    if (!targetActivityId || !beforeActivity || typeof beforeActivity !== 'object') {
      await db.collection('adminActions').doc(actionRow._id).update({
        data: {
          rollbackAt: db.serverDate(),
          rollbackResult: 'SKIPPED_NO_BEFORE_STATE',
          updatedAt: db.serverDate(),
        },
      })
      continue
    }

    const restorePatch = {}
    ;[
      'status',
      'isRecommended',
      'riskTags',
      'riskTagMeta',
      'riskLevel',
      'riskScore',
      'riskReasonCodes',
      'trustProfile',
      'effectiveScore',
      'decayStartedAt',
      'participantFeedback',
      'riskControl',
    ].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(beforeActivity, key)) {
        restorePatch[key] = beforeActivity[key]
      }
    })

    if (Object.keys(restorePatch).length > 0) {
      restorePatch.updatedAt = db.serverDate()
      await db.collection('activities').doc(targetActivityId).update({ data: restorePatch }).catch(() => null)
      manualOverrideRollbackCount += 1
    }

    await db.collection('adminActions').doc(actionRow._id).update({
      data: {
        rollbackAt: db.serverDate(),
        rollbackResult: Object.keys(restorePatch).length > 0 ? 'ROLLBACK_DONE' : 'SKIPPED_EMPTY_PATCH',
        updatedAt: db.serverDate(),
      },
    })
  }

  return {
    scanned: activeActivities.length,
    updated,
    ttlRollbackCount,
    manualOverrideRollbackCount,
  }
}

async function fetchByPage(queryBuilder, pageSize = 100, maxFetch = 1000) {
  const list = []
  let skip = 0
  while (skip < maxFetch) {
    const query = queryBuilder()
      .skip(skip)
      .limit(pageSize)
    const { data } = await query.get()
    if (!data || data.length === 0) break
    list.push(...data)
    skip += data.length
    if (data.length < pageSize) break
  }
  return list
}

async function notifyFormationResult(activity, formationStatus, customTips = '') {
  const { data: parts } = await db.collection('participations')
    .where({ activityId: activity._id, status: 'joined' })
    .get()

  if (!parts.length) return

  const timeText = formatDateText(activity.startTime)
  const tips = customTips || (formationStatus === 'CONFIRMED'
    ? '活动已成团，请准时参加'
    : '很遗憾未能成团，期待下次相遇')

  await Promise.allSettled(parts.map((p) => {
    const openid = p.userId || p._openid
    if (!openid) return Promise.resolve()
    return cloud.callFunction({
      name: 'sendNotification',
      data: {
        type: 'formation_result',
        openid,
        data: {
          title: activity.title,
          groupCount: `${Number(activity.currentParticipants) || 0}人`,
          time: timeText,
          location: (activity.location && activity.location.address) || '见活动详情',
          tips,
        }
      }
    })
  }))
}

async function notifyOrganizerPendingDecision(activity, decisionDeadline) {
  if (!activity?.publisherId) return
  const current = Number(activity.currentParticipants) || 0
  const min = Number(activity.minParticipants) || 0
  const shortage = Math.max(0, min - current)
  const tips = shortage > 0
    ? `还差${shortage}人，请在${formatDateText(decisionDeadline)}前决定是否延长窗口`
    : `已达成团人数，请在${formatDateText(decisionDeadline)}前确认活动安排`
  await cloud.callFunction({
    name: 'sendNotification',
    data: {
      type: 'formation_result',
      openid: activity.publisherId,
      data: {
        title: activity.title,
        groupCount: `${current}人`,
        time: formatDateText(activity.startTime),
        location: (activity.location && activity.location.address) || '见活动详情',
        tips,
      },
    },
  })
}

async function collectMetricCityIds() {
  const citySet = new Set([DEFAULT_CITY_CONFIG.cityId])

  const tryCollectFromConfig = async (collectionName) => {
    try {
      const rows = await fetchByPage(
        () => db.collection(collectionName)
          .field({ cityId: true })
          .limit(100),
        100,
        200
      )
      rows.forEach((item) => {
        const cityId = String(item?.cityId || '').trim()
        if (cityId) citySet.add(cityId)
      })
    } catch (e) {}
  }

  await Promise.allSettled([
    tryCollectFromConfig('cityConfigs'),
    tryCollectFromConfig('cityConfig'),
  ])

  if (citySet.size <= 1) {
    try {
      const rows = await fetchByPage(
        () => db.collection('activities')
          .field({ cityId: true })
          .orderBy('createdAt', 'desc')
          .limit(100),
        100,
        300
      )
      rows.forEach((item) => {
        const cityId = String(item?.cityId || '').trim()
        if (cityId) citySet.add(cityId)
      })
    } catch (e) {}
  }

  return [...citySet]
}

async function upsertSupplyMetric(cityId, dateKey, data) {
  const col = db.collection(SUPPLY_METRICS_COLLECTION)
  const { data: existing } = await col.where({ cityId, dateKey }).limit(1).get()
  if (existing && existing[0]) {
    await col.doc(existing[0]._id).update({
      data: {
        ...data,
        updatedAt: db.serverDate(),
      },
    })
    return { mode: 'update', id: existing[0]._id }
  }
  const addRes = await col.add({
    data: {
      cityId,
      dateKey,
      ...data,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })
  return { mode: 'add', id: addRes._id }
}

async function buildAndSaveSupplyMetrics(nowMs) {
  const todayKey = toChinaDateKey(nowMs)
  const yesterdayKey = toChinaDateKey(nowMs - DAY_MS)
  const dayKeys = Array.from({ length: 7 }, (_, idx) => toChinaDateKey(nowMs - idx * DAY_MS))
  const cityIds = await collectMetricCityIds()
  const saved = []

  for (const cityIdRaw of cityIds) {
    const cityId = String(cityIdRaw || '').trim() || DEFAULT_CITY_CONFIG.cityId
    const cityConfig = await getCityConfig(cityId)
    const threshold = cityConfig.operations.supplyAlertThreshold
    const todayRange = getChinaDayRange(todayKey)

    const activitiesCreatedCount = await safeCount(() => db.collection('activities').where({
      cityId,
      createdAt: _.gte(todayRange.start).and(_.lt(todayRange.end)),
    }))
    const { data: todayPublishedRows } = await db.collection('activities')
      .where({
        cityId,
        createdAt: _.gte(todayRange.start).and(_.lt(todayRange.end)),
      })
      .field({
        publisherId: true,
      })
      .limit(500)
      .get()
      .catch(() => ({ data: [] }))
    const publisherCounter = {}
    ;(todayPublishedRows || []).forEach((item) => {
      const key = String(item.publisherId || '').trim()
      if (!key) return
      publisherCounter[key] = (publisherCounter[key] || 0) + 1
    })
    const uniquePublishers = Object.keys(publisherCounter).length
    const repeatPublishers = Object.keys(publisherCounter)
      .filter((key) => Number(publisherCounter[key] || 0) > 1)
      .length

    const joinedCount = await safeCount(() => db.collection('participations').where({
      cityId,
      joinedAt: _.gte(todayRange.start).and(_.lt(todayRange.end)),
    }))
    const newUsersCount = await safeCount(() => db.collection('users').where({
      cityId,
      registeredDateKey: todayKey,
    }))
    const dauCount = await safeCount(() => db.collection('users').where({
      cityId,
      loginDateKeyLatest: todayKey,
    }))

    const formationConfirmedCount = await safeCount(() => db.collection('activities').where({
      cityId,
      isGroupFormation: true,
      formationStatus: 'CONFIRMED',
      updatedAt: _.gte(todayRange.start).and(_.lt(todayRange.end)),
    }))
    const formationFailedCount = await safeCount(() => db.collection('activities').where({
      cityId,
      isGroupFormation: true,
      formationStatus: 'FAILED',
      updatedAt: _.gte(todayRange.start).and(_.lt(todayRange.end)),
    }))
    const formationResolvedCount = formationConfirmedCount + formationFailedCount
    const activitiesArchived = await safeCount(() => db.collection('activities').where({
      cityId,
      autoArchivedAt: _.gte(todayRange.start).and(_.lt(todayRange.end)),
    }))

    const d1EligibleCount = await safeCount(() => db.collection('users').where({
      cityId,
      registeredDateKey: yesterdayKey,
    }))
    const d1RetainedCount = await safeCount(() => db.collection('users').where({
      cityId,
      registeredDateKey: yesterdayKey,
      loginDateKeyLatest: todayKey,
    }))
    const d1RetentionRate = d1EligibleCount > 0
      ? Number((d1RetainedCount / d1EligibleCount).toFixed(4))
      : 0

    const { data: weekRows } = await db.collection(SUPPLY_METRICS_COLLECTION)
      .where({
        cityId,
        dateKey: _.in(dayKeys),
      })
      .field({
        dateKey: true,
        activitiesCreatedCount: true,
        joinedCount: true,
        newUsersCount: true,
        dauCount: true,
        formationResolvedCount: true,
        formationConfirmedCount: true,
        d1EligibleCount: true,
        d1RetainedCount: true,
      })
      .limit(30)
      .get()
      .catch(() => ({ data: [] }))

    const todaySnapshot = {
      dateKey: todayKey,
      activitiesCreatedCount,
      joinedCount,
      newUsersCount,
      dauCount,
      formationResolvedCount,
      formationConfirmedCount,
      d1EligibleCount,
      d1RetainedCount,
    }

    const weekMap = (weekRows || []).reduce((acc, item) => {
      acc[item.dateKey] = item
      return acc
    }, {})
    weekMap[todayKey] = todaySnapshot
    const weekList = dayKeys
      .map((key) => weekMap[key])
      .filter(Boolean)

    const weekSummary = weekList.reduce((acc, item) => {
      acc.activitiesCreatedCount += Number(item.activitiesCreatedCount || 0)
      acc.joinedCount += Number(item.joinedCount || 0)
      acc.newUsersCount += Number(item.newUsersCount || 0)
      acc.dauCount += Number(item.dauCount || 0)
      acc.formationResolvedCount += Number(item.formationResolvedCount || 0)
      acc.formationConfirmedCount += Number(item.formationConfirmedCount || 0)
      acc.d1EligibleCount += Number(item.d1EligibleCount || 0)
      acc.d1RetainedCount += Number(item.d1RetainedCount || 0)
      return acc
    }, {
      activitiesCreatedCount: 0,
      joinedCount: 0,
      newUsersCount: 0,
      dauCount: 0,
      formationResolvedCount: 0,
      formationConfirmedCount: 0,
      d1EligibleCount: 0,
      d1RetainedCount: 0,
    })

    const windowDays = Math.max(1, weekList.length)
    const weekFormationRate = weekSummary.formationResolvedCount > 0
      ? Number((weekSummary.formationConfirmedCount / weekSummary.formationResolvedCount).toFixed(4))
      : 0
    const weekD1RetentionRate = weekSummary.d1EligibleCount > 0
      ? Number((weekSummary.d1RetainedCount / weekSummary.d1EligibleCount).toFixed(4))
      : 0
    const weekAvgDailyActivities = Number((weekSummary.activitiesCreatedCount / windowDays).toFixed(2))

    const alertFlags = []
    if (weekAvgDailyActivities < Number(threshold.minDailyActivities || 0)) {
      alertFlags.push('LOW_DAILY_SUPPLY')
    }
    if (weekFormationRate < Number(threshold.minFormationRate || 0)) {
      alertFlags.push('LOW_FORMATION_RATE')
    }
    if (weekD1RetentionRate < Number(threshold.minD1RetentionRate || 0)) {
      alertFlags.push('LOW_D1_RETENTION')
    }

    const upsertRes = await upsertSupplyMetric(cityId, todayKey, {
      cityConfigVersion: cityConfig.version,
      dayStartAt: todayRange.start,
      dayEndAt: todayRange.end,
      activitiesCreatedCount,
      activitiesPublished: activitiesCreatedCount,
      activitiesFormed: formationConfirmedCount,
      activitiesArchived,
      formationRate: formationResolvedCount > 0
        ? Number((formationConfirmedCount / formationResolvedCount).toFixed(4))
        : 0,
      uniquePublishers,
      repeatPublishers,
      joinedCount,
      newUsersCount,
      dauCount,
      formationConfirmedCount,
      formationFailedCount,
      formationResolvedCount,
      d1EligibleCount,
      d1RetainedCount,
      d1RetentionRate,
      weekWindow: {
        startDateKey: dayKeys[dayKeys.length - 1],
        endDateKey: dayKeys[0],
        days: windowDays,
      },
      weekSummary: {
        ...weekSummary,
        avgDailyActivities: weekAvgDailyActivities,
        formationRate: weekFormationRate,
        d1RetentionRate: weekD1RetentionRate,
      },
      threshold,
      alertFlags,
      alertReasons: alertFlags,
      alertLevel: alertFlags.length >= 2 ? 'high' : alertFlags.length === 1 ? 'medium' : 'normal',
    })

    saved.push({
      cityId,
      dateKey: todayKey,
      mode: upsertRes.mode,
      alertCount: alertFlags.length,
      avgDailyActivities: weekAvgDailyActivities,
      formationRate: weekFormationRate,
      d1RetentionRate: weekD1RetentionRate,
    })
  }

  return {
    dateKey: todayKey,
    cityCount: cityIds.length,
    saved,
  }
}

exports.main = async () => {
  const now = new Date()
  const nowMs = now.getTime()
  console.log(`[autoUpdateStatus] 开始执行 ${now.toISOString()}`)

  const activeActivities = await fetchByPage(
    () => db.collection('activities')
      .where({ status: _.in(['OPEN', 'FULL']) })
      .orderBy('createdAt', 'asc'),
    100,
    2000
  )

  let endedCount = 0
  let endFormationSettledCount = 0
  for (const activity of activeActivities) {
    const endMs = new Date(activity.endTime).getTime()
    if (!Number.isFinite(endMs) || endMs >= nowMs) continue

    let formationStatus = activity.formationStatus
    const updateData = {
      status: 'ENDED',
      updatedAt: db.serverDate(),
    }

    if (activity.isGroupFormation) {
      const min = Number(activity.minParticipants) || 0
      const current = Number(activity.currentParticipants) || 0
      formationStatus = current >= min ? 'CONFIRMED' : 'FAILED'
      updateData.formationStatus = formationStatus
      updateData.organizerDecisionDeadline = null
      if (formationStatus === 'CONFIRMED' && !activity.formationConfirmedAt) {
        updateData.formationConfirmedAt = db.serverDate()
      }
      if (formationStatus === 'FAILED') {
        updateData.autoArchivedAt = db.serverDate()
        updateData.autoArchiveReason = 'END_TIME_REACHED'
      }
    }

    await db.collection('activities').doc(activity._id).update({ data: updateData })

    if (
      activity.isGroupFormation &&
      formationStatus &&
      ['CONFIRMED', 'FAILED'].includes(formationStatus) &&
      activity.formationStatus !== formationStatus
    ) {
      try {
        await notifyFormationResult(activity, formationStatus)
      } catch (e) {
        console.error('发送成团通知失败', e)
      }
      endFormationSettledCount++
    }

    endedCount++
  }
  console.log(`[autoUpdateStatus] 活跃活动扫描数: ${activeActivities.length}，结束活动数: ${endedCount}`)

  const formationWatchedActivities = await fetchByPage(
    () => db.collection('activities')
      .where({
        isGroupFormation: true,
        formationStatus: _.in(['FORMING', 'PENDING_ORGANIZER']),
        status: _.in(['OPEN', 'FULL']),
      })
      .orderBy('createdAt', 'asc'),
    100,
    2000
  )

  let formationConfirmedCount = 0
  let formationPendingCount = 0
  let pendingAutoArchivedCount = 0

  for (const activity of formationWatchedActivities) {
    const minParticipants = Number(activity.minParticipants) || 0
    const currentParticipants = Number(activity.currentParticipants) || 0
    const isFormed = currentParticipants >= minParticipants

    if (activity.formationStatus === 'FORMING') {
      if (!activity.formationDeadline) continue
      const deadlineMs = new Date(activity.formationDeadline).getTime()
      if (!Number.isFinite(deadlineMs) || deadlineMs > nowMs) continue

      if (isFormed) {
        await db.collection('activities').doc(activity._id).update({
          data: {
            formationStatus: 'CONFIRMED',
            organizerDecisionDeadline: null,
            formationConfirmedAt: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })
        try {
          await notifyFormationResult(activity, 'CONFIRMED')
        } catch (e) {
          console.error('发送成团通知失败', e)
        }
        formationConfirmedCount++
        continue
      }

      const cityConfig = await getCityConfig(activity.cityId || DEFAULT_CITY_CONFIG.cityId)
      const timeoutHours = normalizeNumber(
        activity.organizerDecisionTimeoutHours,
        cityConfig.groupFormation.organizerDecisionTimeoutHours
      )
      const organizerDecisionDeadline = new Date(nowMs + timeoutHours * 60 * 60 * 1000)

      await db.collection('activities').doc(activity._id).update({
        data: {
          formationStatus: 'PENDING_ORGANIZER',
          organizerDecisionDeadline,
          updatedAt: db.serverDate(),
        },
      })
      try {
        await notifyOrganizerPendingDecision(activity, organizerDecisionDeadline)
      } catch (e) {
        console.error('发送发布者待决策提醒失败', e)
      }
      formationPendingCount++
      continue
    }

    if (activity.formationStatus === 'PENDING_ORGANIZER') {
      if (isFormed) {
        await db.collection('activities').doc(activity._id).update({
          data: {
            formationStatus: 'CONFIRMED',
            organizerDecisionDeadline: null,
            formationConfirmedAt: db.serverDate(),
            updatedAt: db.serverDate(),
          },
        })
        try {
          await notifyFormationResult(activity, 'CONFIRMED')
        } catch (e) {
          console.error('发送成团通知失败', e)
        }
        formationConfirmedCount++
        continue
      }

      let decisionDeadlineMs = new Date(activity.organizerDecisionDeadline).getTime()
      if (!Number.isFinite(decisionDeadlineMs)) {
        const cityConfig = await getCityConfig(activity.cityId || DEFAULT_CITY_CONFIG.cityId)
        const timeoutHours = normalizeNumber(
          activity.organizerDecisionTimeoutHours,
          cityConfig.groupFormation.organizerDecisionTimeoutHours
        )
        const fallbackDeadline = new Date(nowMs + timeoutHours * 60 * 60 * 1000)
        await db.collection('activities').doc(activity._id).update({
          data: {
            organizerDecisionDeadline: fallbackDeadline,
            updatedAt: db.serverDate(),
          },
        })
        decisionDeadlineMs = fallbackDeadline.getTime()
      }

      if (decisionDeadlineMs > nowMs) continue

      await db.collection('activities').doc(activity._id).update({
        data: {
          formationStatus: 'FAILED',
          status: 'ENDED',
          organizerDecisionDeadline: null,
          autoArchivedAt: db.serverDate(),
          autoArchiveReason: 'ORGANIZER_TIMEOUT',
          updatedAt: db.serverDate(),
        },
      })
      try {
        await notifyFormationResult(activity, 'FAILED', '24小时内未收到发布者延长决策，活动已自动归档')
      } catch (e) {
        console.error('发送自动归档失败通知失败', e)
      }
      pendingAutoArchivedCount++
    }
  }
  console.log(`[autoUpdateStatus] 成团状态扫描数: ${formationWatchedActivities.length}，转待决策: ${formationPendingCount}，确认成团: ${formationConfirmedCount}，超时归档: ${pendingAutoArchivedCount}`)

  let riskLayerResult = null
  let riskLayerError = ''
  try {
    riskLayerResult = await refreshActivityRiskLayers(nowMs)
  } catch (e) {
    riskLayerError = String(e?.message || e)
    console.error('[autoUpdateStatus] 自动风险分层失败', e)
  }

  let metricsResult = null
  let metricsError = ''
  try {
    metricsResult = await buildAndSaveSupplyMetrics(nowMs)
  } catch (e) {
    metricsError = String(e?.message || e)
    console.error('[autoUpdateStatus] 供给指标落库失败', e)
  }

  return {
    success: true,
    scannedActiveCount: activeActivities.length,
    endedCount,
    endFormationSettledCount,
    scannedFormingCount: formationWatchedActivities.length,
    formationConfirmedCount,
    formationPendingCount,
    pendingAutoArchivedCount,
    riskLayerResult,
    riskLayerError,
    metricsResult,
    metricsError,
    executedAt: now.toISOString(),
  }
}
