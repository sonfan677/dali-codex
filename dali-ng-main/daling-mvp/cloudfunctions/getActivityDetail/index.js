const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const CATEGORY_MAP = {
  sport: '运动',
  cycling: '骑行',
  outdoor: '户外',
  music: '音乐',
  game: '游戏',
  culture: '文化',
  food: '美食',
  photo: '摄影',
  wellness: '身心',
  social: '交流',
  other: '其他',
}

const LEGACY_CATEGORY_ID_MAP = {
  reading: 'culture',
  movie: 'culture',
  travel: 'outdoor',
}

const SCENE_LABEL_MAP = {
  local_explore: '在地探索',
  casual_gathering: '轻松聚会',
  social_networking: '交友社交',
  learning_sharing: '学习分享',
  workshop_experience: '体验工作坊',
  music_performance: '音乐演出',
  market_popups: '市集摆摊',
  outdoor_nature: '户外活动',
  family_pet: '亲子宠物',
  public_welfare: '公益社区',
  nomad_city: '旅居同城',
  festival_theme: '节庆主题',
}

const TYPE_OPTIONS_BY_SCENE = {
  local_explore: [
    { id: 'hotspot_checkin', name: '热门点位打卡' },
    { id: 'city_walk', name: '城市漫游' },
    { id: 'village_walk', name: '村落探索' },
    { id: 'erhai_route', name: '洱海路线活动' },
    { id: 'cafe_hopping', name: '探店串联' },
    { id: 'photo_walk', name: '旅拍互拍' },
    { id: 'museum_gallery', name: '展馆打卡' },
    { id: 'market_tour', name: '市集逛游' },
  ],
  casual_gathering: [
    { id: 'movie_night', name: '观影会' },
    { id: 'board_game', name: '桌游局' },
    { id: 'party_game', name: '游戏局' },
    { id: 'meal_gathering', name: '饭局聚会' },
    { id: 'bar_chat', name: '夜聊小聚' },
    { id: 'coffee_chat', name: '咖啡闲聊' },
    { id: 'newcomer_mixer', name: '新人破冰局' },
    { id: 'free_talk', name: '主题闲聊局' },
  ],
  social_networking: [
    { id: 'friend_making', name: '交友局' },
    { id: 'dating_event', name: '单身交友' },
    { id: 'entrepreneur_meetup', name: '创业者交流会' },
    { id: 'industry_mixer', name: '行业交流会' },
    { id: 'social_wine', name: '社交酒会' },
    { id: 'resource_matching', name: '资源对接会' },
    { id: 'private_circle', name: '圈层私享会' },
    { id: 'host_meetup', name: '主理人交流会' },
  ],
  learning_sharing: [
    { id: 'public_class', name: '公开课' },
    { id: 'lecture', name: '讲座' },
    { id: 'industry_sharing', name: '行业分享会' },
    { id: 'salon', name: '主题沙龙' },
    { id: 'roundtable', name: '圆桌对谈' },
    { id: 'book_club', name: '读书会' },
    { id: 'language_exchange', name: '语言交换' },
    { id: 'career_growth', name: '职业成长分享' },
  ],
  workshop_experience: [
    { id: 'trial_class', name: '免费体验课' },
    { id: 'craft_workshop', name: '手作工作坊' },
    { id: 'coffee_workshop', name: '咖啡体验' },
    { id: 'tea_workshop', name: '茶体验' },
    { id: 'art_workshop', name: '绘画/写作/摄影' },
    { id: 'healing_session', name: '疗愈体验' },
    { id: 'movement_session', name: '瑜伽/冥想/身心活动' },
    { id: 'heritage_workshop', name: '非遗体验' },
  ],
  music_performance: [
    { id: 'live_music', name: '音乐演出' },
    { id: 'open_mic', name: '开放麦' },
    { id: 'dj_party', name: 'DJ/派对活动' },
    { id: 'standup_show', name: '脱口秀' },
    { id: 'improv_theater', name: '即兴戏剧' },
    { id: 'poetry_night', name: '诗歌夜' },
    { id: 'screening_event', name: '影像放映' },
    { id: 'art_showcase', name: '艺术展演' },
  ],
  market_popups: [
    { id: 'creative_market', name: '文创市集' },
    { id: 'food_market', name: '美食市集' },
    { id: 'coffee_market', name: '咖啡市集' },
    { id: 'flea_market', name: '二手闲置' },
    { id: 'swap_market', name: '交换活动' },
    { id: 'brand_popup', name: '品牌快闪' },
    { id: 'trial_tasting', name: '试吃试用' },
    { id: 'cohost_market', name: '联名市集' },
  ],
  outdoor_nature: [
    { id: 'hiking', name: '徒步' },
    { id: 'cycling', name: '骑行' },
    { id: 'camping', name: '露营' },
    { id: 'water_sport', name: '水上活动' },
    { id: 'farm_experience', name: '农场体验' },
    { id: 'stargazing', name: '观星活动' },
    { id: 'trail_walk', name: '自然轻徒步' },
    { id: 'outdoor_photo', name: '户外摄影' },
  ],
  family_pet: [
    { id: 'parent_child', name: '亲子活动' },
    { id: 'family_day', name: '家庭活动' },
    { id: 'children_workshop', name: '儿童手作' },
    { id: 'nature_education', name: '自然教育' },
    { id: 'pet_meetup', name: '宠物社交' },
    { id: 'pet_walk', name: '遛宠活动' },
    { id: 'pet_friendly_market', name: '宠物友好市集' },
  ],
  public_welfare: [
    { id: 'volunteer_service', name: '志愿服务' },
    { id: 'community_cleanup', name: '社区清洁行动' },
    { id: 'eco_action', name: '环保行动' },
    { id: 'public_charity_event', name: '公益筹办活动' },
    { id: 'neighborhood_mutual_aid', name: '邻里互助' },
    { id: 'skill_volunteer', name: '技能公益分享' },
    { id: 'donation_drive', name: '公益募捐' },
    { id: 'swap_freecycle', name: '公益交换' },
  ],
  nomad_city: [
    { id: 'newcomer_welcome', name: '新来大理欢迎局' },
    { id: 'city_settlement_help', name: '本地安顿互助' },
    { id: 'digital_nomad_meetup', name: '数字游民见面会' },
    { id: 'remote_work_study', name: '远程工作学习局' },
    { id: 'co_living_social', name: '共居社交' },
    { id: 'local_buddy_pairing', name: '同城搭子配对' },
    { id: 'rental_life_share', name: '租房生活经验分享' },
    { id: 'city_language_exchange', name: '旅居语言交流' },
  ],
  festival_theme: [
    { id: 'march_street_theme', name: '三月街主题' },
    { id: 'torch_festival_theme', name: '火把节主题' },
    { id: 'bai_folk_theme', name: '白族民俗主题' },
    { id: 'festival_holiday', name: '节日限定活动' },
    { id: 'seasonal_theme', name: '季节主题活动' },
    { id: 'new_year_theme', name: '跨年主题' },
    { id: 'valentine_theme', name: '七夕/情人节主题' },
    { id: 'heritage_theme', name: '非遗文化主题' },
  ],
}

