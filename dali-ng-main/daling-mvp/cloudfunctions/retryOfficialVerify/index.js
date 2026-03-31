const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function parseAdminMeta(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    isAdmin: adminOpenids.includes(openid),
  }
}

function createTicket(openid = '') {
  const rand = Math.random().toString(36).slice(2, 10)
  return `ovf_${Date.now()}_${openid.slice(0, 6)}_${rand}`
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const { isAdmin } = parseAdminMeta(OPENID)
  const targetOpenid = isAdmin && event.targetOpenid ? String(event.targetOpenid) : OPENID
  const reason = String(event.reason || '').slice(0, 200)

  const { data: users } = await db.collection('users')
    .where({ _openid: targetOpenid })
    .limit(1)
    .get()

  if (!users.length) {
    return { success: false, error: 'USER_NOT_FOUND', message: '用户不存在' }
  }

  const user = users[0]
  if (user.verifyStatus === 'approved' || user.isVerified) {
    return { success: false, error: 'ALREADY_VERIFIED', message: '用户已通过认证，无需重试' }
  }

  const ticket = createTicket(targetOpenid)
  await db.collection('users').doc(user._id).update({
    data: {
      verifyStatus: 'pending',
      verifyProvider: 'wechat_official',
      officialVerifyStatus: 'pending_callback',
      officialVerifyTicket: ticket,
      officialVerifyRetryCount: _.inc(1),
      officialVerifyLastRetryAt: db.serverDate(),
      officialVerifyLastError: '',
      verifySubmittedAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  await db.collection('adminActions').add({
    data: {
      actionId: `official_verify_retry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      adminId: OPENID,
      adminOpenid: OPENID,
      adminRole: isAdmin ? 'admin' : 'user',
      targetId: targetOpenid,
      targetType: 'user',
      action: 'official_verify_retry',
      actionType: 'official_verify_retry',
      reason: reason || '重试官方实名认证',
      result: `ticket=${ticket}`,
      cityId: user.cityId || 'dali',
      verifyTicket: ticket,
      callbackKey: '',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  }).catch(() => {})

  return {
    success: true,
    ticket,
    targetOpenid,
    retryCount: Number(user.officialVerifyRetryCount || 0) + 1,
    officialVerifyStatus: 'pending_callback',
    message: '官方实名认证已重试发起',
  }
}
