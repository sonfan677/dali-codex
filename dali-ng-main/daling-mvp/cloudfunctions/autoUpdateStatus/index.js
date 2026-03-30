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
    metricsResult,
    metricsError,
    executedAt: now.toISOString(),
  }
}
