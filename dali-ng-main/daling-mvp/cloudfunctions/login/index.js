const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

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
  if (!user.officialVerifyStatus) patch.officialVerifyStatus = 'not_started'
  if (typeof user.officialVerifyTicket === 'undefined') patch.officialVerifyTicket = null
  if (typeof user.officialVerifiedAt === 'undefined') patch.officialVerifiedAt = null
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
        officialVerifyStatus: 'not_started',
        officialVerifyTicket: null,
        officialVerifiedAt: null,
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
      officialVerifyStatus: 'not_started',
      officialVerifyTicket: null,
      officialVerifiedAt: null,
      openid: OPENID,
      nickname,
      avatarUrl,
      subscriptions,
      shouldPromptNearbySubscription: true,
    }
  }

  const currentUser = users[0]
  const reservedPatch = buildReservedUserPatch(currentUser, cityId, todayKey)

  // 老用户：如果传入了昵称或头像则更新
  const basePatch = {
    cityId: currentUser.cityId || cityId,
    loginDateKeyLatest: todayKey,
    loginDateKeys: _.addToSet(todayKey),
    lastLoginAt: db.serverDate(),
    updatedAt: db.serverDate(),
    ...reservedPatch,
  }

  if (event.nickname || event.avatarUrl) {
    await db.collection('users').where({ _openid: OPENID }).update({
      data: {
        ...basePatch,
        nickname: event.nickname || users[0].nickname,
        avatarUrl: event.avatarUrl || users[0].avatarUrl,
      }
    })
  } else {
    await db.collection('users').where({ _openid: OPENID }).update({
      data: basePatch
    })
  }

  const nickname = event.nickname || users[0].nickname || ''
  const avatarUrl = event.avatarUrl || users[0].avatarUrl || ''
  const mergedUser = {
    ...currentUser,
    ...reservedPatch,
    cityId: currentUser.cityId || cityId,
  }
  const subscriptions = normalizeSubscriptions(mergedUser.subscriptions)

  return {
    success: true,
    isNewUser: false,
    isVerified: users[0].isVerified,
    verifyStatus: users[0].verifyStatus,
    verifyProvider: mergedUser.verifyProvider || 'manual',
    officialVerifyStatus: mergedUser.officialVerifyStatus || 'not_started',
    officialVerifyTicket: mergedUser.officialVerifyTicket || null,
    officialVerifiedAt: mergedUser.officialVerifiedAt || null,
    openid: OPENID,
    nickname,
    avatarUrl,
    subscriptions,
    shouldPromptNearbySubscription: shouldPromptNearbySubscription(subscriptions, nowMs),
  }
}
