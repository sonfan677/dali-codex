const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 简单加密（Base64，MVP阶段够用）
function encrypt(str) {
  return Buffer.from(str).toString('base64')
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { realName, idCard } = event
  const provider = 'manual'

  // 基础校验
  if (!realName || realName.trim().length < 2) {
    return { success: false, error: 'INVALID_NAME', message: '请填写真实姓名' }
  }
  if (!/^\d{17}[\dXx]$/.test(String(idCard || '').trim())) {
    return { success: false, error: 'INVALID_ID_CARD', message: '请填写正确的身份证号' }
  }

  // 检查是否已提交过
  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  if (!users.length) {
    return { success: false, error: 'USER_NOT_FOUND', message: '请先登录' }
  }

  if (users[0].verifyStatus === 'approved') {
    return { success: false, error: 'ALREADY_VERIFIED', message: '你已经完成身份核验' }
  }

  // 加密存储
  const cityId = users[0].cityId || 'dali'
  await db.collection('users').where({ _openid: OPENID }).update({
    data: {
      realName: encrypt(realName.trim()),
      idCard: encrypt(String(idCard || '').trim().toUpperCase()),
      verifyStatus: 'pending',
      verifyProvider: provider,
      identityCheckRequired: true,
      identityCheckStatus: 'pending',
      verifySubmittedAt: db.serverDate(),
      verifyAutoApproved: false,
      verifyAutoApprovedAt: null,
      verifyAutoPendingReview: false,
      verifyAutoWindowMinutes: null,
      verifyFinalDecisionSource: 'manual_submit',
      verifyReviewedAt: null,
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
        reason: `用户申请身份核验：${realName.trim().slice(0,1)}**`,
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

  return { success: true, verifyProvider: provider }
}
