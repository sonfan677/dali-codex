const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event

  // 1. 检查是否已报名
  const { data: existing } = await db.collection('participations')
    .where({ activityId, userId: OPENID, status: 'joined' })
    .get()
  if (existing.length > 0) {
    return { success: false, error: 'ALREADY_JOINED', message: '你已经报名了' }
  }

  // 2. 获取用户信息
  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()
  const user = users[0] || {}

  // 3. 事务报名（防止并发超额）
  try {
    const transaction = await db.startTransaction()

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
    if (activity.currentParticipants >= activity.maxParticipants) {
      await transaction.rollback()
      return { success: false, error: 'FULL', message: '活动已满员' }
    }
    // 不能报名自己发布的活动
    if (activity.publisherId === OPENID) {
      await transaction.rollback()
      return { success: false, error: 'OWN_ACTIVITY', message: '不能报名自己发布的活动' }
    }

    const newCount = activity.currentParticipants + 1
    const isFull = newCount >= activity.maxParticipants

    // 更新人数
    await transaction.collection('activities').doc(activityId).update({
      data: {
        currentParticipants: newCount,
        status: isFull ? 'FULL' : 'OPEN',
        updatedAt: db.serverDate(),
      }
    })

    // 写入报名记录
    await transaction.collection('participations').add({
      data: {
        _openid: OPENID,
        activityId,
        userId: OPENID,
        userNickname: user.nickname || '',
        userAvatar: user.avatarUrl || '',
        status: 'joined',
        joinedAt: db.serverDate(),
        cancelledAt: null,
        createdAt: db.serverDate(),
      }
    })

    await transaction.commit()
    
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
          location: (activity.location && activity.location.address) || '见活动详情',
        }
      }
    }).catch(e => console.error('发送报名通知失败', e))
    
    return { success: true, currentParticipants: newCount, isFull }

  } catch(e) {
    console.error('报名事务失败', e)
    return { success: false, error: 'FAILED', message: '报名失败，请重试' }
  }
}