const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event

  if (!activityId) {
    return { success: false, error: 'INVALID_ACTIVITY_ID', message: '缺少活动ID' }
  }

  const res = await db.collection('activities').doc(activityId).get().catch(() => null)
  if (!res || !res.data) {
    return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
  }

  const activity = res.data
  const { data: joinedList } = await db.collection('participations')
    .where({ activityId, userId: OPENID, status: 'joined' })
    .limit(1)
    .get()

  return {
    success: true,
    activity,
    hasJoined: joinedList.length > 0,
    currentOpenid: OPENID,
    serverTime: Date.now(),
    serverTimestamp: Date.now(),
  }
}
