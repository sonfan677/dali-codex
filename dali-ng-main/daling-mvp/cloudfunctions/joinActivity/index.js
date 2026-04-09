const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const ACTIVE_JOIN_STATUSES = ['joined', 'pending_approval', 'waitlist']

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event

  if (!activityId) {
    return { success: false, error: 'INVALID_ACTIVITY_ID', message: '缺少活动ID' }
  }

  // 1. 获取用户信息
  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()
  const user = users[0] || {}

  // 2. 事务报名（防止并发超额）
  try {
    const transaction = await db.startTransaction()

    const existingRes = await transaction.collection('participations')
      .where({
        activityId,
        userId: OPENID,
        status: _.in(ACTIVE_JOIN_STATUSES),
      })
      .limit(1)
      .get()
    const activeRecord = existingRes.data && existingRes.data[0]
    if (activeRecord) {
      await transaction.rollback()
      const msgMap = {
        joined: '你已经报名了',
        pending_approval: '你已提交报名申请，请等待审核',
        waitlist: '你已在候补队列中',
      }
      return {
        success: false,
        error: 'ALREADY_JOINED',
        message: msgMap[activeRecord.status] || '你已经报名了',
        joinStatus: activeRecord.status,
      }
    }

    const actRes = await transaction.collection('activities').doc(activityId).get()
    const activity = actRes.data

    if (!activity) {
      await transaction.rollback()
      return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
    }
    if (activity.status !== 'OPEN') {
      await transaction.rollback()
      return { success: false, error: 'NOT_OPEN', message: '活动已不接受报名' }
    }
    if (new Date(activity.endTime).getTime() <= Date.now()) {
      await transaction.rollback()
      return { success: false, error: 'ENDED', message: '活动已结束' }
    }
    // 不能报名自己发布的活动
    if (activity.publisherId === OPENID) {
      await transaction.rollback()
      return { success: false, error: 'OWN_ACTIVITY', message: '不能报名自己发布的活动' }
    }

    const allowWaitlist = !!(activity.joinPolicy?.allowWaitlist ?? activity.allowWaitlist)
    const requireApproval = !!(activity.joinPolicy?.requireApproval ?? activity.requireApproval)
    const currentCount = Number(activity.currentParticipants || 0)
    const maxCount = Number(activity.maxParticipants || 999)
    const isReachedMax = currentCount >= maxCount

    let targetStatus = 'joined'
    if (isReachedMax) {
      if (allowWaitlist) {
        targetStatus = 'waitlist'
      } else {
        await transaction.rollback()
        return { success: false, error: 'FULL', message: '活动已满员' }
      }
    } else if (requireApproval) {
      targetStatus = 'pending_approval'
    }

    const shouldOccupySeat = targetStatus === 'joined'
    const newCount = shouldOccupySeat ? currentCount + 1 : currentCount
    const isFull = newCount >= maxCount
    let nextFormationStatus = activity.formationStatus || null

    // 仅“报名成功”才占坑
    const updateActivityData = {}
    if (shouldOccupySeat) {
      updateActivityData.currentParticipants = newCount
      updateActivityData.status = isFull ? 'FULL' : 'OPEN'
      updateActivityData.updatedAt = db.serverDate()
    }
    if (shouldOccupySeat && activity.isGroupFormation) {
      const minParticipants = Number(activity.minParticipants) || 0
      if (
        ['FORMING', 'PENDING_ORGANIZER'].includes(activity.formationStatus) &&
        newCount >= minParticipants
      ) {
        nextFormationStatus = 'CONFIRMED'
        updateActivityData.formationStatus = 'CONFIRMED'
        updateActivityData.organizerDecisionDeadline = null
        updateActivityData.formationConfirmedAt = db.serverDate()
      }
    }

    if (Object.keys(updateActivityData).length > 0) {
      await transaction.collection('activities').doc(activityId).update({
        data: updateActivityData
      })
    }

    // 写入/恢复报名记录（允许“取消后再次报名”）
    const joinedRecordRes = await transaction.collection('participations')
      .where({ activityId, userId: OPENID })
      .limit(1)
      .get()
    const existedRecord = joinedRecordRes.data && joinedRecordRes.data[0]

    if (existedRecord) {
      await transaction.collection('participations').doc(existedRecord._id).update({
        data: {
          status: targetStatus,
          userNickname: user.nickname || existedRecord.userNickname || '',
          userAvatar: user.avatarUrl || existedRecord.userAvatar || '',
          cityId: activity.cityId || existedRecord.cityId || 'dali',
          attendanceStatus: existedRecord.attendanceStatus || '',
          attendanceMarkedAt: null,
          attendanceMarkedBy: '',
          attendanceNote: '',
          joinedAt: db.serverDate(),
          appliedAt: db.serverDate(),
          reviewStatus: targetStatus === 'pending_approval' ? 'pending' : (targetStatus === 'joined' ? 'approved' : ''),
          reviewedAt: targetStatus === 'joined' ? db.serverDate() : null,
          cancelledAt: null,
          updatedAt: db.serverDate(),
        }
      })
    } else {
      await transaction.collection('participations').add({
        data: {
          _openid: OPENID,
          activityId,
          userId: OPENID,
          userNickname: user.nickname || '',
          userAvatar: user.avatarUrl || '',
          cityId: activity.cityId || 'dali',
          status: targetStatus,
          attendanceStatus: '',
          attendanceMarkedAt: null,
          attendanceMarkedBy: '',
          attendanceNote: '',
          joinedAt: db.serverDate(),
          appliedAt: db.serverDate(),
          reviewStatus: targetStatus === 'pending_approval' ? 'pending' : (targetStatus === 'joined' ? 'approved' : ''),
          reviewedAt: targetStatus === 'joined' ? db.serverDate() : null,
          cancelledAt: null,
          createdAt: db.serverDate(),
          updatedAt: db.serverDate(),
        }
      })
    }

    await transaction.commit()
    
    if (shouldOccupySeat) {
      // 更新用户统计（异步）
      db.collection('users').where({ _openid: OPENID }).update({
        data: { joinCount: _.inc(1), updatedAt: db.serverDate() }
      }).catch(() => {})

      // 发送报名成功通知（异步，不影响主流程）
      const startTime = new Date(activity.startTime)
      const mo  = startTime.getMonth() + 1
      const day = startTime.getDate()
      const h   = startTime.getHours().toString().padStart(2, '0')
      const m   = startTime.getMinutes().toString().padStart(2, '0')

      cloud.callFunction({
        name: 'sendNotification',
        data: {
          type: 'join_success',
          openid: OPENID,
          data: {
            title:    activity.title,
            time:     `${mo}月${day}日 ${h}:${m}`,
            content:  activity.description || '你已报名成功，请留意活动时间',
            location: (activity.location && activity.location.address) || '见活动详情',
            tips:     '请提前10分钟到场，避免迟到',
          }
        }
      }).catch(e => console.error('发送报名通知失败', e))
    }
    
    return {
      success: true,
      joinStatus: targetStatus,
      currentParticipants: newCount,
      isFull,
      formationStatus: nextFormationStatus,
      requiresApproval: requireApproval,
      isWaitlist: targetStatus === 'waitlist',
    }

  } catch(e) {
    console.error('报名事务失败', e)
    return { success: false, error: 'FAILED', message: '报名失败，请重试' }
  }
}
