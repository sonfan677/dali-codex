const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function buildTrustProfile(activity, user, nowMs) {
  const hasPlatformVerified = !!(
    user?.platformVerified ||
    user?.trustVerified ||
    user?.verifyStatus === 'platform_verified' ||
    activity?.trustProfile?.trustLevel === 'A'
  )
  const isRealVerified = !!(user?.isVerified || user?.verifyStatus === 'approved' || activity?.isVerified)

  let trustLevel = 'C'
  if (hasPlatformVerified) trustLevel = 'A'
  else if (isRealVerified) trustLevel = 'B'

  const displayStars = trustLevel === 'A' ? 5 : trustLevel === 'B' ? 4 : 3
  const identityLabel = trustLevel === 'A'
    ? '平台核验'
    : trustLevel === 'B'
      ? '已认证'
      : '新入驻'

  const tags = []
  if (trustLevel === 'C') tags.push('新入驻')
  const startMs = new Date(activity.startTime).getTime()
  if (Number.isFinite(startMs) && startMs > nowMs && startMs - nowMs <= 24 * 60 * 60 * 1000) {
    tags.push('临时组织')
  }
  const modificationRiskScore = Number(activity.modificationRiskScore || activity.modificationRisk || 0)
  if (modificationRiskScore >= 2) tags.push('曾发生变更')

  const presetTags = Array.isArray(activity?.trustProfile?.riskTags) ? activity.trustProfile.riskTags : []
  const riskTags = [...new Set([...presetTags, ...tags])].slice(0, 3)
  const riskLevel = activity?.trustProfile?.riskLevel || (trustLevel === 'A' ? 'L0' : trustLevel === 'B' ? 'L1' : 'L2')

  return {
    trustLevel,
    displayStars,
    starText: `${'★'.repeat(displayStars)}${'☆'.repeat(5 - displayStars)}`,
    identityLabel,
    riskTags,
    riskLevel,
    internalScore: trustLevel === 'A' ? 90 : trustLevel === 'B' ? 75 : 60,
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event

  if (!activityId) {
    return { success: false, error: 'INVALID_ACTIVITY_ID', message: '缺少活动ID' }
  }

  const res = await db.collection('activities').doc(activityId).get().catch(() => null)
  if (!res || !res.data) {
    return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
  }

  const nowMs = Date.now()
  const activity = res.data
  const { data: users } = await db.collection('users')
    .where({ _openid: activity.publisherId })
    .limit(1)
    .field({
      _openid: true,
      isVerified: true,
      verifyStatus: true,
      platformVerified: true,
      trustVerified: true,
    })
    .get()
  const publisher = users[0] || null
  const enrichedActivity = {
    ...activity,
    trustProfile: buildTrustProfile(activity, publisher, nowMs),
  }
  const { data: joinedList } = await db.collection('participations')
    .where({ activityId, userId: OPENID, status: 'joined' })
    .limit(1)
    .get()

  return {
    success: true,
    activity: enrichedActivity,
    hasJoined: joinedList.length > 0,
    currentOpenid: OPENID,
    serverTime: nowMs,
    serverTimestamp: nowMs,
  }
}
