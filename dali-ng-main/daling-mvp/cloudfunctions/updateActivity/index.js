const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function safeText(v) {
  return String(v || '').trim()
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const {
    activityId,
    lat,
    lng,
    address = '',
    startTime,
    endTime,
    maxParticipants,
  } = event || {}

  if (!activityId) {
    return { success: false, error: 'INVALID_ACTIVITY_ID', message: '缺少活动ID' }
  }

  const actRes = await db.collection('activities').doc(activityId).get().catch(() => null)
  if (!actRes || !actRes.data) {
    return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
  }

  const activity = actRes.data
  if (activity.publisherId !== OPENID) {
    return { success: false, error: 'UNAUTHORIZED', message: '仅发布者可编辑活动' }
  }
  if (['ENDED', 'CANCELLED'].includes(activity.status)) {
    return { success: false, error: 'NOT_EDITABLE', message: '活动已结束或已取消，无法编辑' }
  }

  const nowMs = Date.now()
  const originalStartMs = new Date(activity.startTime).getTime()
  if (Number.isFinite(originalStartMs) && originalStartMs <= nowMs) {
    return { success: false, error: 'ACTIVITY_STARTED', message: '活动已开始，暂不支持编辑' }
  }

  const newStartMs = new Date(startTime).getTime()
  const newEndMs = new Date(endTime).getTime()
  if (!Number.isFinite(newStartMs) || !Number.isFinite(newEndMs)) {
    return { success: false, error: 'INVALID_TIME', message: '活动时间不合法' }
  }
  if (newStartMs <= nowMs) {
    return { success: false, error: 'START_PASSED', message: '开始时间必须晚于现在' }
  }
  if (newEndMs <= newStartMs) {
    return { success: false, error: 'END_BEFORE_START', message: '结束时间必须晚于开始时间' }
  }

  const nextLat = Number(lat)
  const nextLng = Number(lng)
  if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
    return { success: false, error: 'INVALID_LOCATION', message: '活动地点不合法' }
  }

  let finalMax = Number(maxParticipants)
  if (!Number.isFinite(finalMax) || finalMax <= 0) {
    finalMax = 999
  }
  if (finalMax > 9999) finalMax = 9999

  const current = Number(activity.currentParticipants) || 0
  if (finalMax < current) {
    return {
      success: false,
      error: 'INVALID_MAX_CURRENT',
      message: `人数上限不能小于当前报名人数（${current}）`,
    }
  }
  if (activity.isGroupFormation) {
    const min = Number(activity.minParticipants) || 0
    if (finalMax < min) {
      return {
        success: false,
        error: 'INVALID_MAX_MIN',
        message: `人数上限不能小于成团人数（${min}）`,
      }
    }
  }

  const nextStatus = current >= finalMax ? 'FULL' : 'OPEN'
  const nextLocation = {
    ...(activity.location || {}),
    lat: nextLat,
    lng: nextLng,
    address: safeText(address) || activity.location?.address || '',
  }

  await db.collection('activities').doc(activityId).update({
    data: {
      location: nextLocation,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      maxParticipants: finalMax,
      status: nextStatus,
      modificationRiskScore: _.inc(1),
      updatedAt: db.serverDate(),
    }
  })

  return {
    success: true,
    activityId,
    status: nextStatus,
    maxParticipants: finalMax,
    location: nextLocation,
  }
}
