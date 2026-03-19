const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function parseAdminMeta(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const isAdmin = adminOpenids.includes(openid)

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
    isAdmin,
    adminRole: roleMap[openid] || 'superAdmin',
    adminCityId: cityScopeMap[openid] || 'dali',
  }
}

async function getActivitySnapshot(targetId) {
  try {
    const res = await db.collection('activities').doc(targetId).get()
    return res.data || null
  } catch (e) {
    return null
  }
}

async function getUserSnapshot(openid) {
  try {
    const { data } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get()
    return data[0] || null
  } catch (e) {
    return null
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { isAdmin, adminRole, adminCityId } = parseAdminMeta(OPENID)

  if (!isAdmin) {
    return { success: false, error: 'UNAUTHORIZED', message: '无管理员权限' }
  }

  const { action, targetId, targetType, reason, cityId } = event
  if (!reason || reason.trim().length < 2) {
    return { success: false, error: 'REASON_REQUIRED', message: '请填写操作原因（至少2个字）' }
  }

  const normalizedReason = reason.trim()
  let beforeState = null
  let afterState = null
  let result = {}
  let finalTargetType = targetType || ''

  switch (action) {
    case 'recommend':
    case 'unrecommend':
    case 'hide': {
      finalTargetType = finalTargetType || 'activity'
      beforeState = await getActivitySnapshot(targetId)
      if (!beforeState) {
        return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
      }
      if (adminRole === 'cityAdmin' && beforeState.cityId && beforeState.cityId !== adminCityId) {
        return { success: false, error: 'CITY_SCOPE_DENIED', message: '无该城市权限' }
      }

      const nextPatch = action === 'recommend'
        ? { isRecommended: true, updatedAt: db.serverDate() }
        : action === 'unrecommend'
          ? { isRecommended: false, updatedAt: db.serverDate() }
          : { status: 'CANCELLED', updatedAt: db.serverDate() }

      await db.collection('activities').doc(targetId).update({ data: nextPatch })
      afterState = await getActivitySnapshot(targetId)
      result = {
        message: action === 'recommend'
          ? '已设为官方推荐'
          : action === 'unrecommend'
            ? '已取消官方推荐'
            : '活动已下架'
      }
      break
    }

    case 'verify':
    case 'reject_verify':
    case 'ban': {
      finalTargetType = finalTargetType || 'user'
      beforeState = await getUserSnapshot(targetId)
      if (!beforeState) {
        return { success: false, error: 'NOT_FOUND', message: '用户不存在' }
      }

      const nextPatch = action === 'verify'
        ? { isVerified: true, verifyStatus: 'approved', updatedAt: db.serverDate() }
        : action === 'reject_verify'
          ? { verifyStatus: 'rejected', updatedAt: db.serverDate() }
          : { isBanned: true, updatedAt: db.serverDate() }

      await db.collection('users').where({ _openid: targetId }).update({ data: nextPatch })
      afterState = await getUserSnapshot(targetId)
      result = {
        message: action === 'verify'
          ? '实名认证已通过'
          : action === 'reject_verify'
            ? '实名认证已拒绝'
            : '用户已封禁'
      }
      break
    }

    default:
      return { success: false, error: 'UNKNOWN_ACTION', message: '未知操作类型' }
  }

  const finalCityId = cityId || beforeState?.cityId || afterState?.cityId || adminCityId || 'dali'
  await db.collection('adminActions').add({
    data: {
      actionId: `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      adminId: OPENID,
      adminOpenid: OPENID,
      adminRole,
      targetId,
      targetType: finalTargetType,
      action,
      actionType: action,
      reason: normalizedReason,
      beforeState: beforeState || null,
      afterState: afterState || null,
      result: result.message,
      cityId: finalCityId,
      outcomeVerified: null,
      outcomeNote: null,
      createdAt: db.serverDate(),
    }
  })

  return { success: true, ...result }
}
