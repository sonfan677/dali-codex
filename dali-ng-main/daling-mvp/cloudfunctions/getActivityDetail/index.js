const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

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
    { id: 'old_town_village_walk', name: '古城/村落漫游' },
    { id: 'hidden_spot_explore', name: '小众点位探索' },
    { id: 'erhai_co_travel', name: '洱海沿线同游' },
    { id: 'store_hopping', name: '探店活动' },
    { id: 'cafe_hopping', name: '咖啡馆串联' },
    { id: 'museum_heritage_checkin', name: '博物馆/展馆/非遗点位打卡' },
    { id: 'photo_walk', name: '旅拍互拍' },
    { id: 'market_food_walk', name: '菜市场/早市/夜市/美食逛吃' },
    { id: 'sunrise_sunset_trip', name: '日落/日出活动' },
    { id: 'city_walk', name: '城市 walk' },
  ],
  casual_gathering: [
    { id: 'meal_buddy', name: '饭搭子局' },
    { id: 'board_game', name: '桌游局' },
    { id: 'movie_meetup', name: '观影会' },
    { id: 'game_party', name: '游戏局' },
    { id: 'bar_gathering', name: '小酒馆聚会' },
    { id: 'light_sports', name: '轻运动局' },
    { id: 'weekend_chill', name: '周末松弛局' },
    { id: 'random_buddy', name: '随机搭子局' },
  ],
  social_networking: [
    { id: 'friend_making', name: '交友局' },
    { id: 'singles_social', name: '单身社交' },
    { id: 'women_social', name: '女性社交局' },
    { id: 'entrepreneur_meetup', name: '创业者交流会' },
    { id: 'industry_mixer', name: '行业交流会' },
    { id: 'industry_wine_social', name: '行业社交酒会' },
    { id: 'resource_matching', name: '资源对接会' },
    { id: 'host_meetup', name: '主理人交流会' },
    { id: 'private_circle', name: '圈层私享会' },
    { id: 'closed_small_group', name: '闭门小型局' },
  ],
  learning_sharing: [
    { id: 'public_class', name: '公开课' },
    { id: 'lecture', name: '讲座' },
    { id: 'guest_sharing', name: '嘉宾分享' },
    { id: 'themed_salon', name: '主题沙龙' },
    { id: 'roundtable', name: '圆桌对谈' },
    { id: 'book_club', name: '读书会' },
    { id: 'language_exchange', name: '语言交换' },
    { id: 'career_growth', name: '职业成长分享' },
    { id: 'retrospective_review', name: '经验复盘会' },
    { id: 'knowledge_qa', name: '知识问答会' },
  ],
  workshop_experience: [
    { id: 'free_trial_class', name: '免费体验课' },
    { id: 'handicraft_class', name: '手作课' },
    { id: 'floral_workshop', name: '花艺体验' },
    { id: 'silver_craft_workshop', name: '银器体验' },
    { id: 'aroma_workshop', name: '香薰体验' },
    { id: 'pottery_workshop', name: '陶艺体验' },
    { id: 'photography_workshop', name: '摄影工作坊' },
    { id: 'writing_workshop', name: '写作工作坊' },
    { id: 'painting_workshop', name: '绘画工作坊' },
    { id: 'coffee_workshop', name: '咖啡体验' },
    { id: 'tea_workshop', name: '茶体验' },
    { id: 'cocktail_workshop', name: '调酒体验' },
    { id: 'heritage_workshop', name: '非遗体验' },
    { id: 'tie_dye_workshop', name: '白族扎染体验' },
    { id: 'jia_ma_workshop', name: '甲马体验' },
    { id: 'wa_mao_workshop', name: '瓦猫体验' },
    { id: 'meditation_yoga_workshop', name: '冥想/瑜伽体验' },
    { id: 'healing_workshop', name: '身心疗愈体验' },
    { id: 'baking_cooking_workshop', name: '烘焙/料理体验' },
  ],
  music_performance: [
    { id: 'live_music', name: '音乐演出' },
    { id: 'folk_live', name: '民谣 live' },
    { id: 'dj_party', name: 'DJ/派对' },
    { id: 'open_mic', name: '开放麦' },
    { id: 'standup_show', name: '脱口秀' },
    { id: 'improv_theater', name: '即兴戏剧' },
    { id: 'video_screening', name: '影像放映' },
    { id: 'movie_screening', name: '电影放映' },
    { id: 'poetry_night', name: '诗歌夜' },
    { id: 'art_showcase', name: '艺术展演' },
  ],
  market_popups: [
    { id: 'creative_market', name: '文创市集' },
    { id: 'food_market', name: '美食市集' },
    { id: 'coffee_market', name: '咖啡市集' },
    { id: 'secondhand_swap', name: '二手交换' },
    { id: 'idle_recycle', name: '闲置循环' },
    { id: 'tasting_event', name: '试吃活动' },
    { id: 'trial_event', name: '试用体验' },
    { id: 'brand_popup', name: '品牌快闪' },
    { id: 'cohost_event', name: '联名活动' },
    { id: 'stall_recruitment', name: '摆摊招募' },
    { id: 'pet_friendly_market', name: '宠物友好市集' },
  ],
  outdoor_nature: [
    { id: 'hiking', name: '徒步' },
    { id: 'running', name: '跑步' },
    { id: 'frisbee', name: '飞盘' },
    { id: 'walking', name: '散步' },
    { id: 'sunbathing', name: '晒太阳' },
    { id: 'baseball', name: '棒球' },
    { id: 'basketball', name: '篮球' },
    { id: 'badminton', name: '羽毛球' },
    { id: 'tennis', name: '网球' },
    { id: 'cycling', name: '骑行' },
    { id: 'camping', name: '露营' },
    { id: 'paddle_water_sports', name: '桨板/水上活动' },
    { id: 'stargazing', name: '观星活动' },
    { id: 'farm_experience', name: '农场体验' },
    { id: 'nature_photography', name: '自然摄影' },
    { id: 'light_trail_run', name: '轻越野' },
    { id: 'outdoor_social', name: '户外社交活动' },
    { id: 'mountain_healing', name: '山野疗愈' },
  ],
  family_pet: [
    { id: 'parent_child', name: '亲子活动' },
    { id: 'children_handcraft', name: '儿童手作' },
    { id: 'family_activity', name: '家庭活动' },
    { id: 'parent_child_movie', name: '亲子观影' },
    { id: 'nature_education', name: '自然教育' },
    { id: 'pet_social', name: '宠物社交' },
    { id: 'dog_walk', name: '遛狗局' },
    { id: 'pet_friendly_gathering', name: '宠物友好聚会' },
    { id: 'pet_photography', name: '宠物摄影' },
    { id: 'pet_friendly_market', name: '宠物友好市集' },
  ],
  public_welfare: [
    { id: 'volunteer_activity', name: '志愿活动' },
    { id: 'eco_activity', name: '环保活动' },
    { id: 'beach_cleanup', name: '净滩/清洁活动' },
    { id: 'charity_class', name: '公益课堂' },
    { id: 'community_building', name: '社区共建' },
    { id: 'old_item_swap', name: '旧物交换' },
    { id: 'co_creation_activity', name: '共创活动' },
    { id: 'farmer_support', name: '助农活动' },
  ],
  nomad_city: [
    { id: 'newcomer_welcome', name: '新来大理欢迎会' },
    { id: 'nomad_icebreak', name: '旅居者破冰局' },
    { id: 'digital_nomad_meetup', name: '数字游民见面会' },
    { id: 'life_guide_sharing', name: '生活指南分享会' },
    { id: 'city_buddy_group', name: '同城搭子局' },
    { id: 'host_co_creation', name: '主理人共创会' },
    { id: 'coliving_community', name: '共居社区活动' },
    { id: 'local_integration', name: '在地融入活动' },
  ],
  festival_theme: [
    { id: 'march_street_theme', name: '三月街主题活动' },
    { id: 'torch_festival_theme', name: '火把节主题活动' },
    { id: 'bai_folk_experience', name: '白族民俗体验' },
    { id: 'solar_term_activity', name: '节气活动' },
    { id: 'spring_festival_theme', name: '春节主题' },
    { id: 'valentine_theme', name: '七夕/情人节主题' },
    { id: 'labor_day_theme', name: '五一主题' },
    { id: 'summer_theme', name: '暑期主题' },
    { id: 'national_day_theme', name: '国庆主题' },
    { id: 'new_year_countdown', name: '跨年活动' },
    { id: 'rao_san_ling_experience', name: '绕三灵相关文化体验' },
    { id: 'bai_song_festival', name: '白族歌会/对歌/打歌' },
    { id: 'heritage_theme_week', name: '非遗主题周' },
    { id: 'tea_coffee_culture_theme', name: '茶文化/咖啡文化主题活动' },
    { id: 'youfeng_location_theme', name: '“有风”影视取景地主题活动' },
  ],
}