const CATEGORY_TO_SCENE_TYPE = {
  sport: { sceneId: 'outdoor_nature', typeId: 'trail_walk' },
  cycling: { sceneId: 'outdoor_nature', typeId: 'cycling' },
  outdoor: { sceneId: 'outdoor_nature', typeId: 'hiking' },
  music: { sceneId: 'music_performance', typeId: 'live_music' },
  game: { sceneId: 'casual_gathering', typeId: 'board_game' },
  culture: { sceneId: 'learning_sharing', typeId: 'salon' },
  food: { sceneId: 'casual_gathering', typeId: 'meal_gathering' },
  photo: { sceneId: 'local_explore', typeId: 'photo_walk' },
  wellness: { sceneId: 'workshop_experience', typeId: 'movement_session' },
  social: { sceneId: 'social_networking', typeId: 'friend_making' },
  other: { sceneId: 'casual_gathering', typeId: 'free_talk' },
}

function normalizeCategoryId(categoryId = '') {
  const safe = String(categoryId || '').trim().toLowerCase()
  return LEGACY_CATEGORY_ID_MAP[safe] || safe || 'other'
}

function normalizeSceneId(sceneId = '') {
  const safe = String(sceneId || '').trim()
  return SCENE_LABEL_MAP[safe] ? safe : ''
}

function resolveTypeForScene(sceneId = '', typeId = '') {
  const list = TYPE_OPTIONS_BY_SCENE[sceneId] || []
  const safeTypeId = String(typeId || '').trim()
  if (!safeTypeId) return list[0] || null
  return list.find((item) => item.id === safeTypeId) || null
}

