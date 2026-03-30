const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const DEFAULT_CITY_CONFIG = {
  cityId: 'dali',
  version: 'v1-default',
  groupFormation: {
    defaultWindow: 30,
    allowedWindows: [15, 30, 60],
    maxWindowExtensions: 3,
  },
}

function normalizeNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function mergeCityConfig(raw = {}, cityId = '') {
  const finalCityId = cityId || raw.cityId || DEFAULT_CITY_CONFIG.cityId
  const allowedWindows = Array.isArray(raw.groupFormation?.allowedWindows) && raw.groupFormation.allowedWindows.length
    ? raw.groupFormation.allowedWindows.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
    : [...DEFAULT_CITY_CONFIG.groupFormation.allowedWindows]
  return {
    cityId: finalCityId,
    version: raw.version || DEFAULT_CITY_CONFIG.version,
    groupFormation: {
      defaultWindow: normalizeNumber(raw.groupFormation?.defaultWindow, DEFAULT_CITY_CONFIG.groupFormation.defaultWindow),
      allowedWindows: allowedWindows.length ? allowedWindows : [...DEFAULT_CITY_CONFIG.groupFormation.allowedWindows],
      maxWindowExtensions: normalizeNumber(
        raw.groupFormation?.maxWindowExtensions,
        DEFAULT_CITY_CONFIG.groupFormation.maxWindowExtensions
      ),
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

function normalizeWindowOptions(activity, cityConfig) {
  const fromActivity = Array.isArray(activity?.formationWindowOptions)
    ? activity.formationWindowOptions.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
    : []
  const fromConfig = Array.isArray(cityConfig?.groupFormation?.allowedWindows)
    ? cityConfig.groupFormation.allowedWindows.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
    : []
  const fallback = [...DEFAULT_CITY_CONFIG.groupFormation.allowedWindows]
  const merged = [...new Set([...fromActivity, ...fromConfig, ...fallback])]
  return merged.sort((a, b) => a - b)
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId, extensionMinutes } = event || {}

  if (!activityId) {
    return { success: false, error: 'INVALID_ACTIVITY_ID', message: '缺少活动ID' }
  }

  const tx = await db.startTransaction()
  try {
    const actRes = await tx.collection('activities').doc(activityId).get().catch(() => null)
    if (!actRes || !actRes.data) {
      await tx.rollback()
      return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
    }

    const activity = actRes.data
    if (activity.publisherId !== OPENID) {
      await tx.rollback()
      return { success: false, error: 'UNAUTHORIZED', message: '仅发布者可操作' }
    }
    if (!activity.isGroupFormation) {
      await tx.rollback()
      return { success: false, error: 'NOT_GROUP_FORMATION', message: '仅成团活动可延长窗口' }
    }
    if (['ENDED', 'CANCELLED'].includes(activity.status)) {
      await tx.rollback()
      return { success: false, error: 'NOT_EDITABLE', message: '活动已结束或已取消' }
    }
    if (activity.formationStatus !== 'PENDING_ORGANIZER') {
      await tx.rollback()
      return {
        success: false,
        error: 'INVALID_STATUS',
        message: '当前不是待决策状态，无法延长窗口',
      }
    }

    const cityConfig = await loadCityConfig(activity.cityId || DEFAULT_CITY_CONFIG.cityId)
    const allowedWindows = normalizeWindowOptions(activity, cityConfig)
    const parsedWindow = Number(extensionMinutes)
    const fallbackWindow = allowedWindows.includes(Number(activity.formationWindow))
      ? Number(activity.formationWindow)
      : normalizeNumber(cityConfig.groupFormation.defaultWindow, DEFAULT_CITY_CONFIG.groupFormation.defaultWindow)
    const nextWindow = Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : fallbackWindow

    if (!allowedWindows.includes(nextWindow)) {
      await tx.rollback()
      return {
        success: false,
        error: 'INVALID_WINDOW',
        message: `可选窗口仅支持：${allowedWindows.join(' / ')} 分钟`,
      }
    }

    const maxWindowExtensions = normalizeNumber(
      activity.maxWindowExtensions,
      normalizeNumber(cityConfig.groupFormation.maxWindowExtensions, DEFAULT_CITY_CONFIG.groupFormation.maxWindowExtensions)
    )
    const extendWindowCount = normalizeNumber(activity.extendWindowCount, 0)
    if (extendWindowCount >= maxWindowExtensions) {
      await tx.rollback()
      return {
        success: false,
        error: 'WINDOW_EXTENSION_LIMIT',
        message: '已达到可延长次数上限',
      }
    }

    const nowMs = Date.now()
    const nextFormationDeadline = new Date(nowMs + nextWindow * 60 * 1000)
    const history = Array.isArray(activity.windowExtensionHistory) ? activity.windowExtensionHistory.slice(-9) : []
    history.push({
      action: 'extend_window',
      at: new Date(nowMs),
      operator: OPENID,
      fromStatus: activity.formationStatus,
      previousDeadline: activity.formationDeadline || null,
      nextWindow,
    })

    await tx.collection('activities').doc(activityId).update({
      data: {
        formationStatus: 'FORMING',
        formationWindow: nextWindow,
        formationDeadline: nextFormationDeadline,
        organizerDecisionDeadline: null,
        extendWindowCount: extendWindowCount + 1,
        maxWindowExtensions,
        formationWindowOptions: allowedWindows,
        windowExtensionHistory: history,
        updatedAt: db.serverDate(),
      },
    })

    await tx.commit()

    return {
      success: true,
      activityId,
      formationStatus: 'FORMING',
      formationWindow: nextWindow,
      formationDeadline: nextFormationDeadline,
      extendWindowCount: extendWindowCount + 1,
      maxWindowExtensions,
      formationWindowOptions: allowedWindows,
      serverTimestamp: nowMs,
    }
  } catch (e) {
    try { await tx.rollback() } catch (rollbackErr) {}
    console.error('extendFormationWindow failed:', e)
    return {
      success: false,
      error: 'FAILED',
      message: '延长窗口失败，请稍后重试',
    }
  }
}
