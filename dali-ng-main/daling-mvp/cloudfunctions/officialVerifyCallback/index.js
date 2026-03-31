const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function safeText(v, max = 200) {
  return String(v || '').slice(0, max)
}

exports.main = async (event) => {
  const callbackToken = safeText(event?.token, 120)
  const configuredToken = safeText(process.env.OFFICIAL_VERIFY_CALLBACK_TOKEN, 120)
  if (configuredToken && callbackToken !== configuredToken) {
    return { success: false, error: 'UNAUTHORIZED', message: 'callback token 无效' }
  }

  const ticket = safeText(event?.ticket, 120)
  const openid = safeText(event?.openid, 120)
  const result = String(event?.result || '').toLowerCase()
  const detail = safeText(event?.detail, 300)
  const traceId = safeText(event?.traceId, 120)

  if (!ticket && !openid) {
    return { success: false, error: 'INVALID_PARAMS', message: 'ticket/openid 至少传一个' }
  }
  if (!['approved', 'rejected'].includes(result)) {
    return { success: false, error: 'INVALID_RESULT', message: 'result 仅支持 approved/rejected' }
  }

  let user = null
  if (ticket) {
    const byTicket = await db.collection('users')
      .where({ officialVerifyTicket: ticket })
      .limit(1)
      .get()
      .catch(() => ({ data: [] }))
    user = byTicket?.data?.[0] || null
  }

  if (!user && openid) {
    const byOpenid = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()
      .catch(() => ({ data: [] }))
    user = byOpenid?.data?.[0] || null
  }

  if (!user) {
    return { success: false, error: 'USER_NOT_FOUND', message: '未找到对应用户' }
  }

  const patch = {
    verifyProvider: 'wechat_official',
    officialVerifyStatus: result === 'approved' ? 'verified' : 'rejected',
    officialVerifyTicket: ticket || user.officialVerifyTicket || null,
    officialVerifyTraceId: traceId || '',
    officialVerifyDetail: detail || '',
    officialVerifiedAt: result === 'approved' ? db.serverDate() : (user.officialVerifiedAt || null),
    verifyStatus: result === 'approved' ? 'approved' : 'rejected',
    isVerified: result === 'approved',
    updatedAt: db.serverDate(),
  }

  await db.collection('users').doc(user._id).update({ data: patch })

  await db.collection('adminActions').add({
    data: {
      actionId: `official_verify_callback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      adminId: 'system',
      adminOpenid: 'system',
      adminRole: 'system',
      targetId: user._openid,
      targetType: 'user',
      action: 'official_verify_callback',
      actionType: 'official_verify_callback',
      reason: detail || `微信官方实名认证回调：${result}`,
      result,
      verifyTicket: ticket || user.officialVerifyTicket || '',
      cityId: user.cityId || 'dali',
      traceId,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  }).catch(() => {})

  return {
    success: true,
    openid: user._openid,
    result,
    verifyStatus: patch.verifyStatus,
    officialVerifyStatus: patch.officialVerifyStatus,
  }
}