function resolveSceneTypeFromLegacyFields(input = {}) {
  const sceneIdFromInput = normalizeSceneId(input?.sceneId)
  const normalizedCategoryId = normalizeCategoryId(input?.categoryId || 'other')
  const fallback = CATEGORY_TO_SCENE_TYPE[normalizedCategoryId] || CATEGORY_TO_SCENE_TYPE.other
  const finalSceneId = sceneIdFromInput || fallback.sceneId
  const resolvedType = resolveTypeForScene(finalSceneId, input?.typeId) || resolveTypeForScene(finalSceneId, fallback.typeId)
  return {
    sceneId: finalSceneId,
    sceneName: SCENE_LABEL_MAP[finalSceneId] || '未分类场景',
    typeId: String(resolvedType?.id || ''),
    typeName: String(resolvedType?.name || '未分类'),
  }
}

function parseAdminMeta(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    isAdmin: adminOpenids.includes(openid),
  }
}

function mapRiskLevelByScore(score = 0) {
  const n = Number(score || 0)
  if (n >= 70) return 'L3'
  if (n >= 40) return 'L2'
  if (n >= 20) return 'L1'
  return 'L0'
}

function getActiveRiskTagsFromMeta(meta = [], nowMs = Date.now()) {
  if (!Array.isArray(meta)) return []
  return meta
    .filter((item) => {
      if (!item || item.status === 'expired') return false
      const expiresAtMs = new Date(item.expiresAt).getTime()
      if (Number.isFinite(expiresAtMs) && expiresAtMs <= nowMs) return false
      return true
    })
    .map((item) => item.label || item.code || '')
    .filter(Boolean)
}

