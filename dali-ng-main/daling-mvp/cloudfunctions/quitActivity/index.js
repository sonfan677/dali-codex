const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ACTIVE_JOIN_STATUSES = ['joined', 'pending_approval', 'waitlist']

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event || {}

  if (!activityId) {
    return { success: false, error: 'INVALID_ACTIVITY_ID', message: '缺少活动ID' }
  }

  const nowMs = Date.now()

  try {
    const transaction = await db.startTransaction()

    const actRes = await transaction.collection('activities').doc(activityId).get().catch(() => null)
    if (!actRes || !actRes.data) {
      await transaction.rollback()
      return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
    }

    const activity = actRes.data
    if (activity.publisherId === OPENID) {
      await transaction.rollback()
      return { success: false, error: 'PUBLISHER_CANNOT_QUIT', message: '发布者不可取消自己的报名' }
    }

    if (['ENDED', 'CANCELLED'].includes(activity.status)) {
      await transaction.rollback()
      return { success: false, error: 'NOT_ALLOWED', message: '活动已结束或已取消' }
    }

    const endMs = new Date(activity.endTime).getTime()
    if (Number.isFinite(endMs) && endMs <= nowMs) {
      await transaction.rollback()
      return { success: false, error: 'NOT_ALLOWED', message: '活动已结束，无法取消报名' }
    }

    const joinedRes = await transaction.collection('participations')
      .where({
        activityId,
        userId: OPENID,
        status: _.in(ACTIVE_JOIN_STATUSES),
      })
      .limit(1)
      .get()

    if (!joinedRes.data || joinedRes.data.length === 0) {
      await transaction.rollback()
      return { success: false, error: 'NOT_JOINED', message: '你当前未报名该活动' }
    }

    const participation = joinedRes.data[0]
    const previousJoinStatus = String(participation.status || '')
    const shouldReleaseSeat = previousJoinStatus === 'joined'
    const current = Number(activity.currentParticipants) || 0
    const nextCount = shouldReleaseSeat ? Math.max(0, current - 1) : current
    const nextStatus = shouldReleaseSeat && activity.status === 'FULL' ? 'OPEN' : activity.status
    const updateData = {
      updatedAt: db.serverDate(),
    }
    if (shouldReleaseSeat) {
      updateData.currentParticipants = nextCount
      updateData.status = nextStatus
    }

    if (shouldReleaseSeat && activity.isGroupFormation && activity.formationStatus === 'CONFIRMED') {
      const min = Number(activity.minParticipants) || 0
      const deadlineMs = new Date(activity.formationDeadline).getTime()
      if (nextCount < min && Number.isFinite(deadlineMs) && deadlineMs > nowMs) {
        updateData.formationStatus = 'FORMING'
      }
    }

    await transaction.collection('activities').doc(activityId).update({ data: updateData })

    await transaction.collection('participations').doc(participation._id).update({
      data: {
        status: 'cancelled',
        reviewStatus: '',
        cancelledAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
    })

    await transaction.commit()

    if (shouldReleaseSeat) {
      db.collection('users').where({ _openid: OPENID }).update({
        data: {
          joinCount: _.inc(-1),
          updatedAt: db.serverDate(),
        }
      }).catch(() => {})
    }

    return {
      success: true,
      cancelledJoinStatus: previousJoinStatus,
      currentParticipants: nextCount,
      activityStatus: nextStatus,
      formationStatus: updateData.formationStatus || activity.formationStatus || null,
    }
  } catch (e) {
    console.error('取消报名失败', e)
    return { success: false, error: 'FAILED', message: '取消报名失败，请稍后重试' }
  }
}