const CATEGORY_TO_SCENE_TYPE = {
  sport: { sceneId: 'outdoor_nature', typeId: 'running' },
  cycling: { sceneId: 'outdoor_nature', typeId: 'cycling' },
  outdoor: { sceneId: 'outdoor_nature', typeId: 'hiking' },
  music: { sceneId: 'music_performance', typeId: 'live_music' },
  game: { sceneId: 'casual_gathering', typeId: 'board_game' },
  culture: { sceneId: 'learning_sharing', typeId: 'public_class' },
  food: { sceneId: 'casual_gathering', typeId: 'meal_buddy' },
  photo: { sceneId: 'local_explore', typeId: 'photo_walk' },
  wellness: { sceneId: 'workshop_experience', typeId: 'healing_workshop' },
  social: { sceneId: 'social_networking', typeId: 'friend_making' },
  other: { sceneId: 'casual_gathering', typeId: 'random_buddy' },
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

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function buildAdminOpsTagSummary(profile = null) {
  if (!profile || typeof profile !== 'object') return null
  const keywordHits = safeArray(profile?.keywordEnhancement?.hits)
    .map((item) => String(item?.label || '').trim())
    .filter(Boolean)
  return {
    version: String(profile.version || ''),
    coreTags: safeArray(profile.coreTags).slice(0, 6),
    activityGoal: safeArray(profile?.dimensions?.activityGoal).slice(0, 4),
    chargingMode: safeArray(profile?.dimensions?.commercial?.chargingMode).slice(0, 3),
    riskBase: safeArray(profile?.dimensions?.risk?.base).slice(0, 3),
    regionLayer: safeArray(profile?.dimensions?.region?.cityLayer).slice(0, 3),
    distribution: safeArray(profile?.dimensions?.operation?.distribution).slice(0, 4),
    keywordRuleHits: [...new Set(keywordHits)].slice(0, 6),
    keywordHitCount: Number(profile?.keywordEnhancement?.hitCount || 0),
    keywordScoreDelta: Number(profile?.keywordEnhancement?.scoreDelta || 0),
    riskTriggerFlags: {
      isOutdoor: !!profile?.riskTriggerFlags?.isOutdoor,
      isAlcohol: !!profile?.riskTriggerFlags?.isAlcohol,
      isChildren: !!profile?.riskTriggerFlags?.isChildren,
      isPet: !!profile?.riskTriggerFlags?.isPet,
      isApprovalRequired: !!profile?.riskTriggerFlags?.isApprovalRequired,
    },
    generatedAtMs: Number(profile.generatedAtMs || 0) || 0,
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
    chargeType: String(activity.chargeType || activity.pricing?.chargeType || 'free'),
    feeAmount: Number(activity.feeAmount ?? activity.pricing?.feeAmount ?? 0) || 0,
    pricing: {
      chargeType: String(activity.pricing?.chargeType || activity.chargeType || 'free'),
      feeAmount: Number(activity.pricing?.feeAmount ?? activity.feeAmount ?? 0) || 0,
      currency: activity.pricing?.currency || 'CNY',
    },
    allowWaitlist: !!(activity.allowWaitlist ?? activity.joinPolicy?.allowWaitlist),
    requireApproval: !!(activity.requireApproval ?? activity.joinPolicy?.requireApproval),
    joinPolicy: {
      allowWaitlist: !!(activity.joinPolicy?.allowWaitlist ?? activity.allowWaitlist),
      requireApproval: !!(activity.joinPolicy?.requireApproval ?? activity.requireApproval),
    },
    trustProfile: buildTrustProfile(activity, publisher, nowMs),
  }
  const adminOpsTagSummary = buildAdminOpsTagSummary(activity?.opsTagProfile)
  if (!isAdmin) {
    delete enrichedActivity.opsTagProfile
  }
  const { data: joinedList } = await db.collection('participations')
    .where({
      activityId,
      userId: OPENID,
      status: _.in(['joined', 'pending_approval', 'waitlist']),
    })
    .limit(1)
    .get()
  const joinStatus = String(joinedList[0]?.status || 'none')

  const isPublisher = activity.publisherId === OPENID
  const canSeeContact = isPublisher || isAdmin || joinStatus === 'joined'
  const sourceContactInfo = activity.contactInfo || {}
  const maskedContactInfo = canSeeContact
    ? sourceContactInfo
    : {
      visibility: 'joined_only',
      locked: true,
      hasPhone: !!sourceContactInfo.phone,
      hasWechat: !!sourceContactInfo.wechat,
      hasWechatQrcode: !!sourceContactInfo.wechatQrcodeFileId,
    }
  enrichedActivity.contactInfo = maskedContactInfo

  let participantList = []
  if (isPublisher) {
    const { data: rawParticipants } = await db.collection('participations')
      .where({ activityId })
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
        status: true,
        reviewStatus: true,
      })
      .get()

    participantList = (rawParticipants || [])
      .filter((item) => ['joined', 'pending_approval', 'waitlist'].includes(String(item.status || '')))
      .map((item) => ({
      _id: item._id,
      openid: item.userId || '',
      nickname: item.userNickname || '匿名用户',
      avatar: item.userAvatar || '',
      joinedAt: item.joinedAt || null,
      attendanceStatus: item.attendanceStatus || '',
      attendanceMarkedAt: item.attendanceMarkedAt || null,
      attendanceMarkedBy: item.attendanceMarkedBy || '',
      attendanceNote: item.attendanceNote || '',
      participationStatus: item.status || 'joined',
      reviewStatus: item.reviewStatus || '',
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
      opsTagSummary: adminOpsTagSummary,
      actionHistory: actionHistory.slice(0, 5),
    }
  }

  return {
    success: true,
    activity: enrichedActivity,
    hasJoined: joinStatus === 'joined',
    joinStatus,
    canSeeContact,
    isPublisher,
    isAdmin,
    adminInsight,
    participantList,
    currentOpenid: OPENID,
    serverTime: nowMs,
    serverTimestamp: nowMs,
  }
}
