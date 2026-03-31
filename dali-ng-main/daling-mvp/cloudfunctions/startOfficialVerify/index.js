const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function createTicket(openid = '') {
  const rand = Math.random().toString(36).slice(2, 10)
  return `ovf_${Date.now()}_${openid.slice(0, 6)}_${rand}`
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()

  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .limit(1)
    .get()

  if (!users.length) {
    return { success: false, error: 'USER_NOT_FOUND', message: '请先登录' }
  }

  const user = users[0]
  if (user.verifyStatus === 'approved' || user.isVerified) {
    return { success: false, error: 'ALREADY_VERIFIED', message: '你已通过实名认证' }
  }

  const existingTicket = String(user.officialVerifyTicket || '')
  if (user.verifyStatus === 'pending' && user.officialVerifyStatus === 'pending_callback' && existingTicket) {
    return {
      success: true,
      reused: true,
      ticket: existingTicket,
      verifyStatus: 'pending',
      officialVerifyStatus: 'pending_callback',
      message: '官方认证请求已发起，等待回调',
      officialEntryUrl: process.env.OFFICIAL_VERIFY_ENTRY_URL || '',
    }
  }

  const ticket = createTicket(OPENID)
  const cityId = user.cityId || 'dali'

  await db.collection('users').doc(user._id).update({
    data: {
      verifyStatus: 'pending',
      verifyProvider: 'wechat_official',
      officialVerifyStatus: 'pending_callback',
      officialVerifyTicket: ticket,
      verifySubmittedAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  })

  await db.collection('adminActions').add({
    data: {
      actionId: `official_verify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      adminId: 'system',
      adminOpenid: 'system',
      adminRole: 'system',
      targetId: OPENID,
      targetType: 'user',
      action: 'verify_request',
      actionType: 'official_verify_request',
      reason: '用户申请实名认证（微信官方通道）',
      cityId,
      verifyTicket: ticket,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    },
  }).catch(() => {})

  return {
    success: true,
    ticket,
    verifyStatus: 'pending',
    verifyProvider: 'wechat_official',
    officialVerifyStatus: 'pending_callback',
    officialEntryUrl: process.env.OFFICIAL_VERIFY_ENTRY_URL || '',
    message: '官方认证请求已发起，等待回调',
  }
}
