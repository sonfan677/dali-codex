const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 简单加密（Base64，MVP阶段够用）
function encrypt(str) {
  return Buffer.from(str).toString('base64')
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { realName, phone, verifyProvider = 'manual' } = event
  const provider = String(verifyProvider || 'manual')

  // 基础校验
  if (!realName || realName.trim().length < 2) {
    return { success: false, error: 'INVALID_NAME', message: '请填写真实姓名' }
  }
  if (!/^1[3-9]\d{9}$/.test(phone)) {
    return { success: false, error: 'INVALID_PHONE', message: '请填写正确的手机号' }
  }

  // 检查是否已提交过
  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  if (!users.length) {
    return { success: false, error: 'USER_NOT_FOUND', message: '请先登录' }
  }

  if (users[0].verifyStatus === 'approved') {
    return { success: false, error: 'ALREADY_VERIFIED', message: '你已经完成实名认证' }
  }

  // 加密存储
  const cityId = users[0].cityId || 'dali'
  await db.collection('users').where({ _openid: OPENID }).update({
    data: {
      realName: encrypt(realName.trim()),
      phone: encrypt(phone),
      verifyStatus: 'pending',
      verifyProvider: provider === 'wechat_official' ? 'wechat_official' : 'manual',
      officialVerifyStatus: provider === 'wechat_official' ? 'pending_callback' : (users[0].officialVerifyStatus || 'not_started'),
      updatedAt: db.serverDate(),
    }
  })

  // 写入管理员待办（adminActions集合）
  // 先确认 adminActions 集合存在，不存在会自动报错
  try {
    await db.collection('adminActions').add({
      data: {
        actionId: `verify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        adminId: 'system',
        adminOpenid: 'system',
        adminRole: 'system',
        targetId: OPENID,
        targetType: 'user',
        action: 'verify_request',
        actionType: 'verify_request',
        reason: provider === 'wechat_official'
          ? '用户申请实名认证（微信官方通道）'
          : `用户申请实名认证：${realName.trim().slice(0,1)}**`,
        cityId,
        expiresAt: null,
        rollbackAt: null,
        rollbackResult: null,
        outcomeVerified: null,
        outcomeNote: null,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
    })
  } catch(e) {
    // adminActions 集合不存在时不影响主流程
    console.error('写入adminActions失败', e)
  }

  return { success: true, verifyProvider: provider === 'wechat_official' ? 'wechat_official' : 'manual' }
}
