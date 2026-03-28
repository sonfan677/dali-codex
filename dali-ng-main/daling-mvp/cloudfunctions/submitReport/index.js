const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { targetId, targetType = 'activity', reason } = event || {}

  if (!targetId || targetType !== 'activity') {
    return { success: false, error: 'INVALID_TARGET', message: '举报目标不合法' }
  }

  const normalizedReason = String(reason || '').trim()
  if (normalizedReason.length < 2) {
    return { success: false, error: 'INVALID_REASON', message: '请至少填写2个字的举报原因' }
  }

  const actRes = await db.collection('activities').doc(targetId).get().catch(() => null)
  if (!actRes || !actRes.data) {
    return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
  }

  const activity = actRes.data
  if (activity.publisherId === OPENID) {
    return { success: false, error: 'CANNOT_REPORT_OWN', message: '不能举报自己发布的活动' }
  }

  const { data: dupReports } = await db.collection('adminActions')
    .where({
      action: 'report',
      targetId,
      reporterOpenid: OPENID,
      reportStatus: 'PENDING',
    })
    .limit(1)
    .get()

  if (dupReports.length > 0) {
    return { success: true, duplicated: true, message: '你已提交过举报，请等待处理' }
  }

  let reporterNickname = ''
  try {
    const { data: users } = await db.collection('users')
      .where({ _openid: OPENID })
      .limit(1)
      .field({ nickname: true })
      .get()
    reporterNickname = users[0]?.nickname || ''
  } catch (e) {
    reporterNickname = ''
  }

  await db.collection('adminActions').add({
    data: {
      actionId: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action: 'report',
      actionType: 'report',
      targetId,
      targetType: 'activity',
      reason: normalizedReason,
      reporterOpenid: OPENID,
      reporterNickname,
      reportStatus: 'PENDING',
      handleAction: null,
      handleNote: null,
      handledAt: null,
      handlerOpenid: null,
      cityId: activity.cityId || 'dali',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }
  })

  return { success: true, message: '举报已提交，平台会尽快处理' }
}
