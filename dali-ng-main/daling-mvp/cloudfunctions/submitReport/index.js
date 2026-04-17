const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function mergeReasonCodes(existing = [], incoming = '') {
  const base = Array.isArray(existing) ? existing.filter(Boolean) : []
  if (incoming) base.push(incoming)
  return [...new Set(base)].slice(0, 8)
}

async function markTargetPublisherForScheme2(publisherOpenid = '') {
  if (!publisherOpenid) return
  try {
    const { data } = await db.collection('users')
      .where({ _openid: publisherOpenid })
      .limit(1)
      .field({
        _id: true,
        identityCheckReasons: true,
      })
      .get()
    const user = data[0]
    if (!user?._id) return

    await db.collection('users').doc(user._id).update({
      data: {
        reportAgainstCount: db.command.inc(1),
        identityCheckRequired: true,
        identityCheckStatus: 'required',
        identityCheckReasons: mergeReasonCodes(user.identityCheckReasons, 'REPORTED_USER'),
        identityCheckTriggeredAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  } catch (e) {
    console.error('标记方案2触发失败', e)
  }
}

async function writeReportFlowAudit({
  openid = '',
  activityId = '',
  reportId = '',
  cityId = '',
  reason = '',
}) {
  const safeActivityId = String(activityId || '').trim()
  if (!safeActivityId) return
  try {
    await db.collection('adminActions').add({
      data: {
        actionId: `flow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        action: 'flow_report_submitted',
        actionType: 'flow_report_submitted',
        targetId: safeActivityId,
        targetType: 'activity',
        linkedActivityId: safeActivityId,
        linkedReportId: reportId || '',
        cityId: cityId || 'dali',
        adminId: openid || 'system',
        adminOpenid: openid || 'system',
        adminRole: openid ? 'user' : 'system',
        actionSource: 'user',
        canAutoExecute: false,
        manualOverride: false,
        reason: String(reason || '用户提交投诉举报').slice(0, 120),
        result: 'report_created',
        flowPayload: {
          reportId: reportId || '',
          reporterOpenid: openid || '',
        },
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      }
    })
  } catch (e) {}
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { targetId, targetType = 'activity', reason } = event || {}

  if (!targetId || targetType !== 'activity') {
    return { success: false, error: 'INVALID_TARGET', message: '举报目标不合法' }
  }

  const normalizedReason = String(reason || '').trim()
  if (normalizedReason.length < 2) {
    return { success: false, error: 'INVALID_REASON', message: '请至少填写2个字的举报原因' }
  }

  const actRes = await db.collection('activities').doc(targetId).get().catch(() => null)
  if (!actRes || !actRes.data) {
    return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
  }

  const activity = actRes.data
  if (activity.publisherId === OPENID) {
    return { success: false, error: 'CANNOT_REPORT_OWN', message: '不能举报自己发布的活动' }
  }

  const { data: dupReports } = await db.collection('adminActions')
    .where({
      action: 'report',
      targetId,
      reporterOpenid: OPENID,
      reportStatus: 'PENDING',
    })
    .limit(1)
    .get()

  if (dupReports.length > 0) {
    return { success: true, duplicated: true, message: '你已提交过举报，请等待处理' }
  }

  let reporterNickname = ''
  try {
    const { data: users } = await db.collection('users')
      .where({ _openid: OPENID })
      .limit(1)
      .field({ nickname: true })
      .get()
    reporterNickname = users[0]?.nickname || ''
  } catch (e) {
    reporterNickname = ''
  }

  const addRes = await db.collection('adminActions').add({
    data: {
      actionId: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      action: 'report',
      actionType: 'report',
      targetId,
      targetType: 'activity',
      reason: normalizedReason,
      reporterOpenid: OPENID,
      reporterNickname,
      reportStatus: 'PENDING',
      handleAction: null,
      handleNote: null,
      handledAt: null,
      handlerOpenid: null,
      cityId: activity.cityId || 'dali',
      expiresAt: null,
      rollbackAt: null,
      rollbackResult: null,
      outcomeVerified: null,
      outcomeNote: null,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate(),
    }
  })

  const reportId = addRes?._id || ''
  await writeReportFlowAudit({
    openid: OPENID,
    activityId: targetId,
    reportId,
    cityId: activity.cityId || 'dali',
    reason: normalizedReason,
  })

  await markTargetPublisherForScheme2(activity.publisherId || activity._openid || '')

  return { success: true, message: '举报已提交，平台会尽快处理' }
}
