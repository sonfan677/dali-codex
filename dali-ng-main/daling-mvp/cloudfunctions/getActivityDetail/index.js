const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const CATEGORY_MAP = {
  sport: '运动',
  music: '音乐',
  reading: '读书',
  game: '游戏',
  social: '社交',
  outdoor: '户外',
  other: '其他',
}

function parseAdminMeta(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    isAdmin: adminOpenids.includes(openid),
  }
}

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
  const { isAdmin } = parseAdminMeta(OPENID)

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
  const categoryId = activity.categoryId || 'other'
  const enrichedActivity = {
    ...activity,
    categoryId,
    categoryLabel: activity.categoryLabel || CATEGORY_MAP[categoryId] || '其他',
    trustProfile: buildTrustProfile(activity, publisher, nowMs),
  }
  const { data: joinedList } = await db.collection('participations')
    .where({ activityId, userId: OPENID, status: 'joined' })
    .limit(1)
    .get()

  const isPublisher = activity.publisherId === OPENID
  let participantList = []
  if (isPublisher) {
    const { data: rawParticipants } = await db.collection('participations')
      .where({ activityId, status: 'joined' })
      .orderBy('joinedAt', 'desc')
      .limit(100)
      .field({
        _id: true,
        userId: true,
        userNickname: true,
        userAvatar: true,
        joinedAt: true,
      })
      .get()

    participantList = (rawParticipants || []).map((item) => ({
      _id: item._id,
      openid: item.userId || '',
      nickname: item.userNickname || '匿名用户',
      avatar: item.userAvatar || '',
      joinedAt: item.joinedAt || null,
    }))
  }

  let adminInsight = null
  if (isAdmin) {
    const [reportsRes, adminActionsRes] = await Promise.all([
      db.collection('adminActions')
        .where({ action: 'report', targetId: activityId })
        .orderBy('createdAt', 'desc')
        .limit(20)
        .field({
          _id: true,
          reason: true,
          createdAt: true,
          reportStatus: true,
          handleAction: true,
          handleNote: true,
          handledAt: true,
          reporterNickname: true,
          reporterOpenid: true,
        })
        .get(),
      db.collection('adminActions')
        .where({
          targetType: 'activity',
          targetId: activityId,
        })
        .orderBy('createdAt', 'desc')
        .limit(20)
        .field({
          _id: true,
          action: true,
          reason: true,
          result: true,
          adminOpenid: true,
          adminRole: true,
          createdAt: true,
        })
        .get(),
    ])

    const reportList = reportsRes.data || []
    const actionHistory = (adminActionsRes.data || []).map((item) => ({
      _id: item._id,
      action: item.action,
      reason: item.reason || '',
      result: item.result || '',
      adminOpenid: item.adminOpenid || '',
      adminRole: item.adminRole || 'admin',
      createdAt: item.createdAt || null,
    }))

    const latestReport = reportList[0] || null
    const pendingReports = reportList.filter((item) => (item.reportStatus || 'PENDING') === 'PENDING').length
    const handledReports = reportList.filter((item) => item.reportStatus === 'HANDLED').length
    const ignoredReports = reportList.filter((item) => item.reportStatus === 'IGNORED').length

    adminInsight = {
      isAdminView: true,
      totalReports: reportList.length,
      pendingReports,
      handledReports,
      ignoredReports,
      latestReportReason: latestReport?.reason || '',
      latestReportAt: latestReport?.createdAt || null,
      latestReportStatus: latestReport?.reportStatus || '',
      latestHandleNote: latestReport?.handleNote || '',
      latestHandledAt: latestReport?.handledAt || null,
      actionHistory: actionHistory.slice(0, 5),
    }
  }

  return {
    success: true,
    activity: enrichedActivity,
    hasJoined: joinedList.length > 0,
    isPublisher,
    isAdmin,
    adminInsight,
    participantList,
    currentOpenid: OPENID,
    serverTime: nowMs,
    serverTimestamp: nowMs,
  }
}
