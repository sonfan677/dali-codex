const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 简单加密（Base64，MVP阶段够用）
function encrypt(str) {
  return Buffer.from(str).toString('base64')
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { realName, phone } = event

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
  await db.collection('users').where({ _openid: OPENID }).update({
    data: {
      realName: encrypt(realName.trim()),
      phone: encrypt(phone),
      verifyStatus: 'pending',
      updatedAt: db.serverDate(),
    }
  })

  // 写入管理员待办（adminActions集合）
  // 先确认 adminActions 集合存在，不存在会自动报错
  try {
    await db.collection('adminActions').add({
      data: {
        adminOpenid: 'system',
        targetId: OPENID,
        targetType: 'user',
        action: 'verify_request',
        reason: `用户申请实名认证：${realName.trim().slice(0,1)}**`,
        createdAt: db.serverDate(),
      }
    })
  } catch(e) {
    // adminActions 集合不存在时不影响主流程
    console.error('写入adminActions失败', e)
  }

  return { success: true }
}