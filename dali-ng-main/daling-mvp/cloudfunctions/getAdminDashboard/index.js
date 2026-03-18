const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function isAdmin(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return adminOpenids.includes(openid)
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  if (!isAdmin(OPENID)) {
    return { success: false, error: 'UNAUTHORIZED', message: '无管理员权限' }
  }

  const [pendingUsersRes, reportsRes, activitiesRes] = await Promise.all([
    db.collection('users')
      .where({ verifyStatus: 'pending' })
      .field({ _id: true, _openid: true, nickname: true, avatarUrl: true })
      .get(),
    db.collection('adminActions')
      .where({ action: 'report' })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .field({ _id: true, targetId: true, reason: true, createdAt: true })
      .get(),
    db.collection('activities')
      .where({ status: _.in(['OPEN', 'FULL']) })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .field({
        _id: true,
        title: true,
        currentParticipants: true,
        status: true,
        isRecommended: true,
        location: true,
      })
      .get()
  ])

  return {
    success: true,
    pendingVerifyList: pendingUsersRes.data || [],
    reportList: reportsRes.data || [],
    activityList: activitiesRes.data || [],
  }
}
