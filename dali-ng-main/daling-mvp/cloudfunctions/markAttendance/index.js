const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function parseAdminMeta(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return { isAdmin: adminOpenids.includes(openid) }
}

function countByStatus(status = '') {
  if (status === 'attended') return { attend: 1, noShow: 0 }
  if (status === 'no_show') return { attend: 0, noShow: 1 }
  return { attend: 0, noShow: 0 }
}

function calcReliabilityScore(attendCount = 0, noShowCount = 0) {
  const attend = Math.max(0, Number(attendCount || 0))
  const noShow = Math.max(0, Number(noShowCount || 0))
  const total = attend + noShow
  if (total <= 0) return null
  const completionRate = attend / total
  const base = Math.round(completionRate * 100)
  const penalty = Math.min(20, noShow * 2)
  const score = Math.max(0, Math.min(100, base - penalty))
  return score
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { isAdmin } = parseAdminMeta(OPENID)
  const { activityId, participantOpenid, attendanceStatus, note = '' } = event || {}

  const nextStatus = String(attendanceStatus || '')
  if (!activityId || !participantOpenid) {
    return { success: false, error: 'INVALID_PARAMS', message: '缺少活动ID或参与者ID' }
  }
  if (!['attended', 'no_show'].includes(nextStatus)) {
    return { success: false, error: 'INVALID_ATTENDANCE_STATUS', message: 'attendanceStatus 仅支持 attended/no_show' }
  }

  try {
    const tx = await db.startTransaction()

    const activityRes = await tx.collection('activities').doc(activityId).get().catch(() => null)
    const activity = activityRes?.data
    if (!activity) {
      await tx.rollback()
      return { success: false, error: 'ACTIVITY_NOT_FOUND', message: '活动不存在' }
    }

    const isPublisher = activity.publisherId === OPENID
    if (!isPublisher && !isAdmin) {
      await tx.rollback()
      return { success: false, error: 'UNAUTHORIZED', message: '仅发布者或管理员可标记到场' }
    }

    const nowMs = Date.now()
    const endMs = new Date(activity.endTime).getTime()
    if (!Number.isFinite(endMs) || endMs > nowMs) {
      await tx.rollback()
      return { success: false, error: 'ACTIVITY_NOT_ENDED', message: '活动结束后才可标记到场/爽约' }
    }

    const joinedRes = await tx.collection('participations')
      .where({
        activityId,
        userId: participantOpenid,
        status: 'joined',
      })
      .limit(1)
      .get()

    const joined = joinedRes?.data?.[0]
    if (!joined) {
      await tx.rollback()
      return { success: false, error: 'PARTICIPATION_NOT_FOUND', message: '该用户当前未报名或已取消报名' }
    }

    const prevStatus = String(joined.attendanceStatus || '')
    const prevCount = countByStatus(prevStatus)
    const nextCount = countByStatus(nextStatus)
    const deltaAttend = nextCount.attend - prevCount.attend
    const deltaNoShow = nextCount.noShow - prevCount.noShow

    const userRes = await tx.collection('users')
      .where({ _openid: participantOpenid })
      .limit(1)
      .get()
    const targetUser = userRes?.data?.[0]
    if (!targetUser) {
      await tx.rollback()
      return { success: false, error: 'USER_NOT_FOUND', message: '用户不存在' }
    }

    const attendCount = Math.max(0, Number(targetUser.attendCount || 0) + deltaAttend)
    const noShowCount = Math.max(0, Number(targetUser.noShowCount || 0) + deltaNoShow)
    const totalMarked = attendCount + noShowCount
    const completionRate = totalMarked > 0 ? Number((attendCount / totalMarked).toFixed(4)) : null
    const reliabilityScore = calcReliabilityScore(attendCount, noShowCount)

    await tx.collection('participations').doc(joined._id).update({
      data: {
        attendanceStatus: nextStatus,
        attendanceMarkedAt: db.serverDate(),
        attendanceMarkedBy: OPENID,
        attendanceNote: String(note || '').slice(0, 200),
        updatedAt: db.serverDate(),
      },
    })

    await tx.collection('users').doc(targetUser._id).update({
      data: {
        attendCount,
        noShowCount,
        historicalCompletionRate: completionRate,
        reliabilityScore,
        updatedAt: db.serverDate(),
      },
    })

    await tx.commit()

    await db.collection('adminActions').add({
      data: {
        actionId: `attendance_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        adminId: OPENID,
        adminOpenid: OPENID,
        adminRole: isPublisher ? 'publisher' : 'admin',
        targetId: participantOpenid,
        targetType: 'user',
        action: 'mark_attendance',
        actionType: 'mark_attendance',
        linkedActivityId: activityId,
        cityId: activity.cityId || 'dali',
        reason: note ? `到场标记：${note}` : `到场标记：${nextStatus}`,
        result: `attendance=${nextStatus}`,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    }).catch(() => {})

    return {
      success: true,
      attendanceStatus: nextStatus,
      previousAttendanceStatus: prevStatus || null,
      reliability: {
        attendCount,
        noShowCount,
        historicalCompletionRate: completionRate,
        reliabilityScore,
      },
    }
  } catch (e) {
    console.error('markAttendance failed', e)
    return { success: false, error: 'FAILED', message: '标记失败，请稍后再试' }
  }
}
