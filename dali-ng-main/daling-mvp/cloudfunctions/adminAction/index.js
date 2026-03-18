const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 1. 验证管理员身份
  const adminOpenids = (process.env.ADMIN_OPENIDS || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!adminOpenids.includes(OPENID)) {
    return { success: false, error: 'UNAUTHORIZED', message: '无管理员权限' }
  }

  const { action, targetId, targetType, reason } = event

  // 2. reason 必填
  if (!reason || reason.trim().length < 2) {
    return { success: false, error: 'REASON_REQUIRED', message: '请填写操作原因（至少2个字）' }
  }

  let result = {}

  // 3. 执行操作
  switch (action) {

    // ── 活动操作 ──
    case 'recommend':
      await db.collection('activities').doc(targetId).update({
        data: { isRecommended: true, updatedAt: db.serverDate() }
      })
      result = { message: '已设为官方推荐' }
      break

    case 'unrecommend':
      await db.collection('activities').doc(targetId).update({
        data: { isRecommended: false, updatedAt: db.serverDate() }
      })
      result = { message: '已取消官方推荐' }
      break

    case 'hide':
      await db.collection('activities').doc(targetId).update({
        data: { status: 'CANCELLED', updatedAt: db.serverDate() }
      })
      result = { message: '活动已下架' }
      break

    // ── 用户操作 ──
    case 'verify':
      await db.collection('users').where({ _openid: targetId }).update({
        data: {
          isVerified: true,
          verifyStatus: 'approved',
          updatedAt: db.serverDate(),
        }
      })
      result = { message: '实名认证已通过' }
      break

    case 'reject_verify':
      await db.collection('users').where({ _openid: targetId }).update({
        data: {
          verifyStatus: 'rejected',
          updatedAt: db.serverDate(),
        }
      })
      result = { message: '实名认证已拒绝' }
      break

    case 'ban':
      await db.collection('users').where({ _openid: targetId }).update({
        data: {
          isBanned: true,
          updatedAt: db.serverDate(),
        }
      })
      result = { message: '用户已封禁' }
      break

    default:
      return { success: false, error: 'UNKNOWN_ACTION', message: '未知操作类型' }
  }

  // 4. 记录操作日志
  await db.collection('adminActions').add({
    data: {
      adminOpenid: OPENID,
      targetId,
      targetType,
      action,
      reason: reason.trim(),
      result: result.message,
      createdAt: db.serverDate(),
    }
  })

  return { success: true, ...result }
}