function buildTrustProfile(activity, user, nowMs) {
  const hasPlatformVerified = !!(
    user?.platformVerified ||
    user?.trustVerified ||
    user?.verifyStatus === 'platform_verified' ||
    activity?.trustProfile?.trustLevel === 'A'
  )
  const isRealVerified = !!(user?.isVerified || user?.verifyStatus === 'approved' || activity?.isVerified)

  let trustLevel = 'C'
  if (hasPlatformVerified) trustLevel = 'A'
  else if (isRealVerified) trustLevel = 'B'

  const displayStars = trustLevel === 'A' ? 5 : trustLevel === 'B' ? 4 : 3
  const identityLabel = trustLevel === 'A'
    ? '平台核验'
    : trustLevel === 'B'
      ? '已认证'
      : '新入驻'

  const tags = new Set()
  if (trustLevel === 'C') tags.add('新入驻')
  const startMs = new Date(activity.startTime).getTime()
  if (Number.isFinite(startMs) && startMs > nowMs && startMs - nowMs <= 24 * 60 * 60 * 1000) {
    tags.add('临时组织')
  }
  const modificationRiskScore = Number(activity.modificationRiskScore || activity.modificationRisk || 0)
  if (modificationRiskScore >= 2) tags.add('曾发生变更')

  const riskTagsFromMeta = getActiveRiskTagsFromMeta(activity?.riskTagMeta, nowMs)
  riskTagsFromMeta.forEach((tag) => tags.add(tag))
  ;(Array.isArray(activity?.riskTags) ? activity.riskTags : []).forEach((tag) => tags.add(tag))
  const presetTags = Array.isArray(activity?.trustProfile?.riskTags) ? activity.trustProfile.riskTags : []
  presetTags.forEach((tag) => tags.add(tag))
  const riskTags = [...tags].slice(0, 3)

  const fallbackScore = trustLevel === 'A' ? 8 : trustLevel === 'B' ? 18 : 32
  const riskScore = Number.isFinite(Number(activity?.riskScore))
    ? Number(activity.riskScore)
    : fallbackScore + (modificationRiskScore >= 3 ? 30 : modificationRiskScore >= 2 ? 16 : 0)
  const riskLevel = activity?.riskLevel ||
    activity?.riskControl?.autoRiskLevel ||
    activity?.trustProfile?.riskLevel ||
    mapRiskLevelByScore(riskScore)

  return {
    trustLevel,
    displayStars,
    starText: `${'★'.repeat(displayStars)}${'☆'.repeat(5 - displayStars)}`,
    identityLabel,
    riskTags,
    riskLevel,
    riskScore,
    internalScore: trustLevel === 'A' ? 90 : trustLevel === 'B' ? 75 : 60,
  }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  const { activityId } = event
  const { isAdmin } = parseAdminMeta(OPENID)

  if (!activityId) {
    return { success: false, error: 'INVALID_ACTIVITY_ID', message: '缺少活动ID' }
  }

  const res = await db.collection('activities').doc(activityId).get().catch(() => null)
  if (!res || !res.data) {
    return { success: false, error: 'NOT_FOUND', message: '活动不存在' }
  }

  const nowMs = Date.now()
  const activity = res.data
  const { data: users } = await db.collection('users')
    .where({ _openid: activity.publisherId })
    .limit(1)
    .field({
      _openid: true,
      isVerified: true,
      verifyStatus: true,
      platformVerified: true,
      trustVerified: true,
    })
    .get()
  const publisher = users[0] || null
  const categoryId = normalizeCategoryId(activity.categoryId || 'other')
  const sceneType = resolveSceneTypeFromLegacyFields({
    sceneId: activity.sceneId,
    typeId: activity.typeId,
    categoryId,
  })
  const enrichedActivity = {
    ...activity,
    categoryId,
    categoryLabel: CATEGORY_MAP[categoryId] || '其他',
    sceneId: activity.sceneId || sceneType.sceneId,
    sceneName: activity.sceneName || sceneType.sceneName,
    typeId: activity.typeId || sceneType.typeId,
    typeName: activity.typeName || sceneType.typeName,
    trustProfile: buildTrustProfile(activity, publisher, nowMs),
  }
  const { data: joinedList } = await db.collection('participations')
    .where({ activityId, userId: OPENID, status: 'joined' })
    .limit(1)
    .get()

  const isPublisher = activity.publisherId === OPENID
  let participantList = []
  if (isPublisher) {
    const { data: rawParticipants } = await db.collection('participations')
      .where({ activityId, status: 'joined' })
      .orderBy('joinedAt', 'desc')
      .limit(100)
      .field({
        _id: true,
        userId: true,
        userNickname: true,
        userAvatar: true,
        joinedAt: true,
        attendanceStatus: true,
        attendanceMarkedAt: true,
        attendanceMarkedBy: true,
        attendanceNote: true,
      })
      .get()

    participantList = (rawParticipants || []).map((item) => ({
      _id: item._id,
      openid: item.userId || '',
      nickname: item.userNickname || '匿名用户',
      avatar: item.userAvatar || '',
      joinedAt: item.joinedAt || null,
      attendanceStatus: item.attendanceStatus || '',
      attendanceMarkedAt: item.attendanceMarkedAt || null,
      attendanceMarkedBy: item.attendanceMarkedBy || '',
      attendanceNote: item.attendanceNote || '',
    }))
  }

  let adminInsight = null
  if (isAdmin) {
    const [reportsRes, adminActionsRes] = await Promise.all([
      db.collection('adminActions')
        .where({ action: 'report', targetId: activityId })
        .orderBy('createdAt', 'desc')
        .limit(20)
        .field({
          _id: true,
          reason: true,
          createdAt: true,
          reportStatus: true,
          handleAction: true,
          handleNote: true,
          handledAt: true,
          reporterNickname: true,
          reporterOpenid: true,
        })
        .get(),
      db.collection('adminActions')
        .where({
          targetType: 'activity',
          targetId: activityId,
        })
        .orderBy('createdAt', 'desc')
        .limit(20)
        .field({
          _id: true,
          action: true,
          reason: true,
          result: true,
          adminOpenid: true,
          adminRole: true,
          createdAt: true,
        })
        .get(),
    ])

    const reportList = reportsRes.data || []
    const actionHistory = (adminActionsRes.data || []).map((item) => ({
      _id: item._id,
      action: item.action,
      reason: item.reason || '',
      result: item.result || '',
      adminOpenid: item.adminOpenid || '',
      adminRole: item.adminRole || 'admin',
      createdAt: item.createdAt || null,
    }))

    const latestReport = reportList[0] || null
    const pendingReports = reportList.filter((item) => (item.reportStatus || 'PENDING') === 'PENDING').length
    const handledReports = reportList.filter((item) => item.reportStatus === 'HANDLED').length
    const ignoredReports = reportList.filter((item) => item.reportStatus === 'IGNORED').length

    adminInsight = {
      isAdminView: true,
      totalReports: reportList.length,
      pendingReports,
      handledReports,
      ignoredReports,
      latestReportReason: latestReport?.reason || '',
      latestReportAt: latestReport?.createdAt || null,
      latestReportStatus: latestReport?.reportStatus || '',
      latestHandleNote: latestReport?.handleNote || '',
      latestHandledAt: latestReport?.handledAt || null,
      actionHistory: actionHistory.slice(0, 5),
    }
  }

  return {
    success: true,
    activity: enrichedActivity,
    hasJoined: joinedList.length > 0,
    isPublisher,
    isAdmin,
    adminInsight,
    participantList,
    currentOpenid: OPENID,
    serverTime: nowMs,
    serverTimestamp: nowMs,
  }
}
