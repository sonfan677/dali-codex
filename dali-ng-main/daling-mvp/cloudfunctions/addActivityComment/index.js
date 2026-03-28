const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function safeText(v) {
  return String(v || '').trim()
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId, content, parentId = null } = event || {}

  if (!activityId) {
    return { success: false, error: 'INVALID_ACTIVITY_ID', message: '缺少活动ID' }
  }

  const normalizedContent = safeText(content)
  if (!normalizedContent || normalizedContent.length < 1) {
    return { success: false, error: 'INVALID_CONTENT', message: '留言内容不能为空' }
  }
  if (normalizedContent.length > 200) {
    return { success: false, error: 'CONTENT_TOO_LONG', message: '留言最多200字' }
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
    if (!hasJoined) {
      return { success: false, error: 'NOT_PARTICIPANT', message: '仅参与者可留言' }
    }
  }

  let finalParentId = null
  if (isPublisher) {
    if (!parentId) {
      return { success: false, error: 'REPLY_PARENT_REQUIRED', message: '请先选择要回复的留言' }
    }
    const parentRes = await db.collection('activityComments').doc(parentId).get().catch(() => null)
    if (!parentRes || !parentRes.data || parentRes.data.activityId !== activityId) {
      return { success: false, error: 'PARENT_NOT_FOUND', message: '要回复的留言不存在' }
    }
    if (parentRes.data.status !== 'active') {
      return { success: false, error: 'PARENT_NOT_ACTIVE', message: '该留言已不可回复' }
    }
    finalParentId = parentRes.data.parentId || parentRes.data._id
  } else if (parentId) {
    return { success: false, error: 'PARTICIPANT_CANNOT_REPLY', message: '仅发布者可回复留言' }
  }

  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .limit(1)
    .field({ nickname: true, avatarUrl: true })
    .get()
  const user = users[0] || {}

  const addRes = await db.collection('activityComments').add({
    data: {
      activityId,
      parentId: finalParentId,
      content: normalizedContent,
      authorOpenid: OPENID,
      authorNickname: user.nickname || '搭里用户',
      authorAvatar: user.avatarUrl || '',
      authorRole: isPublisher ? 'publisher' : 'participant',
      status: 'active',
      cityId: activity.cityId || 'dali',
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }
  })

  return {
    success: true,
    commentId: addRes._id,
    authorRole: isPublisher ? 'publisher' : 'participant',
    parentId: finalParentId,
  }
}
