const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const VERIFY_AUTO_APPROVE_DEFAULT_MINUTES = 10
const USER_IDENTITY_TAG_SET = new Set([
  'homestay_owner',
  'host',
  'merchant',
  'student',
  'freelancer',
  'office_worker',
  'creator',
  'parent',
  'pet_owner',
  'other',
])

function calcUserRiskScore(user = {}) {
  const noShowCount = Number(user.noShowCount || 0)
  const reportAgainstCount = Number(user.reportAgainstCount || 0)
  const recentPublish7dCount = Number(user.recentPublish7dCount || 0)
  const locationAnomalyCount = Number(user.locationAnomalyCount || 0)
  const overloadPublishPenalty = Math.max(0, recentPublish7dCount - 5) * 3
  const score = 100
    - noShowCount * 12
    - reportAgainstCount * 8
    - locationAnomalyCount * 5
    - overloadPublishPenalty
  return Math.max(0, Math.min(100, Math.round(score)))
}

function normalizeSocialPreference(value = '') {
  const safe = String(value || '').trim()
  if (safe === 'introvert' || safe === 'extrovert' || safe === 'balanced') return safe
  return 'unknown'
}

function normalizeResidencyType(value = '') {
  const safe = String(value || '').trim()
  if (safe === 'visitor' || safe === 'nomad' || safe === 'local') return safe
  return 'unknown'
}

function normalizeIdentityTags(values = [], max = 3) {
  const unique = []
  ;(Array.isArray(values) ? values : []).forEach((item) => {
    const safe = String(item || '').trim()
    if (!safe || !USER_IDENTITY_TAG_SET.has(safe) || unique.includes(safe)) return
    unique.push(safe)
  })
  return unique.slice(0, Math.max(0, Number(max) || 3))
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

function normalizeSubscriptions(raw = {}) {
  return {
    nearbyActivity: !!raw.nearbyActivity,
    lastPromptedAt: raw.lastPromptedAt || null,
    lastAcceptedAt: raw.lastAcceptedAt || null,
    promptCount: Number(raw.promptCount || 0),
    lastPromptScene: raw.lastPromptScene || '',
    updatedAt: raw.updatedAt || null,
  }
}

function shouldPromptNearbySubscription(subscriptions, nowMs = Date.now()) {
  if (subscriptions.nearbyActivity) return false
  const lastPromptMs = new Date(subscriptions.lastPromptedAt).getTime()
  if (!Number.isFinite(lastPromptMs)) return true
  return nowMs - lastPromptMs > SEVEN_DAYS_MS
}

function resolveVerifyAutoApproveMinutes() {
  const mins = Number(process.env.VERIFY_AUTO_APPROVE_MINUTES || VERIFY_AUTO_APPROVE_DEFAULT_MINUTES)
  if (!Number.isFinite(mins) || mins <= 0) return VERIFY_AUTO_APPROVE_DEFAULT_MINUTES
  return Math.max(1, Math.min(120, Math.round(mins)))
}

function toTimestamp(input) {
  const ms = new Date(input).getTime()
  return Number.isFinite(ms) ? ms : NaN
}

async function maybeAutoApprovePendingVerify(user = null, openid = '') {
  if (!user || !openid) return { autoApproved: false, userPatch: {} }
  if (String(user.verifyStatus || '') !== 'pending') return { autoApproved: false, userPatch: {} }

  const windowMinutes = resolveVerifyAutoApproveMinutes()
  const submitTs = toTimestamp(user.verifySubmittedAt || user.updatedAt || user.createdAt)
  if (!Number.isFinite(submitTs)) return { autoApproved: false, userPatch: {} }
  if (Date.now() - submitTs < windowMinutes * 60 * 1000) return { autoApproved: false, userPatch: {} }

  const updateRes = await db.collection('users')
    .where({ _openid: openid, verifyStatus: 'pending' })
    .update({
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
    })
    .catch(() => ({ stats: { updated: 0 } }))

  const updatedCount = Number(updateRes?.stats?.updated || 0)
  if (updatedCount <= 0) return { autoApproved: false, userPatch: {} }

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
      verifyAutoApprovedAt: new Date().toISOString(),
      verifyAutoPendingReview: true,
      verifyAutoWindowMinutes: windowMinutes,
      verifyFinalDecisionSource: 'auto',
      verifyReviewedAt: null,
    },
  }
}

