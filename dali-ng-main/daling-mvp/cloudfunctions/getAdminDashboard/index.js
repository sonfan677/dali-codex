const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function parseAdminMeta(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  const roleMap = (process.env.ADMIN_ROLE_MAP || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [k, v] = item.split(':').map((s) => s.trim())
      if (k && v) acc[k] = v
      return acc
    }, {})

  const cityScopeMap = (process.env.ADMIN_CITY_SCOPE || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [k, v] = item.split(':').map((s) => s.trim())
      if (k && v) acc[k] = v
      return acc
    }, {})

  return {
    isAdmin: adminOpenids.includes(openid),
    adminRole: roleMap[openid] || 'superAdmin',
    cityId: cityScopeMap[openid] || 'dali',
  }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  const meta = parseAdminMeta(OPENID)

  if (!meta.isAdmin) {
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
      .limit(200)
      .field({
        _id: true,
        targetId: true,
        reason: true,
        createdAt: true,
        cityId: true,
        reportStatus: true,
        handleAction: true,
        handleNote: true,
        handledAt: true,
        reporterOpenid: true,
        reporterNickname: true,
      })
      .get(),
    db.collection('activities')
      .where({ status: _.in(['OPEN', 'FULL']) })
      .orderBy('createdAt', 'desc')
      .limit(60)
      .field({
        _id: true,
        cityId: true,
        title: true,
        currentParticipants: true,
        status: true,
        isRecommended: true,
        location: true,
      })
      .get()
  ])

  const shouldFilterCity = meta.adminRole === 'cityAdmin'
  const reportList = (shouldFilterCity
    ? (reportsRes.data || []).filter((item) => !item.cityId || item.cityId === meta.cityId)
    : (reportsRes.data || []))
    .map((item) => ({
      ...item,
      reportStatus: item.reportStatus || 'PENDING',
    }))
    .slice(0, 60)

  const activityList = shouldFilterCity
    ? (activitiesRes.data || []).filter((item) => !item.cityId || item.cityId === meta.cityId).slice(0, 20)
    : (activitiesRes.data || []).slice(0, 20)

  return {
    success: true,
    adminRole: meta.adminRole,
    cityId: meta.cityId,
    pendingVerifyList: pendingUsersRes.data || [],
    reportList,
    activityList,
    serverTimestamp: Date.now(),
  }
}
