const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

async function notifyFormationResult(activity, formationStatus) {
  const { data: parts } = await db.collection('participations')
    .where({ activityId: activity._id, status: 'joined' })
    .get()

  if (!parts.length) return

  const start = new Date(activity.startTime)
  const mo = start.getMonth() + 1
  const day = start.getDate()
  const h = start.getHours().toString().padStart(2, '0')
  const m = start.getMinutes().toString().padStart(2, '0')
  const timeText = `${mo}月${day}日 ${h}:${m}`
  const tips = formationStatus === 'CONFIRMED'
    ? '活动已成团，请准时参加'
    : '很遗憾未能成团，期待下次相遇'

  await Promise.allSettled(parts.map((p) => {
    const openid = p.userId || p._openid
    if (!openid) return Promise.resolve()
    return cloud.callFunction({
      name: 'sendNotification',
      data: {
        type: 'formation_result',
        openid,
        data: {
          title: activity.title,
          time: timeText,
          location: (activity.location && activity.location.address) || '见活动详情',
          tips,
        }
      }
    })
  }))
}

exports.main = async () => {
  const now = new Date()
  const nowMs = now.getTime()
  console.log(`[autoUpdateStatus] 开始执行 ${now.toISOString()}`)

  const { data: activeActivities } = await db.collection('activities')
    .where({ status: _.in(['OPEN', 'FULL']) })
    .limit(100)
    .get()

  let endedCount = 0
  for (const activity of activeActivities) {
    const endMs = new Date(activity.endTime).getTime()
    if (!Number.isFinite(endMs) || endMs >= nowMs) continue

    let formationStatus = activity.formationStatus
    const updateData = {
      status: 'ENDED',
      updatedAt: db.serverDate(),
    }

    if (activity.isGroupFormation && activity.formationStatus === 'FORMING') {
      const min = Number(activity.minParticipants) || 0
      const current = Number(activity.currentParticipants) || 0
      formationStatus = current >= min ? 'CONFIRMED' : 'FAILED'
      updateData.formationStatus = formationStatus
    }

    await db.collection('activities').doc(activity._id).update({ data: updateData })

    if (activity.isGroupFormation && formationStatus && formationStatus !== 'FORMING') {
      try {
        await notifyFormationResult(activity, formationStatus)
      } catch (e) {
        console.error('发送成团通知失败', e)
      }
    }

    endedCount++
  }
  console.log(`[autoUpdateStatus] 结束活动数: ${endedCount}`)

  const { data: formingActivities } = await db.collection('activities')
    .where({
      isGroupFormation: true,
      formationStatus: 'FORMING',
      status: _.in(['OPEN', 'FULL']),
    })
    .get()

  let formingCount = 0
  for (const activity of formingActivities) {
    if (!activity.formationDeadline) continue

    const deadlineMs = new Date(activity.formationDeadline).getTime()
    if (!Number.isFinite(deadlineMs) || deadlineMs > nowMs) continue

    const isFormed = Number(activity.currentParticipants) >= Number(activity.minParticipants)
    const nextFormationStatus = isFormed ? 'CONFIRMED' : 'FAILED'

    await db.collection('activities').doc(activity._id).update({
      data: {
        formationStatus: nextFormationStatus,
        updatedAt: db.serverDate(),
      }
    })

    try {
      await notifyFormationResult(activity, nextFormationStatus)
    } catch (e) {
      console.error('发送成团通知失败', e)
    }

    formingCount++
    console.log(`[autoUpdateStatus] 活动 ${activity._id} 成团结果: ${nextFormationStatus}`)
  }
  console.log(`[autoUpdateStatus] 处理成团活动数: ${formingCount}`)

  return {
    success: true,
    endedCount,
    formingCount,
    executedAt: now.toISOString(),
  }
}