function buildReservedUserPatch(user = {}, cityId, todayKey) {
  const patch = {}
  if (!user.cityId) patch.cityId = cityId
  if (!user.registeredDateKey) patch.registeredDateKey = todayKey
  if (typeof user.locationAnomalyCount !== 'number') patch.locationAnomalyCount = 0
  if (!user.locationTrustLevel) patch.locationTrustLevel = 'normal'
  if (typeof user.joinCount !== 'number') patch.joinCount = 0
  if (typeof user.attendCount !== 'number') patch.attendCount = 0
  if (typeof user.noShowCount !== 'number') patch.noShowCount = 0
  if (typeof user.publishCount !== 'number') patch.publishCount = 0
  if (typeof user.reliabilityScore === 'undefined') patch.reliabilityScore = null
  if (typeof user.historicalCompletionRate === 'undefined') patch.historicalCompletionRate = null
  if (typeof user.inactivityPenaltyAt === 'undefined') patch.inactivityPenaltyAt = null
  if (typeof user.currentDecayRate === 'undefined') patch.currentDecayRate = null
  if (!user.verifyProvider) patch.verifyProvider = 'manual'
  if (typeof user.phoneVerified !== 'boolean') patch.phoneVerified = false
  if (!user.mobileBindStatus) patch.mobileBindStatus = 'unbound'
  if (typeof user.mobileBoundAt === 'undefined') patch.mobileBoundAt = null
  if (!user.socialPreference) patch.socialPreference = 'unknown'
  if (!user.residencyType) patch.residencyType = 'unknown'
  if (!Array.isArray(user.identityTags)) patch.identityTags = []
  if (typeof user.userRiskScore !== 'number') patch.userRiskScore = calcUserRiskScore(user)
  if (typeof user.identityCheckRequired !== 'boolean') patch.identityCheckRequired = false
  if (!user.identityCheckStatus) patch.identityCheckStatus = 'none'
  if (!Array.isArray(user.identityCheckReasons)) patch.identityCheckReasons = []
  if (typeof user.identityCheckTriggeredAt === 'undefined') patch.identityCheckTriggeredAt = null
  if (typeof user.reportAgainstCount !== 'number') patch.reportAgainstCount = 0
  if (typeof user.recentPublish7dCount !== 'number') patch.recentPublish7dCount = 0
  if (typeof user.verifyAutoApproved !== 'boolean') patch.verifyAutoApproved = false
  if (typeof user.verifyAutoApprovedAt === 'undefined') patch.verifyAutoApprovedAt = null
  if (typeof user.verifyAutoPendingReview !== 'boolean') patch.verifyAutoPendingReview = false
  if (typeof user.verifyAutoWindowMinutes !== 'number') patch.verifyAutoWindowMinutes = null
  if (typeof user.verifyFinalDecisionSource !== 'string') patch.verifyFinalDecisionSource = ''
  if (typeof user.verifyReviewedAt === 'undefined') patch.verifyReviewedAt = null
  if (typeof user.subscribeNearbyActivity !== 'boolean') patch.subscribeNearbyActivity = false
  if (!user.subscriptions || typeof user.subscriptions !== 'object') {
    patch.subscriptions = normalizeSubscriptions({})
  } else {
    const subPatch = {}
    if (typeof user.subscriptions.nearbyActivity !== 'boolean') subPatch.nearbyActivity = false
    if (typeof user.subscriptions.promptCount !== 'number') subPatch.promptCount = 0
    if (typeof user.subscriptions.lastPromptScene !== 'string') subPatch.lastPromptScene = ''
    if (!('lastPromptedAt' in user.subscriptions)) subPatch.lastPromptedAt = null
    if (!('lastAcceptedAt' in user.subscriptions)) subPatch.lastAcceptedAt = null
    if (!('updatedAt' in user.subscriptions)) subPatch.updatedAt = null
    if (Object.keys(subPatch).length > 0) patch.subscriptions = { ...user.subscriptions, ...subPatch }
  }
  return patch
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const cityId = event?.cityId || 'dali'
  const todayKey = toChinaDateKey()
  const nowMs = Date.now()

  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  if (users.length === 0) {
    const nickname = event.nickname || ''
    const avatarUrl = event.avatarUrl || ''
    // 新用户：创建记录
    await db.collection('users').add({
      data: {
        _openid: OPENID,
        nickname,
        avatarUrl,
        isVerified: false,
        verifyStatus: 'none',
        verifyProvider: 'manual',
        phoneVerified: false,
        mobileBindStatus: 'unbound',
        mobileBoundAt: null,
        socialPreference: normalizeSocialPreference(event.socialPreference),
        residencyType: normalizeResidencyType(event.residencyType),
        identityTags: normalizeIdentityTags(event.identityTags, 3),
        userRiskScore: 100,
        identityCheckRequired: false,
        identityCheckStatus: 'none',
        identityCheckReasons: [],
        identityCheckTriggeredAt: null,
        reportAgainstCount: 0,
        recentPublish7dCount: 0,
        verifyAutoApproved: false,
        verifyAutoApprovedAt: null,
        verifyAutoPendingReview: false,
        verifyAutoWindowMinutes: null,
        verifyFinalDecisionSource: '',
        verifyReviewedAt: null,
        subscribeNearbyActivity: false,
        publishCount: 0,
        joinCount: 0,
        attendCount: 0,
        noShowCount: 0,
        reliabilityScore: null,
        historicalCompletionRate: null,
        inactivityPenaltyAt: null,
        currentDecayRate: null,
        locationAnomalyCount: 0,
        locationTrustLevel: 'normal',
        cityId,
        registeredDateKey: todayKey,
        loginDateKeyLatest: todayKey,
        loginDateKeys: [todayKey],
        subscriptions: {
          nearbyActivity: false,
          lastPromptedAt: null,
          lastAcceptedAt: null,
          promptCount: 0,
          lastPromptScene: '',
          updatedAt: null,
        },
        lastLoginAt: db.serverDate(),
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
    })
    const subscriptions = normalizeSubscriptions({})
    return {
      success: true,
      isNewUser: true,
      isVerified: false,
      verifyStatus: 'none',
      verifyProvider: 'manual',
      phoneVerified: false,
      mobileBindStatus: 'unbound',
      mobileBoundAt: null,
      socialPreference: normalizeSocialPreference(event.socialPreference),
      residencyType: normalizeResidencyType(event.residencyType),
      identityTags: normalizeIdentityTags(event.identityTags, 3),
      userRiskScore: 100,
      identityCheckRequired: false,
      identityCheckStatus: 'none',
      identityCheckReasons: [],
      identityCheckTriggeredAt: null,
      openid: OPENID,
      nickname,
      avatarUrl,
      subscriptions,
      shouldPromptNearbySubscription: true,
    }
  }

  const currentUser = users[0]
  const autoApproveResult = await maybeAutoApprovePendingVerify(currentUser, OPENID)
  const runtimeUser = {
    ...currentUser,
    ...(autoApproveResult.userPatch || {}),
  }
  const reservedPatch = buildReservedUserPatch(runtimeUser, cityId, todayKey)

  // 老用户：如果传入了昵称或头像则更新
  const basePatch = {
    cityId: currentUser.cityId || cityId,
    loginDateKeyLatest: todayKey,
    loginDateKeys: _.addToSet(todayKey),
    lastLoginAt: db.serverDate(),
    updatedAt: db.serverDate(),
    ...reservedPatch,
    userRiskScore: calcUserRiskScore(runtimeUser),
  }

  const profilePatch = {}
  if (Object.prototype.hasOwnProperty.call(event || {}, 'nickname')) {
    profilePatch.nickname = event.nickname || runtimeUser.nickname || ''
  }
  if (Object.prototype.hasOwnProperty.call(event || {}, 'avatarUrl')) {
    profilePatch.avatarUrl = event.avatarUrl || runtimeUser.avatarUrl || ''
  }
  if (Object.prototype.hasOwnProperty.call(event || {}, 'socialPreference')) {
    profilePatch.socialPreference = normalizeSocialPreference(event.socialPreference)
  }
  if (Object.prototype.hasOwnProperty.call(event || {}, 'residencyType')) {
    profilePatch.residencyType = normalizeResidencyType(event.residencyType)
  }
  if (Object.prototype.hasOwnProperty.call(event || {}, 'identityTags')) {
    profilePatch.identityTags = normalizeIdentityTags(event.identityTags, 3)
  }

  if (Object.keys(profilePatch).length > 0) {
    await db.collection('users').where({ _openid: OPENID }).update({
      data: {
        ...basePatch,
        ...profilePatch,
      }
    })
  } else {
    await db.collection('users').where({ _openid: OPENID }).update({
      data: basePatch
    })
  }

  const mergedUser = {
    ...runtimeUser,
    ...reservedPatch,
    ...profilePatch,
    cityId: runtimeUser.cityId || cityId,
  }
  const nickname = mergedUser.nickname || ''
  const avatarUrl = mergedUser.avatarUrl || ''
  const subscriptions = normalizeSubscriptions(mergedUser.subscriptions)

  return {
    success: true,
    isNewUser: false,
    isVerified: !!mergedUser.isVerified,
    verifyStatus: mergedUser.verifyStatus || 'none',
    verifyProvider: mergedUser.verifyProvider || 'manual',
    phoneVerified: !!mergedUser.phoneVerified,
    mobileBindStatus: mergedUser.mobileBindStatus || (mergedUser.phoneVerified ? 'bound' : 'unbound'),
    mobileBoundAt: mergedUser.mobileBoundAt || null,
    socialPreference: normalizeSocialPreference(mergedUser.socialPreference),
    residencyType: normalizeResidencyType(mergedUser.residencyType),
    identityTags: normalizeIdentityTags(mergedUser.identityTags, 3),
    userRiskScore: Number.isFinite(Number(mergedUser.userRiskScore))
      ? Number(mergedUser.userRiskScore)
      : calcUserRiskScore(mergedUser),
    identityCheckRequired: !!mergedUser.identityCheckRequired,
    identityCheckStatus: mergedUser.identityCheckStatus || 'none',
    identityCheckReasons: Array.isArray(mergedUser.identityCheckReasons) ? mergedUser.identityCheckReasons : [],
    identityCheckTriggeredAt: mergedUser.identityCheckTriggeredAt || null,
    openid: OPENID,
    nickname,
    avatarUrl,
    subscriptions,
    shouldPromptNearbySubscription: shouldPromptNearbySubscription(subscriptions, nowMs),
  }
}
