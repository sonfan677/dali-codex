const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command
const { buildOpsTagProfile, OPS_TAG_VERSION } = require('./opsTagging')
const VERIFY_AUTO_APPROVE_DEFAULT_MINUTES = 10

const DEFAULT_CITY_CONFIG = {
  cityId: 'dali',
  version: 'v1-default',
  geo: {
    defaultFenceRadius: 5000,
    minFenceRadius: 2000,
    coordinateSystem: 'GCJ02',
  },
  groupFormation: {
    defaultWindow: 30,
    allowedWindows: [15, 30, 60],
    absoluteMinParticipants: 2,
    maxWindowExtensions: 3,
    organizerDecisionTimeoutHours: 24,
  },
  operations: {
    supplyAlertThreshold: {
      minDailyActivities: 5,
      minFormationRate: 0.4,
      minD1RetentionRate: 0.25,
    },
  }
}

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
    { id: 'hotspot_checkin', name: '热门点位打卡', categoryId: 'photo' },
    { id: 'old_town_village_walk', name: '古城/村落漫游', categoryId: 'culture' },
    { id: 'hidden_spot_explore', name: '小众点位探索', categoryId: 'culture' },
    { id: 'erhai_co_travel', name: '洱海沿线同游', categoryId: 'outdoor' },
    { id: 'store_hopping', name: '探店活动', categoryId: 'food' },
    { id: 'cafe_hopping', name: '咖啡馆串联', categoryId: 'food' },
    { id: 'museum_heritage_checkin', name: '博物馆/展馆/非遗点位打卡', categoryId: 'culture' },
    { id: 'photo_walk', name: '旅拍互拍', categoryId: 'photo' },
    { id: 'market_food_walk', name: '菜市场/早市/夜市/美食逛吃', categoryId: 'food' },
    { id: 'sunrise_sunset_trip', name: '日落/日出活动', categoryId: 'outdoor' },
    { id: 'city_walk', name: '城市 walk', categoryId: 'culture' },
  ],
  casual_gathering: [
    { id: 'meal_buddy', name: '饭搭子局', categoryId: 'food' },
    { id: 'board_game', name: '桌游局', categoryId: 'game' },
    { id: 'movie_meetup', name: '观影会', categoryId: 'culture' },
    { id: 'game_party', name: '游戏局', categoryId: 'game' },
    { id: 'bar_gathering', name: '小酒馆聚会', categoryId: 'social' },
    { id: 'light_sports', name: '轻运动局', categoryId: 'sport' },
    { id: 'weekend_chill', name: '周末松弛局', categoryId: 'social' },
    { id: 'random_buddy', name: '随机搭子局', categoryId: 'social' },
  ],
  social_networking: [
    { id: 'friend_making', name: '交友局', categoryId: 'social' },
    { id: 'singles_social', name: '单身社交', categoryId: 'social' },
    { id: 'women_social', name: '女性社交局', categoryId: 'social' },
    { id: 'entrepreneur_meetup', name: '创业者交流会', categoryId: 'social' },
    { id: 'industry_mixer', name: '行业交流会', categoryId: 'social' },
    { id: 'industry_wine_social', name: '行业社交酒会', categoryId: 'social' },
    { id: 'resource_matching', name: '资源对接会', categoryId: 'social' },
    { id: 'host_meetup', name: '主理人交流会', categoryId: 'social' },
    { id: 'private_circle', name: '圈层私享会', categoryId: 'social' },
    { id: 'closed_small_group', name: '闭门小型局', categoryId: 'social' },
  ],
  learning_sharing: [
    { id: 'public_class', name: '公开课', categoryId: 'culture' },
    { id: 'lecture', name: '讲座', categoryId: 'culture' },
    { id: 'guest_sharing', name: '嘉宾分享', categoryId: 'culture' },
    { id: 'themed_salon', name: '主题沙龙', categoryId: 'culture' },
    { id: 'roundtable', name: '圆桌对谈', categoryId: 'culture' },
    { id: 'book_club', name: '读书会', categoryId: 'culture' },
    { id: 'language_exchange', name: '语言交换', categoryId: 'social' },
    { id: 'career_growth', name: '职业成长分享', categoryId: 'culture' },
    { id: 'retrospective_review', name: '经验复盘会', categoryId: 'culture' },
    { id: 'knowledge_qa', name: '知识问答会', categoryId: 'culture' },
  ],
  workshop_experience: [
    { id: 'free_trial_class', name: '免费体验课', categoryId: 'culture' },
    { id: 'handicraft_class', name: '手作课', categoryId: 'culture' },
    { id: 'floral_workshop', name: '花艺体验', categoryId: 'culture' },
    { id: 'silver_craft_workshop', name: '银器体验', categoryId: 'culture' },
    { id: 'aroma_workshop', name: '香薰体验', categoryId: 'wellness' },
    { id: 'pottery_workshop', name: '陶艺体验', categoryId: 'culture' },
    { id: 'photography_workshop', name: '摄影工作坊', categoryId: 'photo' },
    { id: 'writing_workshop', name: '写作工作坊', categoryId: 'culture' },
    { id: 'painting_workshop', name: '绘画工作坊', categoryId: 'culture' },
    { id: 'coffee_workshop', name: '咖啡体验', categoryId: 'food' },
    { id: 'tea_workshop', name: '茶体验', categoryId: 'food' },
    { id: 'cocktail_workshop', name: '调酒体验', categoryId: 'food' },
    { id: 'heritage_workshop', name: '非遗体验', categoryId: 'culture' },
    { id: 'tie_dye_workshop', name: '白族扎染体验', categoryId: 'culture' },
    { id: 'jia_ma_workshop', name: '甲马体验', categoryId: 'culture' },
    { id: 'wa_mao_workshop', name: '瓦猫体验', categoryId: 'culture' },
    { id: 'meditation_yoga_workshop', name: '冥想/瑜伽体验', categoryId: 'wellness' },
    { id: 'healing_workshop', name: '身心疗愈体验', categoryId: 'wellness' },
    { id: 'baking_cooking_workshop', name: '烘焙/料理体验', categoryId: 'food' },
  ],
  music_performance: [
    { id: 'live_music', name: '音乐演出', categoryId: 'music' },
    { id: 'folk_live', name: '民谣 live', categoryId: 'music' },
    { id: 'dj_party', name: 'DJ/派对', categoryId: 'music' },
    { id: 'open_mic', name: '开放麦', categoryId: 'music' },
    { id: 'standup_show', name: '脱口秀', categoryId: 'culture' },
    { id: 'improv_theater', name: '即兴戏剧', categoryId: 'culture' },
    { id: 'video_screening', name: '影像放映', categoryId: 'culture' },
    { id: 'movie_screening', name: '电影放映', categoryId: 'culture' },
    { id: 'poetry_night', name: '诗歌夜', categoryId: 'culture' },
    { id: 'art_showcase', name: '艺术展演', categoryId: 'culture' },
  ],
  market_popups: [
    { id: 'creative_market', name: '文创市集', categoryId: 'culture' },
    { id: 'food_market', name: '美食市集', categoryId: 'food' },
    { id: 'coffee_market', name: '咖啡市集', categoryId: 'food' },
    { id: 'secondhand_swap', name: '二手交换', categoryId: 'culture' },
    { id: 'idle_recycle', name: '闲置循环', categoryId: 'culture' },
    { id: 'tasting_event', name: '试吃活动', categoryId: 'food' },
    { id: 'trial_event', name: '试用体验', categoryId: 'food' },
    { id: 'brand_popup', name: '品牌快闪', categoryId: 'culture' },
    { id: 'cohost_event', name: '联名活动', categoryId: 'culture' },
    { id: 'stall_recruitment', name: '摆摊招募', categoryId: 'culture' },
    { id: 'pet_friendly_market', name: '宠物友好市集', categoryId: 'culture' },
  ],
  outdoor_nature: [
    { id: 'hiking', name: '徒步', categoryId: 'outdoor' },
    { id: 'running', name: '跑步', categoryId: 'sport' },
    { id: 'frisbee', name: '飞盘', categoryId: 'sport' },
    { id: 'walking', name: '散步', categoryId: 'sport' },
    { id: 'sunbathing', name: '晒太阳', categoryId: 'outdoor' },
    { id: 'baseball', name: '棒球', categoryId: 'sport' },
    { id: 'basketball', name: '篮球', categoryId: 'sport' },
    { id: 'badminton', name: '羽毛球', categoryId: 'sport' },
    { id: 'tennis', name: '网球', categoryId: 'sport' },
    { id: 'cycling', name: '骑行', categoryId: 'cycling' },
    { id: 'camping', name: '露营', categoryId: 'outdoor' },
    { id: 'paddle_water_sports', name: '桨板/水上活动', categoryId: 'outdoor' },
    { id: 'stargazing', name: '观星活动', categoryId: 'outdoor' },
    { id: 'farm_experience', name: '农场体验', categoryId: 'outdoor' },
    { id: 'nature_photography', name: '自然摄影', categoryId: 'photo' },
    { id: 'light_trail_run', name: '轻越野', categoryId: 'sport' },
    { id: 'outdoor_social', name: '户外社交活动', categoryId: 'social' },
    { id: 'mountain_healing', name: '山野疗愈', categoryId: 'wellness' },
  ],
  family_pet: [
    { id: 'parent_child', name: '亲子活动', categoryId: 'social' },
    { id: 'children_handcraft', name: '儿童手作', categoryId: 'culture' },
    { id: 'family_activity', name: '家庭活动', categoryId: 'social' },
    { id: 'parent_child_movie', name: '亲子观影', categoryId: 'culture' },
    { id: 'nature_education', name: '自然教育', categoryId: 'outdoor' },
    { id: 'pet_social', name: '宠物社交', categoryId: 'social' },
    { id: 'dog_walk', name: '遛狗局', categoryId: 'outdoor' },
    { id: 'pet_friendly_gathering', name: '宠物友好聚会', categoryId: 'social' },
    { id: 'pet_photography', name: '宠物摄影', categoryId: 'photo' },
    { id: 'pet_friendly_market', name: '宠物友好市集', categoryId: 'culture' },
  ],
  public_welfare: [
    { id: 'volunteer_activity', name: '志愿活动', categoryId: 'social' },
    { id: 'eco_activity', name: '环保活动', categoryId: 'outdoor' },
    { id: 'beach_cleanup', name: '净滩/清洁活动', categoryId: 'outdoor' },
    { id: 'charity_class', name: '公益课堂', categoryId: 'culture' },
    { id: 'community_building', name: '社区共建', categoryId: 'social' },
    { id: 'old_item_swap', name: '旧物交换', categoryId: 'culture' },
    { id: 'co_creation_activity', name: '共创活动', categoryId: 'social' },
    { id: 'farmer_support', name: '助农活动', categoryId: 'outdoor' },
  ],
  nomad_city: [
    { id: 'newcomer_welcome', name: '新来大理欢迎会', categoryId: 'social' },
    { id: 'nomad_icebreak', name: '旅居者破冰局', categoryId: 'social' },
    { id: 'digital_nomad_meetup', name: '数字游民见面会', categoryId: 'social' },
    { id: 'life_guide_sharing', name: '生活指南分享会', categoryId: 'culture' },
    { id: 'city_buddy_group', name: '同城搭子局', categoryId: 'social' },
    { id: 'host_co_creation', name: '主理人共创会', categoryId: 'social' },
    { id: 'coliving_community', name: '共居社区活动', categoryId: 'social' },
    { id: 'local_integration', name: '在地融入活动', categoryId: 'social' },
  ],
  festival_theme: [
    { id: 'march_street_theme', name: '三月街主题活动', categoryId: 'culture' },
    { id: 'torch_festival_theme', name: '火把节主题活动', categoryId: 'culture' },
    { id: 'bai_folk_experience', name: '白族民俗体验', categoryId: 'culture' },
    { id: 'solar_term_activity', name: '节气活动', categoryId: 'culture' },
    { id: 'spring_festival_theme', name: '春节主题', categoryId: 'culture' },
    { id: 'valentine_theme', name: '七夕/情人节主题', categoryId: 'social' },
    { id: 'labor_day_theme', name: '五一主题', categoryId: 'culture' },
    { id: 'summer_theme', name: '暑期主题', categoryId: 'culture' },
    { id: 'national_day_theme', name: '国庆主题', categoryId: 'culture' },
    { id: 'new_year_countdown', name: '跨年活动', categoryId: 'culture' },
    { id: 'rao_san_ling_experience', name: '绕三灵相关文化体验', categoryId: 'culture' },
    { id: 'bai_song_festival', name: '白族歌会/对歌/打歌', categoryId: 'culture' },
    { id: 'heritage_theme_week', name: '非遗主题周', categoryId: 'culture' },
    { id: 'tea_coffee_culture_theme', name: '茶文化/咖啡文化主题活动', categoryId: 'culture' },
    { id: 'youfeng_location_theme', name: '“有风”影视取景地主题活动', categoryId: 'culture' },
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

const THEME_ID_SET = new Set([
  'dali_local_life', 'erhai_sunset', 'newcomer_dali', 'digital_nomad',
  'march_street', 'torch_festival', 'bai_culture', 'intangible_heritage',
  'coffee_lifestyle', 'healing_retreat', 'summer_holiday', 'national_day',
  'new_year', 'valentine',
])

const USER_VISIBLE_TAG_ALLOW_SET = new Set([
  '适合新朋友', '一个人也能来', '适合游客', '适合旅居者', '适合同城常住', '适合女生', '适合亲子', '可带宠物', '适合初学者', '同频交流',
  '轻松', '热闹', '安静', '深聊', '专业', '文艺', '松弛', '户外自然', '节日氛围', '沉浸体验',
  '小规模', '限额报名', '需要预约', '可反复参与', '新手友好',
  '室内活动', '适合拍照', '有吃有喝',
])

function normalizeCategoryId(categoryId = '') {
  const safe = String(categoryId || '').trim().toLowerCase()
  return LEGACY_CATEGORY_ID_MAP[safe] || safe || 'other'
}

function normalizeSceneId(sceneId = '') {
  const safe = String(sceneId || '').trim()
  return SCENE_LABEL_MAP[safe] ? safe : ''
}

function getTypeDef(sceneId = '', typeId = '') {
  const list = TYPE_OPTIONS_BY_SCENE[sceneId] || []
  const safeTypeId = String(typeId || '').trim()
  if (!safeTypeId) return list[0] || null
  return list.find((item) => item.id === safeTypeId) || null
}

function resolveSceneTypeForPublish({ sceneId = '', typeId = '', categoryId = '' } = {}) {
  const rawSceneId = String(sceneId || '').trim()
  const safeSceneId = normalizeSceneId(rawSceneId)
  if (rawSceneId && !safeSceneId) {
    return { error: 'INVALID_SCENE' }
  }

  if (safeSceneId) {
    const typeDef = getTypeDef(safeSceneId, typeId)
    if (!typeDef || !String(typeId || '').trim()) return { error: 'INVALID_TYPE' }
    return {
      sceneId: safeSceneId,
      sceneName: SCENE_LABEL_MAP[safeSceneId] || '未分类场景',
      typeId: typeDef.id,
      typeName: typeDef.name || '未分类',
      categoryId: normalizeCategoryId(typeDef.categoryId || 'other'),
    }
  }

  const normalizedCategoryId = normalizeCategoryId(categoryId || 'other')
  const fallback = CATEGORY_TO_SCENE_TYPE[normalizedCategoryId] || CATEGORY_TO_SCENE_TYPE.other
  const fallbackSceneId = fallback.sceneId
  const fallbackTypeDef = getTypeDef(fallbackSceneId, fallback.typeId)
  return {
    sceneId: fallbackSceneId,
    sceneName: SCENE_LABEL_MAP[fallbackSceneId] || '未分类场景',
    typeId: fallbackTypeDef?.id || fallback.typeId,
    typeName: fallbackTypeDef?.name || '未分类',
    categoryId: normalizeCategoryId(fallbackTypeDef?.categoryId || normalizedCategoryId || 'other'),
  }
}

function normalizeThemeIds(themeIds = [], max = 3) {
  const unique = []
  ;(Array.isArray(themeIds) ? themeIds : []).forEach((item) => {
    const id = String(item || '').trim()
    if (!id || !THEME_ID_SET.has(id) || unique.includes(id)) return
    unique.push(id)
  })
  return unique.slice(0, Math.max(0, Number(max) || 3))
}

function normalizeVisibleTags(visibleTags = [], max = 12) {
  const unique = []
  ;(Array.isArray(visibleTags) ? visibleTags : []).forEach((item) => {
    const tag = String(item || '').trim()
    if (!tag || !USER_VISIBLE_TAG_ALLOW_SET.has(tag) || unique.includes(tag)) return
    unique.push(tag)
  })
  return unique.slice(0, Math.max(0, Number(max) || 12))
}

// 大理白族自治州发布范围（近似地理围栏，后续可改为配置化 polygon）
const DALI_PREFECTURE_BOUNDS = {
  minLat: 24.5,
  maxLat: 26.7,
  minLng: 98.7,
  maxLng: 101.3,
}

function isInDaliPrefecture(lat, lng) {
  const nLat = Number(lat)
  const nLng = Number(lng)
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false
  return (
    nLat >= DALI_PREFECTURE_BOUNDS.minLat &&
    nLat <= DALI_PREFECTURE_BOUNDS.maxLat &&
    nLng >= DALI_PREFECTURE_BOUNDS.minLng &&
    nLng <= DALI_PREFECTURE_BOUNDS.maxLng
  )
}

function normalizeCustomCategoryLabel(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function normalizeCategoryText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·•・,，。!！?？:：;；、'"`~～\-—_（）()【】\[\]\/\\]/g, '')
}

function resolveDuplicateCategoryLabel(customLabel = '') {
  const normalized = normalizeCategoryText(customLabel)
  if (!normalized) return ''
  const builtinLabels = Object.values(CATEGORY_MAP || {})
  const aliasLabels = ['其它', '读书', '旅行', '电影', '观影', '社交']
  const allLabels = [...builtinLabels, ...aliasLabels]
  const hit = allLabels.find((item) => normalizeCategoryText(item) === normalized)
  return hit || ''
}

async function recordCustomCategoryStat({
  cityId = 'dali',
  customCategoryLabel = '',
  activityId = '',
  publisherId = '',
} = {}) {
  const latestLabel = normalizeCustomCategoryLabel(customCategoryLabel)
  if (!latestLabel) return
  const normalizedLabel = latestLabel.toLowerCase()
  try {
    const { data } = await db.collection('categoryCustomStats')
      .where({ cityId, normalizedLabel })
      .limit(1)
      .get()
    const existed = Array.isArray(data) ? data[0] : null
    if (existed?._id) {
      await db.collection('categoryCustomStats').doc(existed._id).update({
        data: {
          count: _.inc(1),
          latestLabel,
          lastActivityId: activityId || existed.lastActivityId || '',
          lastPublisherId: publisherId || existed.lastPublisherId || '',
          lastUsedAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      return
    }

    await db.collection('categoryCustomStats').add({
      data: {
        cityId,
        normalizedLabel,
        latestLabel,
        count: 1,
        firstUsedAt: db.serverDate(),
        lastUsedAt: db.serverDate(),
        lastActivityId: activityId || '',
        lastPublisherId: publisherId || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  } catch (e) {
    console.error('记录自定义分类统计失败', e)
  }
}

function buildTrustProfileForPublish(user) {
  const trustLevel = user?.platformVerified || user?.trustVerified ? 'A' : 'B'
  const displayStars = trustLevel === 'A' ? 5 : 4
  const identityLabel = trustLevel === 'A' ? '平台核验' : '已认证'
  const riskLevel = trustLevel === 'A' ? 'L0' : 'L1'
  return {
    trustLevel,
    displayStars,
    starText: `${'★'.repeat(displayStars)}${'☆'.repeat(5 - displayStars)}`,
    identityLabel,
    riskTags: [],
    riskLevel,
    internalScore: trustLevel === 'A' ? 90 : 75,
  }
}

function getBaseEffectiveScore(trustLevel = 'C') {
  if (trustLevel === 'A') return 85
  if (trustLevel === 'B') return 70
  return 60
}

function normalizeNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function mergeCityConfig(raw = {}, cityId = '') {
  const defaultConfig = DEFAULT_CITY_CONFIG
  const finalCityId = cityId || raw.cityId || defaultConfig.cityId
  return {
    cityId: finalCityId,
    version: raw.version || defaultConfig.version,
    geo: {
      defaultFenceRadius: normalizeNumber(raw.geo?.defaultFenceRadius, defaultConfig.geo.defaultFenceRadius),
      minFenceRadius: normalizeNumber(raw.geo?.minFenceRadius, defaultConfig.geo.minFenceRadius),
      coordinateSystem: raw.geo?.coordinateSystem || defaultConfig.geo.coordinateSystem,
    },
    groupFormation: {
      defaultWindow: normalizeNumber(raw.groupFormation?.defaultWindow, defaultConfig.groupFormation.defaultWindow),
      allowedWindows: Array.isArray(raw.groupFormation?.allowedWindows) && raw.groupFormation.allowedWindows.length
        ? raw.groupFormation.allowedWindows.map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
        : [...defaultConfig.groupFormation.allowedWindows],
      absoluteMinParticipants: normalizeNumber(
        raw.groupFormation?.absoluteMinParticipants,
        defaultConfig.groupFormation.absoluteMinParticipants
      ),
      maxWindowExtensions: normalizeNumber(
        raw.groupFormation?.maxWindowExtensions,
        defaultConfig.groupFormation.maxWindowExtensions
      ),
      organizerDecisionTimeoutHours: normalizeNumber(
        raw.groupFormation?.organizerDecisionTimeoutHours,
        defaultConfig.groupFormation.organizerDecisionTimeoutHours
      ),
    },
    operations: {
      supplyAlertThreshold: {
        minDailyActivities: normalizeNumber(
          raw.operations?.supplyAlertThreshold?.minDailyActivities,
          defaultConfig.operations.supplyAlertThreshold.minDailyActivities
        ),
        minFormationRate: normalizeNumber(
          raw.operations?.supplyAlertThreshold?.minFormationRate,
          defaultConfig.operations.supplyAlertThreshold.minFormationRate
        ),
        minD1RetentionRate: normalizeNumber(
          raw.operations?.supplyAlertThreshold?.minD1RetentionRate,
          defaultConfig.operations.supplyAlertThreshold.minD1RetentionRate
        ),
      },
    },
  }
}

function mergeReasonCodes(existing = [], incoming = '') {
  const base = Array.isArray(existing) ? existing.filter(Boolean) : []
  if (incoming) base.push(incoming)
  return [...new Set(base)].slice(0, 8)
}

function normalizeIdentityReasons(raw) {
  const list = Array.isArray(raw) ? raw.filter(Boolean) : []
  return [...new Set(list)].slice(0, 8)
}

function toTimestamp(value) {
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : NaN
}

function toChinaDayKeyByMs(input) {
  const ms = Number(input)
  if (!Number.isFinite(ms)) return ''
  const date = new Date(ms + 8 * 60 * 60 * 1000)
  const y = date.getUTCFullYear()
  const m = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const d = `${date.getUTCDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

function normalizeMarketLink(raw = null, startMs = NaN) {
  if (!raw || typeof raw !== 'object') return null
  const marketId = String(raw.marketId || '').trim()
  if (!marketId) return null
  const marketTitle = String(raw.marketTitle || '').trim()
  const inputDayKey = String(raw.marketDayKey || '').trim()
  return {
    marketId,
    marketTitle: marketTitle || '固定集市',
    marketDayKey: inputDayKey || toChinaDayKeyByMs(startMs),
  }
}

function resolveVerifyAutoApproveMinutes() {
  const mins = Number(process.env.VERIFY_AUTO_APPROVE_MINUTES || VERIFY_AUTO_APPROVE_DEFAULT_MINUTES)
  if (!Number.isFinite(mins) || mins <= 0) return VERIFY_AUTO_APPROVE_DEFAULT_MINUTES
  return Math.max(1, Math.min(120, Math.round(mins)))
}

async function maybeAutoApprovePendingVerify(user = null, openid = '') {
  if (!user?._id || !openid) return { autoApproved: false, userPatch: {} }
  if (String(user.verifyStatus || '') !== 'pending') return { autoApproved: false, userPatch: {} }
  const submitTs = toTimestamp(user.verifySubmittedAt || user.updatedAt || user.createdAt)
  if (!Number.isFinite(submitTs)) return { autoApproved: false, userPatch: {} }

  const windowMinutes = resolveVerifyAutoApproveMinutes()
  if (Date.now() - submitTs < windowMinutes * 60 * 1000) return { autoApproved: false, userPatch: {} }

  const updateRes = await db.collection('users').doc(user._id).update({
    data: {
      isVerified: true,
      verifyStatus: 'approved',
      identityCheckRequired: false,
      identityCheckStatus: 'approved',
      verifyAutoApproved: true,
      verifyAutoApprovedAt: db.serverDate(),
      verifyAutoPendingReview: true,
      verifyAutoWindowMinutes: windowMinutes,
      verifyFinalDecisionSource: 'auto',
      verifyReviewedAt: null,
      updatedAt: db.serverDate(),
    },
  }).catch(() => ({ stats: { updated: 0 } }))

  if (Number(updateRes?.stats?.updated || 0) <= 0) return { autoApproved: false, userPatch: {} }

  try {
    await db.collection('adminActions').add({
      data: {
        actionId: `verify_auto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        adminId: 'system',
        adminOpenid: 'system',
        adminRole: 'system',
        targetId: openid,
        targetType: 'user',
        action: 'verify_auto_approved',
        actionType: 'verify_auto_approved',
        reason: `身份核验提交超过${windowMinutes}分钟未人工审核，系统自动通过（待人工复核）`,
        result: '系统自动通过，待管理员复核',
        actionSource: 'system',
        canAutoExecute: true,
        manualOverride: false,
        cityId: user.cityId || 'dali',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  } catch (e) {}

  return {
    autoApproved: true,
    userPatch: {
      isVerified: true,
      verifyStatus: 'approved',
      identityCheckRequired: false,
      identityCheckStatus: 'approved',
      verifyAutoApproved: true,
      verifyAutoPendingReview: true,
    },
  }
}

async function loadCityConfig(cityId = 'dali') {
  const finalCityId = cityId || DEFAULT_CITY_CONFIG.cityId
  try {
    const { data } = await db.collection('cityConfigs')
      .where({ cityId: finalCityId })
      .limit(1)
      .get()
    if (data && data[0]) return mergeCityConfig(data[0], finalCityId)
  } catch (e) {}

  try {
    const { data } = await db.collection('cityConfig')
      .where({ cityId: finalCityId })
      .limit(1)
      .get()
    if (data && data[0]) return mergeCityConfig(data[0], finalCityId)
  } catch (e) {}

  return mergeCityConfig({}, finalCityId)
}

async function markHighFrequencyOrganizerIfNeeded(openid = '') {
  if (!openid) return
  const threshold = Number(process.env.SCHEME2_HIGH_FREQ_PUBLISH_7D || 6)
  if (!Number.isFinite(threshold) || threshold <= 0) return

  try {
    const { data: users } = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .field({
        _id: true,
        identityCheckReasons: true,
      })
      .get()
    const user = users[0]
    if (!user?._id) return

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const { data: published } = await db.collection('activities')
      .where({
        publisherId: openid,
        createdAt: _.gte(since),
      })
      .field({
        _id: true,
      })
      .limit(Math.max(100, threshold + 20))
      .get()
    const publish7dCount = Array.isArray(published) ? published.length : 0
    if (publish7dCount < threshold) {
      await db.collection('users').doc(user._id).update({
        data: {
          recentPublish7dCount: publish7dCount,
          updatedAt: db.serverDate(),
        },
      })
      return
    }

    await db.collection('users').doc(user._id).update({
      data: {
        recentPublish7dCount: publish7dCount,
        identityCheckRequired: true,
        identityCheckStatus: 'required',
        identityCheckReasons: mergeReasonCodes(user.identityCheckReasons, 'HIGH_FREQ_ORGANIZER'),
        identityCheckTriggeredAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  } catch (e) {
    console.error('高频组织者方案2触发更新失败', e)
  }
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()

  // 1. 校验身份核验状态
  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  if (!users.length) {
    return { success: false, error: 'NOT_VERIFIED', message: '请先完成身份核验' }
  }

  let user = users[0]
  const autoApproveResult = await maybeAutoApprovePendingVerify(user, OPENID)
  if (autoApproveResult.autoApproved) {
    user = {
      ...user,
      ...(autoApproveResult.userPatch || {}),
    }
  }

  if (!user.isVerified) {
    return { success: false, error: 'NOT_VERIFIED', message: '请先完成身份核验' }
  }

  const identityCheckRequired = !!user.identityCheckRequired
  const identityCheckStatus = String(user.identityCheckStatus || 'none')
  if (identityCheckRequired && identityCheckStatus !== 'approved') {
    return {
      success: false,
      error: 'IDENTITY_CHECK_REQUIRED',
      message: '当前账号需补充身份核验后才可继续发布',
      identityCheckRequired: true,
      identityCheckStatus,
      identityCheckReasons: normalizeIdentityReasons(user.identityCheckReasons),
    }
  }

  const {
    title,
    description = '',
    categoryId = 'other',
    categoryLabel = '',
    customCategoryLabel = '',
    sceneId = '',
    sceneName = '',
    typeId = '',
    typeName = '',
    themeIds = [],
    visibleTags = [],
    lat,
    lng,
    address = '',
    startTime,
    endTime,
    maxParticipants = 999,
    isGroupFormation = false,
    minParticipants = 0,
    formationWindow,
    cityId,
    marketLink = null,
    chargeType = 'free',
    feeAmount = 0,
    allowWaitlist = false,
    requireApproval = false,
    contactPhone = '',
    contactWechat = '',
    contactQrcodeFileId = '',
  } = event

  const cityConfig = await loadCityConfig(cityId || DEFAULT_CITY_CONFIG.cityId)
  const finalCityId = cityConfig.cityId
  const latNum = Number(lat)
  const lngNum = Number(lng)
  const sceneType = resolveSceneTypeForPublish({ sceneId, typeId, categoryId })
  if (sceneType?.error === 'INVALID_SCENE') {
    return { success: false, error: 'INVALID_SCENE', message: '活动场景不合法' }
  }
  if (sceneType?.error === 'INVALID_TYPE') {
    return { success: false, error: 'INVALID_TYPE', message: '活动类型不合法' }
  }
  const finalSceneId = String(sceneType?.sceneId || '').trim()
  const finalSceneName = String(sceneType?.sceneName || sceneName || '').trim()
  const finalTypeId = String(sceneType?.typeId || '').trim()
  const finalTypeName = String(sceneType?.typeName || typeName || '').trim()
  const finalCategoryId = normalizeCategoryId(sceneType?.categoryId || categoryId || 'other')
  const finalVisibleTags = normalizeVisibleTags(visibleTags, 12)
  const normalizedCustomCategoryLabel = normalizeCustomCategoryLabel(customCategoryLabel)
  const rawThemeIds = Array.isArray(themeIds) ? themeIds : []
  const hasInvalidTheme = rawThemeIds.some((item) => {
    const id = String(item || '').trim()
    return !!id && !THEME_ID_SET.has(id)
  })
  if (hasInvalidTheme) {
    return { success: false, error: 'INVALID_THEME', message: '活动主题不合法' }
  }
  const finalThemeIds = normalizeThemeIds(rawThemeIds, 3)

  // 2. 参数校验
  if (!title || title.trim().length === 0) {
    return { success: false, error: 'INVALID_TITLE', message: '请填写活动标题' }
  }
  if (title.length > 30) {
    return { success: false, error: 'TITLE_TOO_LONG', message: '标题最多30字' }
  }
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return { success: false, error: 'INVALID_LOCATION', message: '请选择活动地点' }
  }
  if (finalCityId !== 'dali') {
    return { success: false, error: 'CITY_NOT_SUPPORTED', message: '当前仅支持在大理白族自治州发布活动' }
  }
  if (!isInDaliPrefecture(latNum, lngNum)) {
    return { success: false, error: 'OUT_OF_DALI_REGION', message: '活动地点需在云南省大理白族自治州范围内' }
  }
  if (!CATEGORY_MAP[finalCategoryId]) {
    return { success: false, error: 'INVALID_CATEGORY', message: '活动分类不合法' }
  }
  if (finalCategoryId === 'other' && !normalizedCustomCategoryLabel) {
    return { success: false, error: 'INVALID_CUSTOM_CATEGORY', message: '选择“其它”时请填写具体分类' }
  }
  if (finalCategoryId === 'other') {
    const duplicateLabel = resolveDuplicateCategoryLabel(normalizedCustomCategoryLabel)
    if (duplicateLabel) {
      return {
        success: false,
        error: 'DUPLICATE_CUSTOM_CATEGORY',
        message: `自定义分类与现有分类“${duplicateLabel}”重复，请直接选择已有分类`,
      }
    }
  }
  const finalChargeType = String(chargeType || '').trim().toLowerCase()
  if (!['free', 'aa', 'paid'].includes(finalChargeType)) {
    return { success: false, error: 'INVALID_CHARGE_TYPE', message: '收费方式不合法' }
  }
  const feeNum = Number(feeAmount)
  const finalFeeAmount = finalChargeType === 'paid'
    ? feeNum
    : 0
  if (finalChargeType === 'paid' && (!Number.isFinite(finalFeeAmount) || finalFeeAmount <= 0)) {
    return { success: false, error: 'INVALID_FEE_AMOUNT', message: '付费金额不合法' }
  }
  const finalAllowWaitlist = !!allowWaitlist
  const finalRequireApproval = !!requireApproval
  const finalContactPhone = String(contactPhone || '').trim()
  const finalContactWechat = String(contactWechat || '').trim()
  const finalContactQrcodeFileId = String(contactQrcodeFileId || '').trim()
  if (!finalContactPhone && !finalContactWechat && !finalContactQrcodeFileId) {
    return { success: false, error: 'CONTACT_REQUIRED', message: '请至少填写1项联系方式' }
  }
  const finalContactType = finalContactQrcodeFileId
    ? 'wechat_qrcode'
    : finalContactWechat
      ? 'wechat'
      : 'phone'
  if (!startTime || !endTime) {
    return { success: false, error: 'INVALID_TIME', message: '请选择活动时间' }
  }

  const now = Date.now()
  const startMs = new Date(startTime).getTime()
  const endMs   = new Date(endTime).getTime()
  const normalizedMarketLink = normalizeMarketLink(marketLink, startMs)

  if (startMs <= now) {
    return { success: false, error: 'START_PASSED', message: '开始时间不能早于现在' }
  }
  if (endMs <= startMs) {
    return { success: false, error: 'END_BEFORE_START', message: '结束时间必须晚于开始时间' }
  }
  if (isGroupFormation && minParticipants < 2) {
    return { success: false, error: 'INVALID_MIN', message: '成团最低人数至少2人' }
  }
  const requestedWindow = Number(formationWindow)
  const finalFormationWindow = isGroupFormation
    ? (Number.isFinite(requestedWindow) ? requestedWindow : cityConfig.groupFormation.defaultWindow)
    : cityConfig.groupFormation.defaultWindow
  if (isGroupFormation && !cityConfig.groupFormation.allowedWindows.includes(Number(finalFormationWindow))) {
    return { success: false, error: 'INVALID_WINDOW', message: '成团时间窗口不合法' }
  }
  if (isGroupFormation && minParticipants < cityConfig.groupFormation.absoluteMinParticipants) {
    return { success: false, error: 'INVALID_MIN', message: '成团最低人数至少2人' }
  }

  const finalCategoryLabel = finalCategoryId === 'other'
    ? '其他'
    : (CATEGORY_MAP[finalCategoryId] || categoryLabel || '其他')

  // 3. 成团截止时间（发布后N分钟）
  const formationDeadline = isGroupFormation
    ? new Date(now + finalFormationWindow * 60 * 1000)
    : null
  const opsTagProfile = buildOpsTagProfile({
    sceneId: finalSceneId,
    typeId: finalTypeId,
    categoryId: finalCategoryId,
    chargeType: finalChargeType,
    feeAmount: finalFeeAmount,
    maxParticipants,
    requireApproval: finalRequireApproval,
    allowWaitlist: finalAllowWaitlist,
    isGroupFormation: !!isGroupFormation,
    startTime,
    address,
    cityId: finalCityId,
    lat: latNum,
    lng: lngNum,
  })

  // 4. 写入数据库
  const trustProfile = buildTrustProfileForPublish(user)
  const baseEffectiveScore = getBaseEffectiveScore(trustProfile.trustLevel)

  const result = await db.collection('activities').add({
    data: {
      _openid: OPENID,
      title: title.trim(),
      description: description.trim(),
      sceneId: finalSceneId,
      sceneName: finalSceneName,
      typeId: finalTypeId,
      typeName: finalTypeName,
      themeIds: finalThemeIds,
      userVisibleTags: finalVisibleTags,
      categoryId: finalCategoryId,
      categoryLabel: finalCategoryLabel,
      categoryCustomLabel: finalCategoryId === 'other' ? normalizedCustomCategoryLabel : '',
      coverImage: '',
      cityId: finalCityId,
      location: {
        lat: latNum,
        lng: lngNum,
        address,
        coordinateSystem: cityConfig.geo.coordinateSystem,
        radius: cityConfig.geo.defaultFenceRadius,
        accuracy: null,
        pathPoints: null,
        pathRadius: null,
      },
      startTime: new Date(startTime),
      endTime:   new Date(endTime),
      maxParticipants,
      minParticipants,
      currentParticipants: 0,
      chargeType: finalChargeType,
      feeAmount: finalFeeAmount,
      pricing: {
        chargeType: finalChargeType,
        feeAmount: finalFeeAmount,
        currency: 'CNY',
      },
      allowWaitlist: finalAllowWaitlist,
      requireApproval: finalRequireApproval,
      joinPolicy: {
        allowWaitlist: finalAllowWaitlist,
        requireApproval: finalRequireApproval,
      },
      status: 'OPEN',
      isGroupFormation,
      formationWindow: isGroupFormation ? finalFormationWindow : null,
      formationDeadline,
      formationStatus: isGroupFormation ? 'FORMING' : null,
      formationWindowOptions: isGroupFormation ? cityConfig.groupFormation.allowedWindows : [],
      maxWindowExtensions: isGroupFormation ? cityConfig.groupFormation.maxWindowExtensions : 0,
      extendWindowCount: 0,
      organizerDecisionDeadline: null,
      organizerDecisionTimeoutHours: isGroupFormation ? cityConfig.groupFormation.organizerDecisionTimeoutHours : 0,
      cityConfigVersion: cityConfig.version,
      intentPhase: {
        enabled: false,
        intentCount: 0,
        intentUsers: [],
        intentStartedAt: null,
        formationTriggeredAt: null,
      },
      contactType: finalContactType,
      contactInfo: {
        phone: finalContactPhone,
        wechat: finalContactWechat,
        wechatQrcodeFileId: finalContactQrcodeFileId,
        type: finalContactType,
        value: finalContactWechat || finalContactPhone || finalContactQrcodeFileId || '',
        visibility: 'joined_only',
        cityId: finalCityId,
        updatedAt: db.serverDate(),
      },
      trustProfile,
      opsTagProfile,
      effectiveScore: baseEffectiveScore,
      decayStartedAt: null,
      participantFeedback: {
        held: 0,
        notHeld: 0,
      },
      riskTags: [],
      riskTagMeta: [],
      riskLevel: trustProfile.riskLevel,
      riskScore: trustProfile.trustLevel === 'A' ? 8 : 18,
      riskReasonCodes: [],
      riskControl: {
        autoDecisionCoverage: 0.8,
        autoRiskScore: trustProfile.trustLevel === 'A' ? 8 : 18,
        autoRiskLevel: trustProfile.riskLevel,
        autoReasonCodes: [],
        manualReviewRequired: false,
        needsBatchReview: false,
        lastEvaluatedAt: db.serverDate(),
        ttlRollbackCount: 0,
      },
      riskAutoVersion: 'v1.0',
      modificationRiskScore: 0,
      publisherId: OPENID,
      publisherNickname: user.nickname,
      publisherAvatar: user.avatarUrl,
      isVerified: true,
      isRecommended: false,
      isMarketCompanion: !!normalizedMarketLink,
      marketLink: normalizedMarketLink
        ? {
          marketId: normalizedMarketLink.marketId,
          marketTitle: normalizedMarketLink.marketTitle,
          marketDayKey: normalizedMarketLink.marketDayKey,
          linkedAt: db.serverDate(),
        }
        : null,
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
  markHighFrequencyOrganizerIfNeeded(OPENID)
  if (finalCategoryId === 'other' && normalizedCustomCategoryLabel) {
    recordCustomCategoryStat({
      cityId: finalCityId,
      customCategoryLabel: normalizedCustomCategoryLabel,
      activityId: result._id,
      publisherId: OPENID,
    })
  }

  return {
    success: true,
    activityId: result._id,
    cityId: finalCityId,
    sceneId: finalSceneId,
    sceneName: finalSceneName,
    typeId: finalTypeId,
    typeName: finalTypeName,
    chargeType: finalChargeType,
    feeAmount: finalFeeAmount,
    opsTagVersion: OPS_TAG_VERSION,
    opsTagCore: Array.isArray(opsTagProfile?.coreTags) ? opsTagProfile.coreTags : [],
    cityConfigVersion: cityConfig.version,
    serverTimestamp: Date.now(),
  }
}
