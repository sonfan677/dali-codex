const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const CITY_CONFIG = {
  cityId: 'dali',
  geo: {
    defaultFenceRadius: 5000,
    coordinateSystem: 'GCJ02',
  },
  groupFormation: {
    defaultWindow: 30,
    allowedWindows: [15, 30, 60],
    absoluteMinParticipants: 2,
  }
}

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
    formationWindow = CITY_CONFIG.groupFormation.defaultWindow,
    cityId = CITY_CONFIG.cityId,
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
  if (isGroupFormation && !CITY_CONFIG.groupFormation.allowedWindows.includes(Number(formationWindow))) {
    return { success: false, error: 'INVALID_WINDOW', message: '成团时间窗口不合法' }
  }
  if (isGroupFormation && minParticipants < CITY_CONFIG.groupFormation.absoluteMinParticipants) {
    return { success: false, error: 'INVALID_MIN', message: '成团最低人数至少2人' }
  }

  const finalFormationWindow = isGroupFormation
    ? Number(formationWindow)
    : CITY_CONFIG.groupFormation.defaultWindow

  // 3. 成团截止时间（发布后N分钟）
  const formationDeadline = isGroupFormation
    ? new Date(now + finalFormationWindow * 60 * 1000)
    : null

  // 4. 写入数据库
  const result = await db.collection('activities').add({
    data: {
      _openid: OPENID,
      title: title.trim(),
      description: description.trim(),
      coverImage: '',
      cityId,
      location: {
        lat,
        lng,
        address,
        coordinateSystem: CITY_CONFIG.geo.coordinateSystem,
        radius: CITY_CONFIG.geo.defaultFenceRadius,
        accuracy: null,
        pathPoints: null,
        pathRadius: null,
      },
      startTime: new Date(startTime),
      endTime:   new Date(endTime),
      maxParticipants,
      minParticipants,
      currentParticipants: 0,
      status: 'OPEN',
      isGroupFormation,
      formationWindow: isGroupFormation ? finalFormationWindow : null,
      formationDeadline,
      formationStatus: isGroupFormation ? 'FORMING' : null,
      intentPhase: {
        enabled: false,
        intentCount: 0,
        intentUsers: [],
        intentStartedAt: null,
        formationTriggeredAt: null,
      },
      contactType: 'official',
      contactInfo: {
        type: 'wechat',
        value: '',
        cityId,
      },
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
