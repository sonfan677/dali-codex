const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { type, openid, data } = event

  // 新模板ID（与「工具-预约/报名」类目对应）
  const TMPL_START   = process.env.TMPL_START    // 活动开始通知
  const TMPL_CANCEL  = process.env.TMPL_CANCEL   // 活动取消通知
  const TMPL_FORMING = process.env.TMPL_FORMING  // 组团成功提醒

  try {
    let templateId, templateData

    if (type === 'join_success') {
      // 活动开始通知：报名成功后发送
      templateId = TMPL_START
      templateData = {
        thing4:  { value: data.title    || '活动' },
        date5:   { value: data.time     || '' },
        thing6:  { value: data.location || '' },
      }

    } else if (type === 'activity_cancelled') {
      // 活动取消通知
      templateId = TMPL_CANCEL
      templateData = {
        thing1: { value: data.title  || '活动' },
        thing5: { value: data.reason || '活动已取消' },
      }

    } else if (type === 'formation_result') {
      // 组团成功提醒
      templateId = TMPL_FORMING
      templateData = {
        thing10: { value: data.title    || '活动' },
        date3:   { value: data.time     || '' },
        thing4:  { value: data.location || '' },
        thing12: { value: data.tips     || '' },
      }
    }

    if (!templateId) {
      return { success: false, error: 'UNKNOWN_TYPE' }
    }

    await cloud.openapi.subscribeMessage.send({
      touser:     openid,
      templateId: templateId,
      page:       'pages/index/index',
      data:       templateData,
    })

    return { success: true }

  } catch (e) {
    console.error('sendNotification error:', e)
    return { success: false, error: e.message }
  }
}