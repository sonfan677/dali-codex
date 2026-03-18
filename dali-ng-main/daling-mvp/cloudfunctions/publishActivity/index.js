const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 1. 校验实名认证
  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  if (!users.length || !users[0].isVerified) {
    return { success: false, error: 'NOT_VERIFIED', message: '请先完成实名认证' }
  }

  const user = users[0]
  const {
    title,
    description = '',
    lat,
    lng,
    address = '',
    startTime,
    endTime,
    maxParticipants = 999,
    isGroupFormation = false,
    minParticipants = 0,
  } = event

  // 2. 参数校验
  if (!title || title.trim().length === 0) {
    return { success: false, error: 'INVALID_TITLE', message: '请填写活动标题' }
  }
  if (title.length > 30) {
    return { success: false, error: 'TITLE_TOO_LONG', message: '标题最多30字' }
  }
  if (!lat || !lng) {
    return { success: false, error: 'INVALID_LOCATION', message: '请选择活动地点' }
  }
  if (!startTime || !endTime) {
    return { success: false, error: 'INVALID_TIME', message: '请选择活动时间' }
  }

  const now = Date.now()
  const startMs = new Date(startTime).getTime()
  const endMs   = new Date(endTime).getTime()

  if (startMs <= now) {
    return { success: false, error: 'START_PASSED', message: '开始时间不能早于现在' }
  }
  if (endMs <= startMs) {
    return { success: false, error: 'END_BEFORE_START', message: '结束时间必须晚于开始时间' }
  }
  if (isGroupFormation && minParticipants < 2) {
    return { success: false, error: 'INVALID_MIN', message: '成团最低人数至少2人' }
  }

  // 3. 成团截止时间（发布后30分钟）
  const formationDeadline = isGroupFormation
    ? new Date(now + 30 * 60 * 1000)
    : null

  // 4. 写入数据库
  const result = await db.collection('activities').add({
    data: {
      _openid: OPENID,
      title: title.trim(),
      description: description.trim(),
      coverImage: '',
      location: { lat, lng, address },
      startTime: new Date(startTime),
      endTime:   new Date(endTime),
      maxParticipants,
      minParticipants,
      currentParticipants: 0,
      status: 'OPEN',
      isGroupFormation,
      formationDeadline,
      formationStatus: isGroupFormation ? 'FORMING' : null,
      publisherId: OPENID,
      publisherNickname: user.nickname,
      publisherAvatar: user.avatarUrl,
      isVerified: true,
      isRecommended: false,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }
  })

  // 5. 更新发布者统计
  db.collection('users').where({ _openid: OPENID }).update({
    data: {
      publishCount: db.command.inc(1),
      updatedAt: db.serverDate(),
    }
  }).catch(() => {})

  return { success: true, activityId: result._id }
}