const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

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

function buildNextSubscriptions(currentSubscriptions, action, scene, nowDate) {
  const next = {
    ...currentSubscriptions,
  }
  const promptScene = scene || currentSubscriptions.lastPromptScene || 'index_first_open'

  if (action === 'prompted') {
    next.lastPromptedAt = nowDate
    next.promptCount = Number(currentSubscriptions.promptCount || 0) + 1
    next.lastPromptScene = promptScene
    next.updatedAt = nowDate
  } else if (action === 'accepted') {
    next.nearbyActivity = true
    next.lastAcceptedAt = nowDate
    next.lastPromptedAt = nowDate
    next.lastPromptScene = promptScene
    next.updatedAt = nowDate
  } else if (action === 'rejected') {
    next.lastPromptedAt = nowDate
    next.lastPromptScene = promptScene
    next.updatedAt = nowDate
  }

  return next
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const action = String(event?.action || 'status')
  const scene = String(event?.scene || '').slice(0, 60)
  const now = new Date()
  const nowMs = now.getTime()

  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .limit(1)
    .field({
      _id: true,
      _openid: true,
      subscriptions: true,
      subscribeNearbyActivity: true,
    })
    .get()

  if (!users.length) {
    return { success: false, error: 'USER_NOT_FOUND', message: '用户不存在，请先登录' }
  }

  const user = users[0]
  const currentSubscriptions = normalizeSubscriptions(user.subscriptions || {})
  const patch = {}

  if (action === 'prompted') {
    patch.subscriptions = {
      ...currentSubscriptions,
      lastPromptedAt: db.serverDate(),
      promptCount: _.inc(1),
      lastPromptScene: scene || currentSubscriptions.lastPromptScene || 'index_first_open',
      updatedAt: db.serverDate(),
    }
  } else if (action === 'accepted') {
    patch.subscribeNearbyActivity = true
    patch.subscriptions = {
      ...currentSubscriptions,
      nearbyActivity: true,
      lastAcceptedAt: db.serverDate(),
      lastPromptedAt: db.serverDate(),
      lastPromptScene: scene || currentSubscriptions.lastPromptScene || 'index_first_open',
      updatedAt: db.serverDate(),
    }
  } else if (action === 'rejected') {
    patch.subscriptions = {
      ...currentSubscriptions,
      lastPromptedAt: db.serverDate(),
      lastPromptScene: scene || currentSubscriptions.lastPromptScene || 'index_first_open',
      updatedAt: db.serverDate(),
    }
  }

  if (Object.keys(patch).length > 0) {
    patch.updatedAt = db.serverDate()
    await db.collection('users').doc(user._id).update({ data: patch })
  }

  const latestSubscriptions = normalizeSubscriptions(
    buildNextSubscriptions(currentSubscriptions, action, scene, now)
  )

  return {
    success: true,
    action,
    subscriptions: latestSubscriptions,
    shouldPromptNearbySubscription: shouldPromptNearbySubscription(latestSubscriptions, nowMs),
    serverTimestamp: nowMs,
  }
}
