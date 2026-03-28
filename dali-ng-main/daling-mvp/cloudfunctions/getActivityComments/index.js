const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event || {}

  if (!activityId) {
    return { success: false, error: 'INVALID_ACTIVITY_ID', message: '缺少活动ID' }
  }

  const actRes = await db.collection('activities').doc(activityId).get().catch(() => null)
  if (!actRes || !actRes.data) {
    return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
  }

  const activity = actRes.data
  const isPublisher = activity.publisherId === OPENID
  let hasJoined = false
  if (!isPublisher) {
    const { data: joinedRows } = await db.collection('participations')
      .where({ activityId, userId: OPENID, status: 'joined' })
      .limit(1)
      .get()
    hasJoined = joinedRows.length > 0
  } else {
    hasJoined = true
  }

  const { data: comments } = await db.collection('activityComments')
    .where({ activityId, status: 'active' })
    .orderBy('createdAt', 'asc')
    .limit(200)
    .get()

  const commentList = (comments || []).map((item) => ({
    _id: item._id,
    activityId: item.activityId,
    parentId: item.parentId || null,
    content: item.content || '',
    authorOpenid: item.authorOpenid || '',
    authorNickname: item.authorNickname || '匿名用户',
    authorAvatar: item.authorAvatar || '',
    authorRole: item.authorRole || 'participant',
    createdAt: item.createdAt || null,
  }))

  return {
    success: true,
    activityId,
    canCommentAsParticipant: !isPublisher && hasJoined,
    canReplyAsPublisher: isPublisher,
    commentList,
    serverTime: Date.now(),
  }
}
