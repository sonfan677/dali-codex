const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const VERIFY_AUTO_APPROVE_DEFAULT_MINUTES = 10

const DEFAULT_CITY_CONFIG = {
  cityId: 'dali',
  version: 'v1-default',
  geo: {
    defaultFenceRadius: 5000,
    minFenceRadius: 2000,
    coordinateSystem: 'GCJ02',
  },
  groupFormation: {
    defaultWindow: 30,
    allowedWindows: [15, 30, 60],
    absoluteMinParticipants: 2,
    maxWindowExtensions: 3,
    organizerDecisionTimeoutHours: 24,
  },
  operations: {
    supplyAlertThreshold: {
      minDailyActivities: 5,
      minFormationRate: 0.4,
      minD1RetentionRate: 0.25,
    },
  }
}

const CATEGORY_MAP = {
  sport: '运动',
  music: '音乐',
  reading: '读书',
  game: '游戏',
  social: '社交',
  outdoor: '户外',
  food: '美食',
  movie: '电影',
  travel: '旅行',
  other: '其他',
}

// 大理白族自治州发布范围（近似地理围栏，后续可改为配置化 polygon）
const DALI_PREFECTURE_BOUNDS = {
  minLat: 24.5,
  maxLat: 26.7,
  minLng: 98.7,
  maxLng: 101.3,
}

function isInDaliPrefecture(lat, lng) {
  const nLat = Number(lat)
  const nLng = Number(lng)
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false
  return (
    nLat >= DALI_PREFECTURE_BOUNDS.minLat &&
    nLat <= DALI_PREFECTURE_BOUNDS.maxLat &&
    nLng >= DALI_PREFECTURE_BOUNDS.minLng &&
    nLng <= DALI_PREFECTURE_BOUNDS.maxLng
  )
}

function normalizeCustomCategoryLabel(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function normalizeCategoryText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·•・,，。!！?？:：;；、'"`~～\-—_（）()【】\[\]\/\\]/g, '')
}

function resolveDuplicateCategoryLabel(customLabel = '') {
  const normalized = normalizeCategoryText(customLabel)
  if (!normalized) return ''
  const builtinLabels = Object.values(CATEGORY_MAP || {})
  const aliasLabels = ['其它']
  const allLabels = [...builtinLabels, ...aliasLabels]
  const hit = allLabels.find((item) => normalizeCategoryText(item) === normalized)
  return hit || ''
}

