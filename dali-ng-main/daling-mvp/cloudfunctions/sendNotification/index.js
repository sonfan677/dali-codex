const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { type, openid, data } = event

  // 模板ID优先读环境变量，未配置时使用当前项目的默认模板ID
  const TMPL_START   = process.env.TMPL_START   || 'zgiN-rGOY7w4igxoQA5cwB6DqO9jsFIPkXQund_ZBiM'
  const TMPL_CANCEL  = process.env.TMPL_CANCEL  || '3wPqnwBSWK5LnfA-BIDxFeXkSkD01D5meepLNQw6IVY'
  const TMPL_FORMING = process.env.TMPL_FORMING || 'LC4Z3cL8VoDl679__aRVVvuh4VRCys70b5ZQc0edI0o'

  const formatDate = (value) => value || ''

  try {
    let templateId, templateData

    if (type === 'join_success') {
      // 活动开始通知（模板515）
      templateId = TMPL_START
      templateData = {
        thing4: { value: data.title || '活动' },                 // 活动名称
        date3:  { value: formatDate(data.time) },                // 开始时间
        thing2: { value: data.content || data.title || '活动提醒' }, // 活动内容
        thing6: { value: data.location || '见活动详情' },          // 活动地点
        thing7: { value: data.tips || '请准时到场' },              // 温馨提示
      }

    } else if (type === 'activity_cancelled') {
      // 活动取消通知（模板1104）
      templateId = TMPL_CANCEL
      templateData = {
        thing1:  { value: data.title || '活动' },                // 活动名称
        thing5:  { value: data.reason || '活动已取消' },          // 取消原因
        thing11: { value: data.tips || '可前往首页查看其他活动' }, // 温馨提示
      }

    } else if (type === 'formation_result') {
      // 组团成功提醒（模板5223）
      templateId = TMPL_FORMING
      templateData = {
        thing10: { value: data.title || '活动' },         // 活动名称
        thing6:  { value: data.groupCount || '0人' },     // 组团人数
        date3:   { value: formatDate(data.time) },        // 活动时间
        thing4:  { value: data.location || '见活动详情' }, // 活动地点
        thing12: { value: data.tips || '' },              // 备注
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
