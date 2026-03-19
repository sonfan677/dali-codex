const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event

  const actRes = await db.collection('activities').doc(activityId).get()
  if (!actRes.data) {
    return { success: false, error: 'NOT_FOUND' }
  }

  const activity = actRes.data
  if (activity.publisherId !== OPENID) {
    return { success: false, error: 'UNAUTHORIZED', message: '只有发布者可以取消活动' }
  }
  if (['ENDED', 'CANCELLED'].includes(activity.status)) {
    return { success: false, error: 'CANNOT_CANCEL', message: '活动已结束或已取消' }
  }

  // 更新活动状态
  await db.collection('activities').doc(activityId).update({
    data: { status: 'CANCELLED', updatedAt: db.serverDate() }
  })

  // 通知所有已报名的参与者（异步）
  db.collection('participations')
    .where({ activityId, status: 'joined' })
    .get()
    .then(({ data: parts }) => {
      parts.forEach(p => {
        const targetOpenid = p.userId || p._openid
        if (!targetOpenid) return
        cloud.callFunction({
          name: 'sendNotification',
          data: {
            type: 'activity_cancelled',
            openid: targetOpenid,
            data: {
              title:  activity.title,
              reason: '活动发起人已取消本次活动',
              tips:   '你可前往首页查看其他活动',
            }
          }
        }).catch(e => console.error('发送取消通知失败', e))
      })
    })
    .catch(() => {})

  return { success: true }
}