async function recordCustomCategoryStat({
  cityId = 'dali',
  customCategoryLabel = '',
  activityId = '',
  publisherId = '',
} = {}) {
  const latestLabel = normalizeCustomCategoryLabel(customCategoryLabel)
  if (!latestLabel) return
  const normalizedLabel = latestLabel.toLowerCase()
  try {
    const { data } = await db.collection('categoryCustomStats')
      .where({ cityId, normalizedLabel })
      .limit(1)
      .get()
    const existed = Array.isArray(data) ? data[0] : null
    if (existed?._id) {
      await db.collection('categoryCustomStats').doc(existed._id).update({
        data: {
          count: _.inc(1),
          latestLabel,
          lastActivityId: activityId || existed.lastActivityId || '',
          lastPublisherId: publisherId || existed.lastPublisherId || '',
          lastUsedAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      return
    }

    await db.collection('categoryCustomStats').add({
      data: {
        cityId,
        normalizedLabel,
        latestLabel,
        count: 1,
        firstUsedAt: db.serverDate(),
        lastUsedAt: db.serverDate(),
        lastActivityId: activityId || '',
        lastPublisherId: publisherId || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  } catch (e) {
    console.error('记录自定义分类统计失败', e)
  }
}

function buildTrustProfileForPublish(user) {
  const trustLevel = user?.platformVerified || user?.trustVerified ? 'A' : 'B'
  const displayStars = trustLevel === 'A' ? 5 : 4
  const identityLabel = trustLevel === 'A' ? '平台核验' : '已认证'
  const riskLevel = trustLevel === 'A' ? 'L0' : 'L1'
  return {
    trustLevel,
    displayStars,
    starText: `${'★'.repeat(displayStars)}${'☆'.repeat(5 - displayStars)}`,
    identityLabel,
    riskTags: [],
    riskLevel,
    internalScore: trustLevel === 'A' ? 90 : 75,
  }
}

function getBaseEffectiveScore(trustLevel = 'C') {
  if (trustLevel === 'A') return 85
  if (trustLevel === 'B') return 70
  return 60
}

function normalizeNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function mergeCityConfig(raw = {}, cityId = '') {
  const defaultConfig = DEFAULT_CITY_CONFIG
  const finalCityId = cityId || raw.cityId || defaultConfig.cityId
  return {
    cityId: finalCityId,
    version: raw.version || defaultConfig.version,
    geo: {
      defaultFenceRadius: normalizeNumber(raw.geo?.defaultFenceRadius, defaultConfig.geo.defaultFenceRadius),
      minFenceRadius: normalizeNumber(raw.geo?.minFenceRadius, defaultConfig.geo.minFenceRadius),
      coordinateSystem: raw.geo?.coordinateSystem || defaultConfig.geo.coordinateSystem,
    },
    groupFormation: {
      defaultWindow: normalizeNumber(raw.groupFormation?.defaultWindow, defaultConfig.groupFormation.defaultWindow),
      allowedWindows: Array.isArray(raw.groupFormation?.allowedWindows) && raw.groupFormation.allowedWindows.length
        ? raw.groupFormation.allowedWindows.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
        : [...defaultConfig.groupFormation.allowedWindows],
      absoluteMinParticipants: normalizeNumber(
        raw.groupFormation?.absoluteMinParticipants,
        defaultConfig.groupFormation.absoluteMinParticipants
      ),
      maxWindowExtensions: normalizeNumber(
        raw.groupFormation?.maxWindowExtensions,
        defaultConfig.groupFormation.maxWindowExtensions
      ),
      organizerDecisionTimeoutHours: normalizeNumber(
        raw.groupFormation?.organizerDecisionTimeoutHours,
        defaultConfig.groupFormation.organizerDecisionTimeoutHours
      ),
    },
    operations: {
      supplyAlertThreshold: {
        minDailyActivities: normalizeNumber(
          raw.operations?.supplyAlertThreshold?.minDailyActivities,
          defaultConfig.operations.supplyAlertThreshold.minDailyActivities
        ),
        minFormationRate: normalizeNumber(
          raw.operations?.supplyAlertThreshold?.minFormationRate,
          defaultConfig.operations.supplyAlertThreshold.minFormationRate
        ),
        minD1RetentionRate: normalizeNumber(
          raw.operations?.supplyAlertThreshold?.minD1RetentionRate,
          defaultConfig.operations.supplyAlertThreshold.minD1RetentionRate
        ),
      },
    },
  }
}

function mergeReasonCodes(existing = [], incoming = '') {
  const base = Array.isArray(existing) ? existing.filter(Boolean) : []
  if (incoming) base.push(incoming)
  return [...new Set(base)].slice(0, 8)
}

function normalizeIdentityReasons(raw) {
  const list = Array.isArray(raw) ? raw.filter(Boolean) : []
  return [...new Set(list)].slice(0, 8)
}

function toTimestamp(value) {
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : NaN
}

function resolveVerifyAutoApproveMinutes() {
  const mins = Number(process.env.VERIFY_AUTO_APPROVE_MINUTES || VERIFY_AUTO_APPROVE_DEFAULT_MINUTES)
  if (!Number.isFinite(mins) || mins <= 0) return VERIFY_AUTO_APPROVE_DEFAULT_MINUTES
  return Math.max(1, Math.min(120, Math.round(mins)))
}

async function maybeAutoApprovePendingVerify(user = null, openid = '') {
  if (!user?._id || !openid) return { autoApproved: false, userPatch: {} }
  if (String(user.verifyStatus || '') !== 'pending') return { autoApproved: false, userPatch: {} }
  const submitTs = toTimestamp(user.verifySubmittedAt || user.updatedAt || user.createdAt)
  if (!Number.isFinite(submitTs)) return { autoApproved: false, userPatch: {} }

  const windowMinutes = resolveVerifyAutoApproveMinutes()
  if (Date.now() - submitTs < windowMinutes * 60 * 1000) return { autoApproved: false, userPatch: {} }

  const updateRes = await db.collection('users').doc(user._id).update({
    data: {
      isVerified: true,
      verifyStatus: 'approved',
      identityCheckRequired: false,
      identityCheckStatus: 'approved',
      verifyAutoApproved: true,
      verifyAutoApprovedAt: db.serverDate(),
      verifyAutoPendingReview: true,
      verifyAutoWindowMinutes: windowMinutes,
      verifyFinalDecisionSource: 'auto',
      verifyReviewedAt: null,
      updatedAt: db.serverDate(),
    },
  }).catch(() => ({ stats: { updated: 0 } }))

  if (Number(updateRes?.stats?.updated || 0) <= 0) return { autoApproved: false, userPatch: {} }

  try {
    await db.collection('adminActions').add({
      data: {
        actionId: `verify_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        adminId: 'system',
        adminOpenid: 'system',
        adminRole: 'system',
        targetId: openid,
        targetType: 'user',
        action: 'verify_auto_approved',
        actionType: 'verify_auto_approved',
        reason: `身份核验提交超过${windowMinutes}分钟未人工审核，系统自动通过（待人工复核）`,
        result: '系统自动通过，待管理员复核',
        actionSource: 'system',
        canAutoExecute: true,
        manualOverride: false,
        cityId: user.cityId || 'dali',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  } catch (e) {}

  return {
    autoApproved: true,
    userPatch: {
      isVerified: true,
      verifyStatus: 'approved',
      identityCheckRequired: false,
      identityCheckStatus: 'approved',
      verifyAutoApproved: true,
      verifyAutoPendingReview: true,
    },
  }
}

async function loadCityConfig(cityId = 'dali') {
  const finalCityId = cityId || DEFAULT_CITY_CONFIG.cityId
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

async function markHighFrequencyOrganizerIfNeeded(openid = '') {
  if (!openid) return
  const threshold = Number(process.env.SCHEME2_HIGH_FREQ_PUBLISH_7D || 6)
  if (!Number.isFinite(threshold) || threshold <= 0) return

  try {
    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .field({
        _id: true,
        identityCheckReasons: true,
      })
      .get()
    const user = users[0]
    if (!user?._id) return

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const { data: published } = await db.collection('activities')
      .where({
        publisherId: openid,
        createdAt: _.gte(since),
      })
      .field({
        _id: true,
      })
      .limit(Math.max(100, threshold + 20))
      .get()
    const publish7dCount = Array.isArray(published) ? published.length : 0
    if (publish7dCount < threshold) {
      await db.collection('users').doc(user._id).update({
        data: {
          recentPublish7dCount: publish7dCount,
          updatedAt: db.serverDate(),
        },
      })
      return
    }

    await db.collection('users').doc(user._id).update({
      data: {
        recentPublish7dCount: publish7dCount,
        identityCheckRequired: true,
        identityCheckStatus: 'required',
        identityCheckReasons: mergeReasonCodes(user.identityCheckReasons, 'HIGH_FREQ_ORGANIZER'),
        identityCheckTriggeredAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  } catch (e) {
    console.error('高频组织者方案2触发更新失败', e)
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 1. 校验身份核验状态
  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  if (!users.length) {
    return { success: false, error: 'NOT_VERIFIED', message: '请先完成身份核验' }
  }

  let user = users[0]
  const autoApproveResult = await maybeAutoApprovePendingVerify(user, OPENID)
  if (autoApproveResult.autoApproved) {
    user = {
      ...user,
      ...(autoApproveResult.userPatch || {}),
    }
  }

  if (!user.isVerified) {
    return { success: false, error: 'NOT_VERIFIED', message: '请先完成身份核验' }
  }

  const identityCheckRequired = !!user.identityCheckRequired
  const identityCheckStatus = String(user.identityCheckStatus || 'none')
  if (identityCheckRequired && identityCheckStatus !== 'approved') {
    return {
      success: false,
      error: 'IDENTITY_CHECK_REQUIRED',
      message: '当前账号需补充身份核验后才可继续发布',
      identityCheckRequired: true,
      identityCheckStatus,
      identityCheckReasons: normalizeIdentityReasons(user.identityCheckReasons),
    }
  }

  const {
    title,
    description = '',
    categoryId = 'other',
    categoryLabel = '',
    customCategoryLabel = '',
    lat,
    lng,
    address = '',
    startTime,
    endTime,
    maxParticipants = 999,
    isGroupFormation = false,
    minParticipants = 0,
    formationWindow,
    cityId,
  } = event

  const cityConfig = await loadCityConfig(cityId || DEFAULT_CITY_CONFIG.cityId)
  const finalCityId = cityConfig.cityId
  const latNum = Number(lat)
  const lngNum = Number(lng)
  const finalCategoryId = String(categoryId || 'other')
  const normalizedCustomCategoryLabel = normalizeCustomCategoryLabel(customCategoryLabel)

  // 2. 参数校验
  if (!title || title.trim().length === 0) {
    return { success: false, error: 'INVALID_TITLE', message: '请填写活动标题' }
  }
  if (title.length > 30) {
    return { success: false, error: 'TITLE_TOO_LONG', message: '标题最多30字' }
  }
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return { success: false, error: 'INVALID_LOCATION', message: '请选择活动地点' }
  }
  if (finalCityId !== 'dali') {
    return { success: false, error: 'CITY_NOT_SUPPORTED', message: '当前仅支持在大理白族自治州发布活动' }
  }
  if (!isInDaliPrefecture(latNum, lngNum)) {
    return { success: false, error: 'OUT_OF_DALI_REGION', message: '活动地点需在云南省大理白族自治州范围内' }
  }
  if (!CATEGORY_MAP[finalCategoryId]) {
    return { success: false, error: 'INVALID_CATEGORY', message: '活动分类不合法' }
  }
  if (finalCategoryId === 'other' && !normalizedCustomCategoryLabel) {
    return { success: false, error: 'INVALID_CUSTOM_CATEGORY', message: '选择“其它”时请填写具体分类' }
  }
  if (finalCategoryId === 'other') {
    const duplicateLabel = resolveDuplicateCategoryLabel(normalizedCustomCategoryLabel)
    if (duplicateLabel) {
      return {
        success: false,
        error: 'DUPLICATE_CUSTOM_CATEGORY',
        message: `自定义分类与现有分类“${duplicateLabel}”重复，请直接选择已有分类`,
      }
    }
  }
  if (!startTime || !endTime) {
    return { success: false, error: 'INVALID_TIME', message: '请选择活动时间' }
  }

  const now = Date.now()
  const startMs = new Date(startTime).getTime()
  const endMs   = new Date(endTime).getTime()

  if (startMs <= now) {
    return { success: false, error: 'START_PASSED', message: '开始时间不能早于现在' }
  }
  if (endMs <= startMs) {
    return { success: false, error: 'END_BEFORE_START', message: '结束时间必须晚于开始时间' }
  }
  if (isGroupFormation && minParticipants < 2) {
    return { success: false, error: 'INVALID_MIN', message: '成团最低人数至少2人' }
  }
  const requestedWindow = Number(formationWindow)
  const finalFormationWindow = isGroupFormation
    ? (Number.isFinite(requestedWindow) ? requestedWindow : cityConfig.groupFormation.defaultWindow)
    : cityConfig.groupFormation.defaultWindow
  if (isGroupFormation && !cityConfig.groupFormation.allowedWindows.includes(Number(finalFormationWindow))) {
    return { success: false, error: 'INVALID_WINDOW', message: '成团时间窗口不合法' }
  }
  if (isGroupFormation && minParticipants < cityConfig.groupFormation.absoluteMinParticipants) {
    return { success: false, error: 'INVALID_MIN', message: '成团最低人数至少2人' }
  }

  const finalCategoryLabel = finalCategoryId === 'other'
    ? '其他'
    : (categoryLabel || CATEGORY_MAP[finalCategoryId] || '其他')

  // 3. 成团截止时间（发布后N分钟）
  const formationDeadline = isGroupFormation
    ? new Date(now + finalFormationWindow * 60 * 1000)
    : null

  // 4. 写入数据库
  const trustProfile = buildTrustProfileForPublish(user)
  const baseEffectiveScore = getBaseEffectiveScore(trustProfile.trustLevel)

  const result = await db.collection('activities').add({
    data: {
      _openid: OPENID,
      title: title.trim(),
      description: description.trim(),
      categoryId: finalCategoryId,
      categoryLabel: finalCategoryLabel,
      categoryCustomLabel: finalCategoryId === 'other' ? normalizedCustomCategoryLabel : '',
      coverImage: '',
      cityId: finalCityId,
      location: {
        lat: latNum,
        lng: lngNum,
        address,
        coordinateSystem: cityConfig.geo.coordinateSystem,
        radius: cityConfig.geo.defaultFenceRadius,
        accuracy: null,
        pathPoints: null,
        pathRadius: null,
      },
      startTime: new Date(startTime),
      endTime:   new Date(endTime),
      maxParticipants,
      minParticipants,
      currentParticipants: 0,
      status: 'OPEN',
      isGroupFormation,
      formationWindow: isGroupFormation ? finalFormationWindow : null,
      formationDeadline,
      formationStatus: isGroupFormation ? 'FORMING' : null,
      formationWindowOptions: isGroupFormation ? cityConfig.groupFormation.allowedWindows : [],
      maxWindowExtensions: isGroupFormation ? cityConfig.groupFormation.maxWindowExtensions : 0,
      extendWindowCount: 0,
      organizerDecisionDeadline: null,
      organizerDecisionTimeoutHours: isGroupFormation ? cityConfig.groupFormation.organizerDecisionTimeoutHours : 0,
      cityConfigVersion: cityConfig.version,
      intentPhase: {
        enabled: false,
        intentCount: 0,
        intentUsers: [],
        intentStartedAt: null,
        formationTriggeredAt: null,
      },
      contactType: 'official',
      contactInfo: {
        type: 'wechat',
        value: '',
        cityId: finalCityId,
      },
      trustProfile,
      effectiveScore: baseEffectiveScore,
      decayStartedAt: null,
      participantFeedback: {
        held: 0,
        notHeld: 0,
      },
      riskTags: [],
      riskTagMeta: [],
      riskLevel: trustProfile.riskLevel,
      riskScore: trustProfile.trustLevel === 'A' ? 8 : 18,
      riskReasonCodes: [],
      riskControl: {
        autoDecisionCoverage: 0.8,
        autoRiskScore: trustProfile.trustLevel === 'A' ? 8 : 18,
        autoRiskLevel: trustProfile.riskLevel,
        autoReasonCodes: [],
        manualReviewRequired: false,
        needsBatchReview: false,
        lastEvaluatedAt: db.serverDate(),
        ttlRollbackCount: 0,
      },
      riskAutoVersion: 'v1.0',
      modificationRiskScore: 0,
      publisherId: OPENID,
      publisherNickname: user.nickname,
      publisherAvatar: user.avatarUrl,
      isVerified: true,
      isRecommended: false,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }
  })

  // 5. 更新发布者统计
  db.collection('users').where({ _openid: OPENID }).update({
    data: {
      publishCount: db.command.inc(1),
      updatedAt: db.serverDate(),
    }
  }).catch(() => {})
  markHighFrequencyOrganizerIfNeeded(OPENID)
  if (finalCategoryId === 'other' && normalizedCustomCategoryLabel) {
    recordCustomCategoryStat({
      cityId: finalCityId,
      customCategoryLabel: normalizedCustomCategoryLabel,
      activityId: result._id,
      publisherId: OPENID,
    })
  }

  return {
    success: true,
    activityId: result._id,
    cityId: finalCityId,
    cityConfigVersion: cityConfig.version,
    serverTimestamp: Date.now(),
  }
}
