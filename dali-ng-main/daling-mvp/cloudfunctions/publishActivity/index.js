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
  other_scene: '其它',
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
  other_scene: [],
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
  other: { sceneId: 'other_scene', typeId: '' },
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

const SOCIAL_ENERGY_BY_SCENE = {
  social_networking: 'e',
  music_performance: 'e',
  market_popups: 'e',
  learning_sharing: 'i',
  workshop_experience: 'i',
}

const SOCIAL_ENERGY_BY_TYPE = {
  friend_making: 'e',
  singles_social: 'e',
  women_social: 'e',
  entrepreneur_meetup: 'e',
  industry_mixer: 'e',
  industry_wine_social: 'e',
  resource_matching: 'e',
  host_meetup: 'e',
  private_circle: 'e',
  dj_party: 'e',
  open_mic: 'e',
  bar_gathering: 'e',
  random_buddy: 'e',
  live_music: 'e',
  folk_live: 'e',
  creative_market: 'e',
  food_market: 'e',
  coffee_market: 'e',
  stall_recruitment: 'e',
  book_club: 'i',
  lecture: 'i',
  public_class: 'i',
  guest_sharing: 'i',
  themed_salon: 'i',
  roundtable: 'i',
  knowledge_qa: 'i',
  writing_workshop: 'i',
  painting_workshop: 'i',
  pottery_workshop: 'i',
  movie_screening: 'i',
  video_screening: 'i',
  poetry_night: 'i',
  meditation_yoga_workshop: 'i',
  healing_workshop: 'i',
}

const USER_MAX_THEME_COUNT = 1
const OFFICIAL_MAX_THEME_COUNT = 6
const DEFAULT_USER_MAX_PARTICIPANTS_LIMIT = 30
const PUBLISH_REVIEW_PENDING_STATUS = 'PUBLISH_PENDING'
const CUSTOM_SCENE_ID = 'other_scene'
const CUSTOM_SCENE_TYPE_STATS_COLLECTION = 'sceneCustomTypeStats'
const CUSTOM_TYPE_ID_PREFIX = 'custom_type'
const FESTIVAL_THEME_COLLECTION_CANDIDATES = ['festivalThemes', 'officialFestivalThemes']
const MAX_FESTIVAL_THEME_TAGS = 5
const DEFAULT_ACTIVITY_PUBLISH_RULES_VERSION = 'publish_rules_v1'
const DEFAULT_ORGANIZER_SERVICE_AGREEMENT_VERSION = 'organizer_agreement_v1'
const DEFAULT_PUBLISH_GOVERNANCE_CONFIG = {
  publishRulesVersion: DEFAULT_ACTIVITY_PUBLISH_RULES_VERSION,
  organizerAgreementVersion: DEFAULT_ORGANIZER_SERVICE_AGREEMENT_VERSION,
  complaintDowngradeThreshold: 3,
  complaintRestrictAllThreshold: 6,
  enableComplaintRestriction: true,
  enableTierGate: true,
  userPublishNeedReview: true,
  highRiskForceManualReview: true,
  tierRules: {
    normal: { maxRiskLevel: 'L2', allowPaid: false },
    verified: { maxRiskLevel: 'L2', allowPaid: true },
    commercial: { maxRiskLevel: 'L3', allowPaid: true },
    qualified: { maxRiskLevel: 'L4', allowPaid: true },
  },
}
const ORGANIZER_TIER_LABEL_MAP = {
  normal: '普通发起者',
  verified: '认证发起者',
  commercial: '商业组织者',
  qualified: '资质组织者',
}
const ORGANIZER_TIER_ORDER_MAP = {
  normal: 1,
  verified: 2,
  commercial: 3,
  qualified: 4,
}
const PUBLISH_RISK_LEVEL_ORDER_MAP = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
}

const HIGH_RISK_TYPE_SET = new Set([
  'singles_social',
  'friend_making',
  'women_social',
  'private_circle',
  'closed_small_group',
  'bar_gathering',
  'industry_wine_social',
  'dj_party',
  'paddle_water_sports',
  'camping',
  'light_trail_run',
  'torch_festival_theme',
])

const HIGH_RISK_KEYWORDS = [
  '交友', '单身', '脱单', '私密', '酒局', '微醺', '精酿', '夜骑', '徒步', '骑行', '露营', '篝火', '火把',
]

function parseAdminMeta(openid) {
  const adminOpenids = (process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return {
    isAdmin: adminOpenids.includes(openid),
  }
}

function parseBoolSafe(value, fallback = false) {
  if (value === true || value === false) return value
  const safe = String(value || '').trim().toLowerCase()
  if (['true', '1', 'yes', 'on'].includes(safe)) return true
  if (['false', '0', 'no', 'off'].includes(safe)) return false
  return !!fallback
}

function normalizeRiskLevel(value = 'L2', fallback = 'L2') {
  const safe = String(value || fallback).trim().toUpperCase()
  if (['L1', 'L2', 'L3', 'L4'].includes(safe)) return safe
  return fallback
}

function sanitizeTierRule(raw = {}, fallback = { maxRiskLevel: 'L2', allowPaid: false }) {
  return {
    maxRiskLevel: normalizeRiskLevel(raw?.maxRiskLevel, fallback.maxRiskLevel),
    allowPaid: parseBoolSafe(raw?.allowPaid, fallback.allowPaid),
  }
}

function sanitizePublishGovernanceConfig(raw = {}, current = DEFAULT_PUBLISH_GOVERNANCE_CONFIG) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const base = current && typeof current === 'object'
    ? current
    : DEFAULT_PUBLISH_GOVERNANCE_CONFIG
  const next = {
    publishRulesVersion: String(source.publishRulesVersion || base.publishRulesVersion || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.publishRulesVersion).trim() || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.publishRulesVersion,
    organizerAgreementVersion: String(source.organizerAgreementVersion || base.organizerAgreementVersion || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.organizerAgreementVersion).trim() || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.organizerAgreementVersion,
    complaintDowngradeThreshold: Math.max(1, Math.min(20, Number(normalizeNumber(source.complaintDowngradeThreshold, base.complaintDowngradeThreshold || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.complaintDowngradeThreshold)) || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.complaintDowngradeThreshold)),
    complaintRestrictAllThreshold: Math.max(2, Math.min(30, Number(normalizeNumber(source.complaintRestrictAllThreshold, base.complaintRestrictAllThreshold || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.complaintRestrictAllThreshold)) || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.complaintRestrictAllThreshold)),
    enableComplaintRestriction: parseBoolSafe(source.enableComplaintRestriction, base.enableComplaintRestriction),
    enableTierGate: parseBoolSafe(source.enableTierGate, base.enableTierGate),
    userPublishNeedReview: parseBoolSafe(source.userPublishNeedReview, base.userPublishNeedReview),
    highRiskForceManualReview: parseBoolSafe(source.highRiskForceManualReview, base.highRiskForceManualReview),
  }
  const tierSource = source.tierRules && typeof source.tierRules === 'object'
    ? source.tierRules
    : (base.tierRules || {})
  next.tierRules = {
    normal: sanitizeTierRule(tierSource.normal || {}, base.tierRules?.normal || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules.normal),
    verified: sanitizeTierRule(tierSource.verified || {}, base.tierRules?.verified || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules.verified),
    commercial: sanitizeTierRule(tierSource.commercial || {}, base.tierRules?.commercial || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules.commercial),
    qualified: sanitizeTierRule(tierSource.qualified || {}, base.tierRules?.qualified || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules.qualified),
  }
  return next
}

function resolvePublishGovernanceConfigFromEnv() {
  const envRaw = {
    publishRulesVersion: process.env.ACTIVITY_PUBLISH_RULES_VERSION || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.publishRulesVersion,
    organizerAgreementVersion: process.env.ORGANIZER_SERVICE_AGREEMENT_VERSION || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.organizerAgreementVersion,
    complaintDowngradeThreshold: normalizeNumber(process.env.PUBLISH_COMPLAINT_DOWNGRADE_THRESHOLD, DEFAULT_PUBLISH_GOVERNANCE_CONFIG.complaintDowngradeThreshold),
    complaintRestrictAllThreshold: normalizeNumber(process.env.PUBLISH_COMPLAINT_RESTRICT_ALL_THRESHOLD, DEFAULT_PUBLISH_GOVERNANCE_CONFIG.complaintRestrictAllThreshold),
  }
  return sanitizePublishGovernanceConfig(envRaw, DEFAULT_PUBLISH_GOVERNANCE_CONFIG)
}

async function loadPublishGovernanceConfig(cityId = 'dali') {
  const safeCityId = String(cityId || '').trim() || 'dali'
  const envFallback = resolvePublishGovernanceConfigFromEnv()
  let raw = null
  try {
    const byId = await db.collection('opsConfigs').doc('publish_governance').get()
    raw = byId?.data || null
  } catch (e) {}
  if (!raw) {
    try {
      const byKey = await db.collection('opsConfigs')
        .where({ key: 'publish_governance', cityId: safeCityId })
        .limit(1)
        .get()
      raw = byKey?.data?.[0] || null
    } catch (e) {}
  }
  if (!raw) {
    try {
      let byAction = await db.collection('adminActions')
        .where({
          action: 'update_publish_governance_config',
          targetId: 'publish_governance',
          cityId: safeCityId,
        })
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get()
      let row = byAction?.data?.[0] || null
      if (!row) {
        byAction = await db.collection('adminActions')
          .where({
            action: 'update_publish_governance_config',
            targetId: 'publish_governance',
          })
          .orderBy('createdAt', 'desc')
          .limit(1)
          .get()
        row = byAction?.data?.[0] || null
      }
      if (row?.afterState?.publishGovernanceConfig) {
        raw = {
          publishGovernanceConfig: row.afterState.publishGovernanceConfig,
          version: row.afterState.version || '',
          updatedAt: row.afterState.updatedAt || row.createdAt || null,
          updatedBy: row.afterState.updatedBy || row.adminOpenid || '',
        }
      }
    } catch (e) {}
  }
  return sanitizePublishGovernanceConfig(raw?.publishGovernanceConfig || {}, envFallback)
}

function normalizeOrganizerConsents(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const publishRules = source.publishRules && typeof source.publishRules === 'object'
    ? source.publishRules
    : {}
  const organizerAgreement = source.organizerAgreement && typeof source.organizerAgreement === 'object'
    ? source.organizerAgreement
    : {}
  return {
    publishRules: {
      version: String(publishRules.version || '').trim(),
      acceptedAt: publishRules.acceptedAt || null,
      source: String(publishRules.source || '').trim(),
    },
    organizerAgreement: {
      version: String(organizerAgreement.version || '').trim(),
      acceptedAt: organizerAgreement.acceptedAt || null,
      source: String(organizerAgreement.source || '').trim(),
    },
    updatedAt: source.updatedAt || null,
  }
}

function normalizeConsentAccepted(value) {
  if (value === true || value === false) return value
  const safe = String(value || '').trim().toLowerCase()
  if (safe === 'true' || safe === '1' || safe === 'yes') return true
  if (safe === 'false' || safe === '0' || safe === 'no') return false
  return false
}

function normalizePublishConsentPayload(raw = {}) {
  const source = raw && typeof raw === 'object' ? raw : {}
  const publishRules = source.publishRules && typeof source.publishRules === 'object'
    ? source.publishRules
    : {}
  const organizerAgreement = source.organizerAgreement && typeof source.organizerAgreement === 'object'
    ? source.organizerAgreement
    : {}
  const acceptedAtRaw = source.acceptedAt || source.clientAcceptedAt || null
  const acceptedAtMs = new Date(acceptedAtRaw).getTime()
  return {
    publishRules: {
      accepted: normalizeConsentAccepted(publishRules.accepted),
      version: String(publishRules.version || '').trim(),
    },
    organizerAgreement: {
      accepted: normalizeConsentAccepted(organizerAgreement.accepted),
      version: String(organizerAgreement.version || '').trim(),
    },
    source: String(source.source || 'publish_form').trim() || 'publish_form',
    acceptedAtIso: Number.isFinite(acceptedAtMs) ? new Date(acceptedAtMs).toISOString() : new Date().toISOString(),
  }
}

function hasAcceptedConsentVersion(consents = {}, key = '', version = '') {
  const safeKey = String(key || '').trim()
  if (!safeKey || !version) return false
  const node = consents?.[safeKey]
  if (!node || typeof node !== 'object') return false
  return String(node.version || '').trim() === String(version || '').trim() && !!node.acceptedAt
}

function validatePublishConsents({
  existingConsents = {},
  consentPayload = {},
  governanceConfig = {},
  isAdmin = false,
} = {}) {
  const normalizedExisting = normalizeOrganizerConsents(existingConsents)
  const normalizedPayload = normalizePublishConsentPayload(consentPayload)
  if (isAdmin) {
    return {
      ok: true,
      shouldPersist: false,
      mergedConsents: normalizedExisting,
      missingKeys: [],
      mismatchKeys: [],
    }
  }

  const requiredPublishRulesVersion = String(governanceConfig.publishRulesVersion || '').trim()
  const requiredOrganizerAgreementVersion = String(governanceConfig.organizerAgreementVersion || '').trim()

  const existingPublishRulesAccepted = hasAcceptedConsentVersion(normalizedExisting, 'publishRules', requiredPublishRulesVersion)
  const existingOrganizerAgreementAccepted = hasAcceptedConsentVersion(normalizedExisting, 'organizerAgreement', requiredOrganizerAgreementVersion)

  const payloadPublishRulesAccepted = normalizedPayload.publishRules.accepted
    && normalizedPayload.publishRules.version === requiredPublishRulesVersion
  const payloadOrganizerAgreementAccepted = normalizedPayload.organizerAgreement.accepted
    && normalizedPayload.organizerAgreement.version === requiredOrganizerAgreementVersion

  const missingKeys = []
  const mismatchKeys = []

  if (!existingPublishRulesAccepted && !payloadPublishRulesAccepted) {
    if (normalizedPayload.publishRules.accepted && normalizedPayload.publishRules.version !== requiredPublishRulesVersion) {
      mismatchKeys.push('publishRules')
    } else {
      missingKeys.push('publishRules')
    }
  }
  if (!existingOrganizerAgreementAccepted && !payloadOrganizerAgreementAccepted) {
    if (normalizedPayload.organizerAgreement.accepted && normalizedPayload.organizerAgreement.version !== requiredOrganizerAgreementVersion) {
      mismatchKeys.push('organizerAgreement')
    } else {
      missingKeys.push('organizerAgreement')
    }
  }

  if (mismatchKeys.length > 0) {
    return {
      ok: false,
      error: 'CONSENT_VERSION_MISMATCH',
      message: '协议版本已更新，请重新阅读并同意后发布',
      missingKeys,
      mismatchKeys,
      requiredPublishRulesVersion,
      requiredOrganizerAgreementVersion,
      shouldPersist: false,
      mergedConsents: normalizedExisting,
    }
  }

  if (missingKeys.length > 0) {
    return {
      ok: false,
      error: 'CONSENT_REQUIRED',
      message: '请先阅读并同意《活动发布规则》《组织者服务协议》',
      missingKeys,
      mismatchKeys,
      requiredPublishRulesVersion,
      requiredOrganizerAgreementVersion,
      shouldPersist: false,
      mergedConsents: normalizedExisting,
    }
  }

  const shouldPersist = !existingPublishRulesAccepted || !existingOrganizerAgreementAccepted
  const mergedConsents = shouldPersist
    ? {
        publishRules: {
          version: requiredPublishRulesVersion,
          acceptedAt: normalizedPayload.acceptedAtIso,
          source: normalizedPayload.source,
        },
        organizerAgreement: {
          version: requiredOrganizerAgreementVersion,
          acceptedAt: normalizedPayload.acceptedAtIso,
          source: normalizedPayload.source,
        },
        updatedAt: normalizedPayload.acceptedAtIso,
      }
    : normalizedExisting

  return {
    ok: true,
    error: '',
    message: '',
    missingKeys,
    mismatchKeys,
    requiredPublishRulesVersion,
    requiredOrganizerAgreementVersion,
    shouldPersist,
    mergedConsents,
  }
}

function resolveOrganizerTier(user = {}, isAdmin = false) {
  if (isAdmin) {
    return { tier: 'qualified', source: 'admin' }
  }

  const manualTier = String(
    user.organizerTier
    || user.publisherTier
    || user.organizerLevel
    || ''
  ).trim().toLowerCase()
  if (ORGANIZER_TIER_ORDER_MAP[manualTier]) {
    return { tier: manualTier, source: 'manual' }
  }

  const verifyStatus = String(user.verifyStatus || '').trim().toLowerCase()
  const identityCheckStatus = String(user.identityCheckStatus || '').trim().toLowerCase()
  const isVerified = !!user.isVerified || verifyStatus === 'approved' || verifyStatus === 'platform_verified'
  const phoneVerified = !!user.phoneVerified || String(user.mobileBindStatus || '').trim() === 'bound'
  const hasIdentityCheckApproved = identityCheckStatus === 'approved'

  const qualificationStatus = String(
    user.organizerQualificationStatus
    || user.qualificationStatus
    || user.officialQualificationStatus
    || ''
  ).trim().toLowerCase()
  const hasQualifiedFlag = !!user.organizerQualified || !!user.qualifiedOrganizer || qualificationStatus === 'approved' || qualificationStatus === 'verified'
  if (hasQualifiedFlag && isVerified && phoneVerified) {
    return { tier: 'qualified', source: 'qualified_profile' }
  }

  const identityTags = Array.isArray(user.identityTags) ? user.identityTags : []
  const hasCommercialIdentity = !!user.isCommercialOrganizer
    || !!user.commercialOrganizer
    || identityTags.some((tag) => ['merchant', 'homestay_owner', 'host'].includes(String(tag || '').trim()))
  if (hasCommercialIdentity && isVerified && phoneVerified) {
    return { tier: 'commercial', source: 'commercial_profile' }
  }

  if (isVerified && phoneVerified && hasIdentityCheckApproved) {
    return { tier: 'verified', source: 'verified_profile' }
  }

  if (isVerified && phoneVerified) {
    return { tier: 'verified', source: 'verified_profile_lite' }
  }

  return { tier: 'normal', source: 'default' }
}

function resolveGovernanceRiskLevel({
  publishRiskGate = {},
  chargeType = 'free',
  riskDeclaration = {},
} = {}) {
  const publishRisk = String(publishRiskGate.level || '').trim().toLowerCase()
  if (publishRisk === 'high') return 'L3'
  const hasRiskFlag = Object.values({
    isNightActivity: !!riskDeclaration.isNightActivity,
    isOutdoorActivity: !!riskDeclaration.isOutdoorActivity,
    hasAlcohol: !!riskDeclaration.hasAlcohol,
    hasCarpool: !!riskDeclaration.hasCarpool,
    hasOvernight: !!riskDeclaration.hasOvernight,
    hasMinors: !!riskDeclaration.hasMinors,
  }).some(Boolean)
  if (String(chargeType || '').trim().toLowerCase() !== 'free' || hasRiskFlag) return 'L2'
  return 'L1'
}

function compareRiskLevel(a = 'L1', b = 'L1') {
  const levelA = PUBLISH_RISK_LEVEL_ORDER_MAP[String(a || '').trim().toUpperCase()] || 1
  const levelB = PUBLISH_RISK_LEVEL_ORDER_MAP[String(b || '').trim().toUpperCase()] || 1
  return levelA - levelB
}

function resolveTierPublishPermission({
  organizerTier = 'normal',
  publishRiskLevel = 'L1',
  chargeType = 'free',
  isAdmin = false,
  governanceConfig = DEFAULT_PUBLISH_GOVERNANCE_CONFIG,
} = {}) {
  if (isAdmin) return { allowed: true, reasonCode: '', message: '', maxRiskLevel: 'L4', allowPaid: true }
  const normalizedConfig = sanitizePublishGovernanceConfig(
    governanceConfig,
    DEFAULT_PUBLISH_GOVERNANCE_CONFIG
  )
  if (!normalizedConfig.enableTierGate) {
    return { allowed: true, reasonCode: '', message: '', maxRiskLevel: 'L4', allowPaid: true }
  }
  const tierRuleMap = normalizedConfig.tierRules || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules
  const tier = String(organizerTier || 'normal').trim().toLowerCase()
  const rule = sanitizeTierRule(
    tierRuleMap[tier] || tierRuleMap.normal || DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules.normal,
    DEFAULT_PUBLISH_GOVERNANCE_CONFIG.tierRules.normal
  )
  const normalizedChargeType = String(chargeType || 'free').trim().toLowerCase()
  if (normalizedChargeType === 'paid' && !rule.allowPaid) {
    return {
      allowed: false,
      reasonCode: 'TIER_PAID_NOT_ALLOWED',
      message: '当前账号等级暂不支持发布付费活动，请先升级为认证发起者',
      maxRiskLevel: rule.maxRiskLevel,
      allowPaid: rule.allowPaid,
    }
  }
  if (compareRiskLevel(publishRiskLevel, rule.maxRiskLevel) > 0) {
    return {
      allowed: false,
      reasonCode: 'TIER_RISK_NOT_ALLOWED',
      message: '当前账号等级暂不支持发布该风险等级活动，请先完成更高等级认证',
      maxRiskLevel: rule.maxRiskLevel,
      allowPaid: rule.allowPaid,
    }
  }
  return {
    allowed: true,
    reasonCode: '',
    message: '',
    maxRiskLevel: rule.maxRiskLevel,
    allowPaid: rule.allowPaid,
  }
}

function normalizeRestrictionScopes(scopes = []) {
  const source = Array.isArray(scopes)
    ? scopes
    : String(scopes || '').split(/[,\n，、;；]/g)
  const unique = []
  source.forEach((item) => {
    const safe = String(item || '').trim().toLowerCase()
    if (!safe || unique.includes(safe)) return
    unique.push(safe)
  })
  return unique.slice(0, 8)
}

function resolvePublishRestriction({
  user = {},
  publishRiskLevel = 'L1',
  chargeType = 'free',
  governanceConfig = DEFAULT_PUBLISH_GOVERNANCE_CONFIG,
  nowMs = Date.now(),
} = {}) {
  const normalizedChargeType = String(chargeType || 'free').trim().toLowerCase()
  const normalizedConfig = sanitizePublishGovernanceConfig(
    governanceConfig,
    DEFAULT_PUBLISH_GOVERNANCE_CONFIG
  )
  if (!normalizedConfig.enableComplaintRestriction) {
    return {
      allowed: true,
      code: '',
      message: '',
      snapshot: {
        type: 'disabled',
      },
    }
  }
  const reportAgainstCount = Number(user.reportAgainstCount || 0)
  const complaintDowngradeThreshold = Number(normalizedConfig.complaintDowngradeThreshold || 3)
  const complaintRestrictAllThreshold = Number(normalizedConfig.complaintRestrictAllThreshold || 6)

  const explicitRestriction = user.publishRestriction && typeof user.publishRestriction === 'object'
    ? user.publishRestriction
    : null
  if (explicitRestriction) {
    const untilMs = new Date(explicitRestriction.untilAt).getTime()
    const isActive = explicitRestriction.active === true || (Number.isFinite(untilMs) && nowMs < untilMs)
    if (isActive) {
      const scopes = normalizeRestrictionScopes(explicitRestriction.scopes || [])
      const hitByAll = scopes.length === 0 || scopes.includes('all')
      const hitByPaid = normalizedChargeType === 'paid' && scopes.includes('paid')
      const hitByHighRisk = compareRiskLevel(publishRiskLevel, 'L3') >= 0 && scopes.includes('high_risk')
      if (hitByAll || hitByPaid || hitByHighRisk) {
        return {
          allowed: false,
          code: 'EXPLICIT_RESTRICTION',
          message: String(explicitRestriction.reason || '').trim() || '当前账号发布受限，请联系管理员处理',
          snapshot: {
            type: 'explicit',
            scopes,
            untilAt: explicitRestriction.untilAt || null,
            reason: String(explicitRestriction.reason || '').trim() || '',
          },
        }
      }
    }
  }

  if (reportAgainstCount >= complaintRestrictAllThreshold) {
    return {
      allowed: false,
      code: 'COMPLAINT_RESTRICT_ALL',
      message: '账号投诉较多，当前已临时限制发布，请联系管理员复核',
      snapshot: {
        type: 'auto',
        reportAgainstCount,
        threshold: complaintRestrictAllThreshold,
        scope: 'all',
      },
    }
  }

  if (reportAgainstCount >= complaintDowngradeThreshold) {
    if (normalizedChargeType === 'paid') {
      return {
        allowed: false,
        code: 'COMPLAINT_RESTRICT_PAID',
        message: '账号投诉较多，当前仅可发布免费或AA活动',
        snapshot: {
          type: 'auto',
          reportAgainstCount,
          threshold: complaintDowngradeThreshold,
          scope: 'paid',
        },
      }
    }
    if (compareRiskLevel(publishRiskLevel, 'L3') >= 0) {
      return {
        allowed: false,
        code: 'COMPLAINT_RESTRICT_HIGH_RISK',
        message: '账号投诉较多，当前暂不支持发布高风险活动',
        snapshot: {
          type: 'auto',
          reportAgainstCount,
          threshold: complaintDowngradeThreshold,
          scope: 'high_risk',
        },
      }
    }
  }

  return {
    allowed: true,
    code: '',
    message: '',
    snapshot: {
      type: 'none',
      reportAgainstCount,
      threshold: complaintDowngradeThreshold,
    },
  }
}

function resolveUserMaxParticipantsLimit() {
  const raw = Number(process.env.USER_PUBLISH_MAX_PARTICIPANTS || DEFAULT_USER_MAX_PARTICIPANTS_LIMIT)
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_USER_MAX_PARTICIPANTS_LIMIT
  return Math.max(1, Math.min(300, Math.round(raw)))
}

function normalizeBooleanInput(value) {
  if (value === true || value === false) return value
  const safe = String(value || '').trim().toLowerCase()
  if (safe === 'true' || safe === '1' || safe === 'yes') return true
  if (safe === 'false' || safe === '0' || safe === 'no') return false
  return null
}

function normalizePolicyText(value = '', max = 200) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

function resolveJoinRiskDisclosure({
  publishRiskLevel = 'normal',
  chargeType = 'free',
  sourceFlags = {},
} = {}) {
  const normalizedChargeType = String(chargeType || 'free').trim().toLowerCase()
  const flags = {
    isNight: !!sourceFlags.isNight,
    isOutdoor: !!sourceFlags.isOutdoor,
    hasAlcohol: !!sourceFlags.hasAlcohol,
    hasCarpool: !!sourceFlags.hasCarpool,
    hasOvernight: !!sourceFlags.hasOvernight,
    hasMinors: !!sourceFlags.hasMinors,
  }
  const mediumRiskByFlags = Object.values(flags).some(Boolean) || normalizedChargeType !== 'free'
  const isHighRisk = String(publishRiskLevel || '').trim().toLowerCase() === 'high'
  const level = isHighRisk ? 'L3' : (mediumRiskByFlags ? 'L2' : 'L1')

  const checkItems = []
  if (level !== 'L1') checkItems.push('platformNotOrganizer', 'selfAssessRisk', 'knowOfflineRisk')
  if (level === 'L3') checkItems.push('emergencyPrepared')
  if (normalizedChargeType !== 'free') checkItems.push('knowPaymentByOrganizer')

  return {
    version: 'p1_v1',
    level,
    chargeType: normalizedChargeType,
    flags,
    checkItems: [...new Set(checkItems)],
    generatedAtMs: Date.now(),
  }
}

function resolvePublishRiskGate({
  typeId = '',
  title = '',
  description = '',
  opsTagProfile = null,
} = {}) {
  const reasonCodes = []
  const safeTypeId = String(typeId || '').trim()
  if (safeTypeId && HIGH_RISK_TYPE_SET.has(safeTypeId)) {
    reasonCodes.push(`TYPE_${safeTypeId.toUpperCase()}`)
  }

  const text = `${String(title || '')} ${String(description || '')}`.toLowerCase()
  if (HIGH_RISK_KEYWORDS.some((kw) => text.includes(String(kw).toLowerCase()))) {
    reasonCodes.push('KEYWORD_HIGH_RISK')
  }

  const riskBaseTags = Array.isArray(opsTagProfile?.dimensions?.risk?.base)
    ? opsTagProfile.dimensions.risk.base
    : []
  const hasRiskBaseHit = riskBaseTags.some((tag) => {
    const t = String(tag || '').trim()
    return ['中风险', '高风险', '需人工审核', '需二次确认', '需线下核验'].includes(t)
  })
  if (hasRiskBaseHit) {
    reasonCodes.push('OPS_RISK_BASE')
  }

  const isHighRisk = reasonCodes.length > 0
  return {
    level: isHighRisk ? 'high' : 'normal',
    forceManualReview: isHighRisk,
    reasonCodes: [...new Set(reasonCodes)].slice(0, 8),
  }
}

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

function resolveSceneTypeForPublish({
  sceneId = '',
  typeId = '',
  categoryId = '',
  customTypeName = '',
  typeName = '',
} = {}) {
  const rawSceneId = String(sceneId || '').trim()
  const safeSceneId = normalizeSceneId(rawSceneId)
  if (rawSceneId && !safeSceneId) {
    return { error: 'INVALID_SCENE' }
  }
  if (safeSceneId === 'festival_theme') {
    return { error: 'SCENE_NOT_SELECTABLE' }
  }

  if (safeSceneId) {
    if (safeSceneId === CUSTOM_SCENE_ID) {
      const finalCustomTypeName = normalizeCustomTypeName(customTypeName || typeName)
      if (!finalCustomTypeName || finalCustomTypeName.length < 2) {
        return { error: 'INVALID_CUSTOM_TYPE' }
      }
      if (finalCustomTypeName.length > 20) {
        return { error: 'CUSTOM_TYPE_TOO_LONG' }
      }
      const duplicateTypeName = resolveDuplicateTypeName(finalCustomTypeName)
      if (duplicateTypeName) {
        return {
          error: 'DUPLICATE_CUSTOM_TYPE',
          duplicateTypeName,
        }
      }
      return {
        sceneId: safeSceneId,
        sceneName: SCENE_LABEL_MAP[safeSceneId] || '未分类类型',
        typeId: buildCustomTypeId(finalCustomTypeName),
        typeName: finalCustomTypeName,
        customTypeName: finalCustomTypeName,
        isCustomSceneType: true,
        categoryId: 'other',
      }
    }
    const typeDef = getTypeDef(safeSceneId, typeId)
    if (!typeDef || !String(typeId || '').trim()) return { error: 'INVALID_TYPE' }
    return {
      sceneId: safeSceneId,
      sceneName: SCENE_LABEL_MAP[safeSceneId] || '未分类类型',
      typeId: typeDef.id,
      typeName: typeDef.name || '未分类',
      categoryId: normalizeCategoryId(typeDef.categoryId || 'other'),
    }
  }

  const normalizedCategoryId = normalizeCategoryId(categoryId || 'other')
  const fallback = CATEGORY_TO_SCENE_TYPE[normalizedCategoryId] || CATEGORY_TO_SCENE_TYPE.other
  const fallbackSceneId = fallback.sceneId
  if (fallbackSceneId === CUSTOM_SCENE_ID) {
    return {
      sceneId: fallbackSceneId,
      sceneName: SCENE_LABEL_MAP[fallbackSceneId] || '未分类类型',
      typeId: '',
      typeName: '其它',
      categoryId: 'other',
    }
  }
  const fallbackTypeDef = getTypeDef(fallbackSceneId, fallback.typeId)
  return {
    sceneId: fallbackSceneId,
    sceneName: SCENE_LABEL_MAP[fallbackSceneId] || '未分类类型',
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

function normalizeSocialEnergy(value = '') {
  const safe = String(value || '').trim().toLowerCase()
  if (safe === 'i' || safe === 'e' || safe === 'balanced') return safe
  return ''
}

function getSocialEnergyLabel(value = '') {
  const safe = normalizeSocialEnergy(value)
  if (safe === 'i') return '偏I友好'
  if (safe === 'e') return '偏E友好'
  return '都可以'
}

function inferSocialEnergy({ sceneId = '', typeId = '', title = '', description = '' } = {}) {
  const typeBased = normalizeSocialEnergy(SOCIAL_ENERGY_BY_TYPE[String(typeId || '').trim()] || '')
  if (typeBased) return typeBased
  const sceneBased = normalizeSocialEnergy(SOCIAL_ENERGY_BY_SCENE[String(sceneId || '').trim()] || '')
  if (sceneBased) return sceneBased

  const haystack = [title, description]
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean)
    .join(' ')
  const extrovertKeywords = ['交友', '扩列', '派对', '酒局', '微醺', '蹦迪', '开麦', 'live', '社交']
  if (extrovertKeywords.some((kw) => haystack.includes(kw))) return 'e'
  const introvertKeywords = ['读书', '观影', '手作', '冥想', '瑜伽', '安静', '深聊', '写作', '疗愈']
  if (introvertKeywords.some((kw) => haystack.includes(kw))) return 'i'
  return 'balanced'
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

function normalizeCustomTypeName(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ')
}

function normalizeTypeCompareText(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·•・,，。!！?？:：;；、'"`~～\-—_（）()【】\[\]\/\\]/g, '')
}

function buildBuiltinTypeNameMap() {
  return Object.keys(TYPE_OPTIONS_BY_SCENE).reduce((acc, sceneId) => {
    if (sceneId === CUSTOM_SCENE_ID) return acc
    const list = TYPE_OPTIONS_BY_SCENE[sceneId] || []
    list.forEach((item) => {
      const name = String(item?.name || '').trim()
      const key = normalizeTypeCompareText(name)
      if (!name || !key || acc[key]) return
      acc[key] = name
    })
    return acc
  }, {})
}

const BUILTIN_TYPE_NAME_MAP = buildBuiltinTypeNameMap()

function resolveDuplicateTypeName(customTypeName = '') {
  const key = normalizeTypeCompareText(customTypeName)
  if (!key) return ''
  return BUILTIN_TYPE_NAME_MAP[key] || ''
}

function buildCustomTypeId(customTypeName = '') {
  const safe = normalizeCustomTypeName(customTypeName)
  if (!safe) return ''
  const hex = Buffer.from(safe, 'utf8').toString('hex').slice(0, 24)
  return `${CUSTOM_TYPE_ID_PREFIX}_${hex || Date.now().toString(36)}`
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

async function recordCustomSceneTypeStat({
  cityId = 'dali',
  sceneId = CUSTOM_SCENE_ID,
  customTypeName = '',
  activityId = '',
  publisherId = '',
} = {}) {
  const latestTypeName = normalizeCustomTypeName(customTypeName)
  const normalizedTypeName = normalizeTypeCompareText(latestTypeName)
  if (!latestTypeName || !normalizedTypeName) return
  try {
    const { data } = await db.collection(CUSTOM_SCENE_TYPE_STATS_COLLECTION)
      .where({ cityId, sceneId, normalizedTypeName })
      .limit(1)
      .get()
    const existed = Array.isArray(data) ? data[0] : null
    if (existed?._id) {
      await db.collection(CUSTOM_SCENE_TYPE_STATS_COLLECTION).doc(existed._id).update({
        data: {
          publishCount: _.inc(1),
          latestTypeName,
          lastActivityId: activityId || existed.lastActivityId || '',
          lastPublisherId: publisherId || existed.lastPublisherId || '',
          lastUsedAt: db.serverDate(),
          updatedAt: db.serverDate(),
        },
      })
      return
    }
    await db.collection(CUSTOM_SCENE_TYPE_STATS_COLLECTION).add({
      data: {
        cityId,
        sceneId,
        normalizedTypeName,
        latestTypeName,
        publishCount: 1,
        firstUsedAt: db.serverDate(),
        lastUsedAt: db.serverDate(),
        lastActivityId: activityId || '',
        lastPublisherId: publisherId || '',
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      },
    })
  } catch (e) {
    console.error('记录其它类型自定义场景统计失败', e)
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

function normalizeFestivalThemeTag(value = '') {
  const safe = String(value || '').trim().replace(/\s+/g, '')
  if (!safe) return ''
  return safe.slice(0, 8)
}

function normalizeFestivalThemeTagList(input = [], max = MAX_FESTIVAL_THEME_TAGS) {
  const source = Array.isArray(input)
    ? input
    : String(input || '').split(/[,\n，、;；]/g)
  const next = []
  source.forEach((item) => {
    const safe = normalizeFestivalThemeTag(item)
    if (!safe || next.includes(safe)) return
    next.push(safe)
  })
  return next.slice(0, Math.max(0, Number(max) || MAX_FESTIVAL_THEME_TAGS))
}

function normalizeFestivalLocationKeywords(input = []) {
  const source = Array.isArray(input)
    ? input
    : String(input || '').split(/[,\n，、;；]/g)
  const next = []
  source.forEach((item) => {
    const safe = String(item || '').trim().toLowerCase().slice(0, 20)
    if (!safe || next.includes(safe)) return
    next.push(safe)
  })
  return next.slice(0, 6)
}

async function loadFestivalThemeRules(cityId = '') {
  const safeCityId = String(cityId || DEFAULT_CITY_CONFIG.cityId).trim() || DEFAULT_CITY_CONFIG.cityId
  const preferred = String(process.env.FESTIVAL_THEME_COLLECTION || '').trim()
  const candidates = preferred
    ? [preferred, ...FESTIVAL_THEME_COLLECTION_CANDIDATES]
    : FESTIVAL_THEME_COLLECTION_CANDIDATES
  for (let i = 0; i < candidates.length; i += 1) {
    const collectionName = String(candidates[i] || '').trim()
    if (!collectionName) continue
    try {
      const { data } = await db.collection(collectionName)
        .where({
          cityId: safeCityId,
          isActive: _.neq(false),
        })
        .limit(120)
        .field({
          _id: true,
          themeShortName: true,
          shortName: true,
          title: true,
          startDayKey: true,
          endDayKey: true,
          locationKeywords: true,
        })
        .get()
      const list = Array.isArray(data) ? data : []
      return list
        .map((item) => ({
          id: String(item._id || '').trim(),
          shortName: normalizeFestivalThemeTag(item.themeShortName || item.shortName || item.title || ''),
          startDayKey: String(item.startDayKey || '').trim(),
          endDayKey: String(item.endDayKey || '').trim(),
          locationKeywords: normalizeFestivalLocationKeywords(item.locationKeywords || []),
        }))
        .filter((item) => item.shortName && item.startDayKey && item.endDayKey)
        .sort((a, b) => String(a.startDayKey).localeCompare(String(b.startDayKey)))
    } catch (e) {}
  }
  return []
}

function resolveFestivalThemeAutoMatch({
  rules = [],
  startDayKey = '',
  title = '',
  description = '',
  address = '',
} = {}) {
  const safeDayKey = String(startDayKey || '').trim()
  const haystack = `${String(title || '')} ${String(description || '')} ${String(address || '')}`.toLowerCase()
  const tags = []
  const ruleIds = []
  ;(Array.isArray(rules) ? rules : []).forEach((rule) => {
    if (!rule) return
    const dateMatched = safeDayKey
      && String(rule.startDayKey || '').trim()
      && String(rule.endDayKey || '').trim()
      && safeDayKey >= String(rule.startDayKey).trim()
      && safeDayKey <= String(rule.endDayKey).trim()
    const locationMatched = Array.isArray(rule.locationKeywords)
      && rule.locationKeywords.some((keyword) => keyword && haystack.includes(String(keyword).toLowerCase()))
    if (!dateMatched && !locationMatched) return
    if (rule.shortName && !tags.includes(rule.shortName)) tags.push(rule.shortName)
    if (rule.id && !ruleIds.includes(rule.id)) ruleIds.push(rule.id)
  })
  return {
    tags: normalizeFestivalThemeTagList(tags, MAX_FESTIVAL_THEME_TAGS),
    ruleIds: ruleIds.slice(0, MAX_FESTIVAL_THEME_TAGS),
  }
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
  const { isAdmin } = parseAdminMeta(OPENID)
  let publishGovernanceConfig = resolvePublishGovernanceConfigFromEnv()

  // 1. 校验身份核验状态
  const { data: users } = await db.collection('users')
    .where({ _openid: OPENID })
    .get()

  if (!users.length && !isAdmin) {
    return { success: false, error: 'NOT_VERIFIED', message: '请先完成身份核验' }
  }

  let user = users[0] || {
    _id: '',
    _openid: OPENID,
    nickname: '',
    avatarUrl: '',
    isVerified: isAdmin,
    verifyStatus: isAdmin ? 'approved' : 'none',
    identityCheckRequired: false,
    identityCheckStatus: 'none',
    identityCheckReasons: [],
    organizerConsents: normalizeOrganizerConsents({}),
  }
  if (user?._id) {
    const autoApproveResult = await maybeAutoApprovePendingVerify(user, OPENID)
    if (autoApproveResult.autoApproved) {
      user = {
        ...user,
        ...(autoApproveResult.userPatch || {}),
      }
    }
  }

  if (!isAdmin && !user.isVerified) {
    return { success: false, error: 'NOT_VERIFIED', message: '请先完成身份核验' }
  }

  const identityCheckRequired = !!user.identityCheckRequired
  const identityCheckStatus = String(user.identityCheckStatus || 'none')
  if (!isAdmin && identityCheckRequired && identityCheckStatus !== 'approved') {
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
    customTypeName = '',
    themeIds = [],
    visibleTags = [],
    lat,
    lng,
    address = '',
    startTime,
    endTime,
    maxParticipants,
    isGroupFormation = false,
    minParticipants = 0,
    formationWindow,
    cityId,
    marketLink = null,
    chargeType = 'free',
    feeAmount = 0,
    isCommercialActivity = false,
    payeeSubject = '',
    refundPolicy = '',
    cancellationPolicy = '',
    isNightActivity = false,
    isOutdoorActivity = false,
    hasAlcohol = false,
    hasCarpool = false,
    hasOvernight = false,
    hasMinors = false,
    socialEnergy = '',
    allowWaitlist = false,
    requireApproval = false,
    contactPhone = '',
    contactWechat = '',
    contactQrcodeFileId = '',
    publishConsent = {},
  } = event

  const cityConfig = await loadCityConfig(cityId || DEFAULT_CITY_CONFIG.cityId)
  const finalCityId = cityConfig.cityId
  publishGovernanceConfig = await loadPublishGovernanceConfig(finalCityId)
  const latNum = Number(lat)
  const lngNum = Number(lng)
  const sceneType = resolveSceneTypeForPublish({ sceneId, typeId, categoryId, customTypeName, typeName })
  if (sceneType?.error === 'INVALID_SCENE') {
    return { success: false, error: 'INVALID_SCENE', message: '活动类型不合法' }
  }
  if (sceneType?.error === 'INVALID_CUSTOM_TYPE') {
    return { success: false, error: 'INVALID_CUSTOM_TYPE', message: '自定义活动场景不合法' }
  }
  if (sceneType?.error === 'CUSTOM_TYPE_TOO_LONG') {
    return { success: false, error: 'CUSTOM_TYPE_TOO_LONG', message: '自定义活动场景最多20字' }
  }
  if (sceneType?.error === 'DUPLICATE_CUSTOM_TYPE') {
    return {
      success: false,
      error: 'DUPLICATE_CUSTOM_TYPE',
      message: `自定义活动场景与现有场景“${sceneType.duplicateTypeName || ''}”重复`,
    }
  }
  if (sceneType?.error === 'INVALID_TYPE') {
    return { success: false, error: 'INVALID_TYPE', message: '活动场景不合法' }
  }
  if (sceneType?.error === 'SCENE_NOT_SELECTABLE') {
    return { success: false, error: 'SCENE_NOT_SELECTABLE', message: '节庆活动类型由系统自动匹配，无需手动选择' }
  }
  const finalSceneId = String(sceneType?.sceneId || '').trim()
  const finalSceneName = String(sceneType?.sceneName || sceneName || '').trim()
  const finalTypeId = String(sceneType?.typeId || '').trim()
  const finalTypeName = String(sceneType?.typeName || typeName || '').trim()
  const finalCustomTypeName = normalizeCustomTypeName(sceneType?.customTypeName || '')
  const isCustomSceneType = !!sceneType?.isCustomSceneType
  const finalCategoryId = normalizeCategoryId(sceneType?.categoryId || categoryId || 'other')
  const finalVisibleTags = normalizeVisibleTags(visibleTags, 12)
  const finalSocialEnergy = normalizeSocialEnergy(socialEnergy) || inferSocialEnergy({
    sceneId: finalSceneId,
    typeId: finalTypeId,
    title,
    description,
  })
  const finalSocialEnergyLabel = getSocialEnergyLabel(finalSocialEnergy)
  const normalizedCustomCategoryLabel = normalizeCustomCategoryLabel(customCategoryLabel)
  const rawThemeIds = Array.isArray(themeIds) ? themeIds : []
  const hasInvalidTheme = rawThemeIds.some((item) => {
    const id = String(item || '').trim()
    return !!id && !THEME_ID_SET.has(id)
  })
  if (hasInvalidTheme) {
    return { success: false, error: 'INVALID_THEME', message: '活动主题不合法' }
  }
  const finalThemeIds = normalizeThemeIds(
    rawThemeIds,
    isAdmin ? OFFICIAL_MAX_THEME_COUNT : USER_MAX_THEME_COUNT
  )

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
  const finalCategoryCustomLabel = isCustomSceneType
    ? finalCustomTypeName
    : normalizedCustomCategoryLabel
  if (finalCategoryId === 'other' && !finalCategoryCustomLabel) {
    return { success: false, error: 'INVALID_CUSTOM_CATEGORY', message: '选择“其它”时请填写具体分类' }
  }
  if (finalCategoryId === 'other' && !isCustomSceneType) {
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
  const finalIsCommercialActivity = normalizeBooleanInput(isCommercialActivity)
  if (finalIsCommercialActivity === null) {
    return { success: false, error: 'INVALID_COMMERCIAL_FLAG', message: '请明确是否商业组织活动' }
  }
  const finalPayeeSubject = normalizePolicyText(payeeSubject, 30)
  const finalRefundPolicy = normalizePolicyText(refundPolicy, 200)
  const finalCancellationPolicy = normalizePolicyText(cancellationPolicy, 200)
  if (finalChargeType !== 'free' && finalPayeeSubject.length < 2) {
    return { success: false, error: 'MISSING_PAYEE_SUBJECT', message: '请填写收款主体' }
  }
  if (finalChargeType !== 'free' && finalRefundPolicy.length < 4) {
    return { success: false, error: 'MISSING_REFUND_POLICY', message: '请填写退款规则' }
  }
  if (finalCancellationPolicy.length < 4) {
    return { success: false, error: 'MISSING_CANCELLATION_POLICY', message: '请填写活动取消规则' }
  }
  const finalIsNightActivity = normalizeBooleanInput(isNightActivity)
  const finalIsOutdoorActivity = normalizeBooleanInput(isOutdoorActivity)
  const finalHasAlcohol = normalizeBooleanInput(hasAlcohol)
  const finalHasCarpool = normalizeBooleanInput(hasCarpool)
  const finalHasOvernight = normalizeBooleanInput(hasOvernight)
  const finalHasMinors = normalizeBooleanInput(hasMinors)
  const requiredRiskFlags = [
    finalIsNightActivity,
    finalIsOutdoorActivity,
    finalHasAlcohol,
    finalHasCarpool,
    finalHasOvernight,
    finalHasMinors,
  ]
  if (requiredRiskFlags.some((item) => item === null)) {
    return { success: false, error: 'MISSING_RISK_FLAGS', message: '请完整填写风险要素申报' }
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

  const requestedMaxParticipants = Number(maxParticipants)
  const hasExplicitMaxParticipants = (
    maxParticipants !== null
    && maxParticipants !== undefined
    && String(maxParticipants).trim() !== ''
    && Number.isFinite(requestedMaxParticipants)
    && requestedMaxParticipants > 0
  )
  const userMaxParticipantsLimit = resolveUserMaxParticipantsLimit()
  let finalMaxParticipants = hasExplicitMaxParticipants
    ? Math.round(requestedMaxParticipants)
    : 999
  if (!isAdmin && hasExplicitMaxParticipants) {
    finalMaxParticipants = Math.min(finalMaxParticipants, userMaxParticipantsLimit)
  }

  const now = Date.now()
  const startMs = new Date(startTime).getTime()
  const endMs   = new Date(endTime).getTime()
  const normalizedMarketLink = normalizeMarketLink(marketLink, startMs)
  const startDayKey = toChinaDayKeyByMs(startMs)

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
  if (isGroupFormation && Number(minParticipants || 0) > Number(finalMaxParticipants || 0)) {
    return { success: false, error: 'MIN_PARTICIPANTS_EXCEED_MAX', message: '最低成团人数不能大于活动最大人数' }
  }

  const finalCategoryLabel = finalCategoryId === 'other'
    ? '其他'
    : (CATEGORY_MAP[finalCategoryId] || categoryLabel || '其他')

  // 3. 成团截止时间（发布后N分钟）
  const formationDeadline = isGroupFormation
    ? new Date(now + finalFormationWindow * 60 * 1000)
    : null
  const opsTagProfile = buildOpsTagProfile({
    title: title.trim(),
    description: description.trim(),
    sceneId: finalSceneId,
    sceneName: finalSceneName,
    typeId: finalTypeId,
    typeName: finalTypeName,
    categoryId: finalCategoryId,
    chargeType: finalChargeType,
    feeAmount: finalFeeAmount,
    maxParticipants: finalMaxParticipants,
    requireApproval: finalRequireApproval,
    allowWaitlist: finalAllowWaitlist,
    isGroupFormation: !!isGroupFormation,
    startTime,
    address,
    cityId: finalCityId,
    lat: latNum,
    lng: lngNum,
    isNightActivity: finalIsNightActivity,
    isOutdoorActivity: finalIsOutdoorActivity,
    hasAlcohol: finalHasAlcohol,
    hasCarpool: finalHasCarpool,
    hasOvernight: finalHasOvernight,
    hasMinors: finalHasMinors,
  })

  // 4. 写入数据库
  const trustProfile = buildTrustProfileForPublish(user)
  const baseEffectiveScore = getBaseEffectiveScore(trustProfile.trustLevel)
  const festivalThemeRules = await loadFestivalThemeRules(finalCityId)
  const festivalThemeAutoMatch = resolveFestivalThemeAutoMatch({
    rules: festivalThemeRules,
    startDayKey,
    title,
    description,
    address,
  })
  const festivalThemeTagsAuto = normalizeFestivalThemeTagList(festivalThemeAutoMatch.tags)
  const festivalThemeTags = festivalThemeTagsAuto
  const festivalThemeSource = festivalThemeTags.length ? 'auto' : 'none'
  const publishRiskGate = resolvePublishRiskGate({
    typeId: finalTypeId,
    title,
    description,
    opsTagProfile,
  })
  const publishGovernanceRiskLevel = resolveGovernanceRiskLevel({
    publishRiskGate,
    chargeType: finalChargeType,
    riskDeclaration: {
      isNightActivity: finalIsNightActivity,
      isOutdoorActivity: finalIsOutdoorActivity,
      hasAlcohol: finalHasAlcohol,
      hasCarpool: finalHasCarpool,
      hasOvernight: finalHasOvernight,
      hasMinors: finalHasMinors,
    },
  })
  const organizerTierMeta = resolveOrganizerTier(user, isAdmin)
  const organizerTierPermission = resolveTierPublishPermission({
    organizerTier: organizerTierMeta.tier,
    publishRiskLevel: publishGovernanceRiskLevel,
    chargeType: finalChargeType,
    isAdmin,
    governanceConfig: publishGovernanceConfig,
  })
  if (!organizerTierPermission.allowed) {
    return {
      success: false,
      error: 'ORGANIZER_TIER_BLOCKED',
      message: organizerTierPermission.message || '当前账号等级暂不支持发布该活动',
      organizerTier: organizerTierMeta.tier,
      organizerTierLabel: ORGANIZER_TIER_LABEL_MAP[organizerTierMeta.tier] || ORGANIZER_TIER_LABEL_MAP.normal,
      publishRiskLevel: publishGovernanceRiskLevel,
      chargeType: finalChargeType,
      tierReasonCode: organizerTierPermission.reasonCode,
    }
  }

  const restrictionDecision = resolvePublishRestriction({
    user,
    publishRiskLevel: publishGovernanceRiskLevel,
    chargeType: finalChargeType,
    governanceConfig: publishGovernanceConfig,
    nowMs: now,
  })
  if (!restrictionDecision.allowed) {
    return {
      success: false,
      error: 'PUBLISH_RESTRICTED',
      message: restrictionDecision.message || '当前账号发布受限，请联系管理员',
      organizerTier: organizerTierMeta.tier,
      publishRiskLevel: publishGovernanceRiskLevel,
      chargeType: finalChargeType,
      restrictionCode: restrictionDecision.code,
      restriction: restrictionDecision.snapshot,
    }
  }

  const consentValidation = validatePublishConsents({
    existingConsents: user.organizerConsents,
    consentPayload: publishConsent,
    governanceConfig: publishGovernanceConfig,
    isAdmin,
  })
  if (!consentValidation.ok) {
    return {
      success: false,
      error: consentValidation.error || 'CONSENT_REQUIRED',
      message: consentValidation.message || '请先同意发布协议',
      requiredVersions: {
        publishRulesVersion: consentValidation.requiredPublishRulesVersion,
        organizerAgreementVersion: consentValidation.requiredOrganizerAgreementVersion,
      },
      missingConsents: consentValidation.missingKeys || [],
      mismatchConsents: consentValidation.mismatchKeys || [],
    }
  }
  if (!isAdmin && consentValidation.shouldPersist && user?._id) {
    await db.collection('users').doc(user._id).update({
      data: {
        organizerConsents: {
          publishRules: {
            version: consentValidation.mergedConsents.publishRules.version,
            acceptedAt: new Date(consentValidation.mergedConsents.publishRules.acceptedAt),
            source: consentValidation.mergedConsents.publishRules.source,
          },
          organizerAgreement: {
            version: consentValidation.mergedConsents.organizerAgreement.version,
            acceptedAt: new Date(consentValidation.mergedConsents.organizerAgreement.acceptedAt),
            source: consentValidation.mergedConsents.organizerAgreement.source,
          },
          updatedAt: db.serverDate(),
        },
        updatedAt: db.serverDate(),
      },
    }).catch(() => {})
    user.organizerConsents = consentValidation.mergedConsents
  }

  const governanceForceManualReview = !isAdmin
    && !!publishGovernanceConfig.highRiskForceManualReview
    && compareRiskLevel(publishGovernanceRiskLevel, 'L3') >= 0
  const publishReviewRequired = !isAdmin && !!publishGovernanceConfig.userPublishNeedReview
  const publishReviewStatus = publishReviewRequired ? 'pending' : 'approved'
  const publishStatus = publishReviewStatus === 'approved'
    ? 'OPEN'
    : PUBLISH_REVIEW_PENDING_STATUS
  const isOfficial = !!isAdmin
  const publishReviewSource = isAdmin
    ? 'admin_publish'
    : (publishReviewRequired ? 'user_submit' : 'system_rule_auto_approved')
  const publisherNickname = String(user.nickname || '').trim() || (isAdmin ? '官方活动' : '搭里用户')
  const participantCapApplied = !isAdmin
    && hasExplicitMaxParticipants
    && requestedMaxParticipants > userMaxParticipantsLimit
  const joinRiskDisclosure = resolveJoinRiskDisclosure({
    publishRiskLevel: publishRiskGate.level,
    chargeType: finalChargeType,
    sourceFlags: {
      isNight: finalIsNightActivity || !!opsTagProfile?.sourceFields?.isNight,
      isOutdoor: finalIsOutdoorActivity || !!opsTagProfile?.riskTriggerFlags?.isOutdoor,
      hasAlcohol: finalHasAlcohol || !!opsTagProfile?.riskTriggerFlags?.isAlcohol,
      hasCarpool: finalHasCarpool,
      hasOvernight: finalHasOvernight,
      hasMinors: finalHasMinors || !!opsTagProfile?.riskTriggerFlags?.isChildren,
    },
  })

  const result = await db.collection('activities').add({
    data: {
      _openid: OPENID,
      title: title.trim(),
      description: description.trim(),
      sceneId: finalSceneId,
      sceneName: finalSceneName,
      typeId: finalTypeId,
      typeName: finalTypeName,
      socialEnergy: finalSocialEnergy,
      socialEnergyLabel: finalSocialEnergyLabel,
      themeIds: finalThemeIds,
      userVisibleTags: finalVisibleTags,
      categoryId: finalCategoryId,
      categoryLabel: finalCategoryLabel,
      categoryCustomLabel: finalCategoryId === 'other' ? finalCategoryCustomLabel : '',
      isCustomSceneType,
      customTypeName: isCustomSceneType ? finalCustomTypeName : '',
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
      maxParticipants: finalMaxParticipants,
      minParticipants,
      currentParticipants: 0,
      chargeType: finalChargeType,
      feeAmount: finalFeeAmount,
      pricing: {
        chargeType: finalChargeType,
        feeAmount: finalFeeAmount,
        currency: 'CNY',
      },
      feeDisclosure: {
        isCommercialActivity: finalIsCommercialActivity,
        payeeSubject: finalPayeeSubject,
        refundPolicy: finalRefundPolicy,
        cancellationPolicy: finalCancellationPolicy,
        platformPaymentRole: 'not_involved',
      },
      riskDeclaration: {
        isNightActivity: finalIsNightActivity,
        isOutdoorActivity: finalIsOutdoorActivity,
        hasAlcohol: finalHasAlcohol,
        hasCarpool: finalHasCarpool,
        hasOvernight: finalHasOvernight,
        hasMinors: finalHasMinors,
      },
      riskDisclosure: joinRiskDisclosure,
      allowWaitlist: finalAllowWaitlist,
      requireApproval: finalRequireApproval,
      joinPolicy: {
        allowWaitlist: finalAllowWaitlist,
        requireApproval: finalRequireApproval,
      },
      status: publishStatus,
      publishReviewRequired,
      publishReviewStatus,
      publishReviewSubmittedAt: db.serverDate(),
      publishReviewSource,
      publishReviewedAt: (isAdmin || !publishReviewRequired) ? db.serverDate() : null,
      publishReviewedBy: isAdmin ? OPENID : (!publishReviewRequired ? 'system' : ''),
      publishReviewReason: isAdmin
        ? '管理员发布，自动通过'
        : (publishReviewRequired ? '待管理员审核' : '治理开关：用户发布免审'),
      publishRiskLevel: publishRiskGate.level,
      publishGovernanceRiskLevel,
      publishRiskReasonCodes: publishRiskGate.reasonCodes,
      publishForceManualReview: !isAdmin && (publishRiskGate.forceManualReview || governanceForceManualReview),
      publishRulesVersion: publishGovernanceConfig.publishRulesVersion,
      organizerAgreementVersion: publishGovernanceConfig.organizerAgreementVersion,
      publishConsentSnapshot: {
        publishRulesVersion: publishGovernanceConfig.publishRulesVersion,
        organizerAgreementVersion: publishGovernanceConfig.organizerAgreementVersion,
        acceptedAt: consentValidation?.mergedConsents?.updatedAt
          ? new Date(consentValidation.mergedConsents.updatedAt)
          : db.serverDate(),
      },
      organizerTier: organizerTierMeta.tier,
      organizerTierLabel: ORGANIZER_TIER_LABEL_MAP[organizerTierMeta.tier] || ORGANIZER_TIER_LABEL_MAP.normal,
      organizerTierSource: organizerTierMeta.source,
      publishRestrictionSnapshot: restrictionDecision.snapshot || null,
      festivalThemeTagsAuto,
      festivalThemeTagsManual: [],
      festivalThemeTags,
      festivalThemeSource,
      festivalThemeMatchedRuleIds: festivalThemeAutoMatch.ruleIds,
      festivalThemeMatchedAt: db.serverDate(),
      isOfficial,
      officialOwnerType: isOfficial ? 'platform_admin' : 'user',
      officialThemeIds: isOfficial ? finalThemeIds : [],
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
      publisherNickname,
      publisherAvatar: user.avatarUrl,
      isVerified: isAdmin ? true : !!user.isVerified,
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
  if (!isAdmin) {
    markHighFrequencyOrganizerIfNeeded(OPENID)
  }
  if (finalCategoryId === 'other' && normalizedCustomCategoryLabel) {
    recordCustomCategoryStat({
      cityId: finalCityId,
      customCategoryLabel: normalizedCustomCategoryLabel,
      activityId: result._id,
      publisherId: OPENID,
    })
  }
  if (isCustomSceneType && finalCustomTypeName) {
    recordCustomSceneTypeStat({
      cityId: finalCityId,
      sceneId: finalSceneId,
      customTypeName: finalCustomTypeName,
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
    isCustomSceneType,
    customTypeName: isCustomSceneType ? finalCustomTypeName : '',
    socialEnergy: finalSocialEnergy,
    socialEnergyLabel: finalSocialEnergyLabel,
    chargeType: finalChargeType,
    feeAmount: finalFeeAmount,
    feeDisclosure: {
      isCommercialActivity: finalIsCommercialActivity,
      payeeSubject: finalPayeeSubject,
      refundPolicy: finalRefundPolicy,
      cancellationPolicy: finalCancellationPolicy,
    },
    riskDeclaration: {
      isNightActivity: finalIsNightActivity,
      isOutdoorActivity: finalIsOutdoorActivity,
      hasAlcohol: finalHasAlcohol,
      hasCarpool: finalHasCarpool,
      hasOvernight: finalHasOvernight,
      hasMinors: finalHasMinors,
    },
    riskDisclosure: joinRiskDisclosure,
    maxParticipants: finalMaxParticipants,
    participantCapApplied,
    opsTagVersion: OPS_TAG_VERSION,
    opsTagCore: Array.isArray(opsTagProfile?.coreTags) ? opsTagProfile.coreTags : [],
    publishReviewStatus,
    publishReviewRequired,
    publishStatus,
    isOfficial,
    publishRiskLevel: publishRiskGate.level,
    publishGovernanceRiskLevel,
    publishRiskReasonCodes: publishRiskGate.reasonCodes,
    organizerTier: organizerTierMeta.tier,
    organizerTierLabel: ORGANIZER_TIER_LABEL_MAP[organizerTierMeta.tier] || ORGANIZER_TIER_LABEL_MAP.normal,
    publishRulesVersion: publishGovernanceConfig.publishRulesVersion,
    organizerAgreementVersion: publishGovernanceConfig.organizerAgreementVersion,
    festivalThemeTags,
    festivalThemeSource,
    cityConfigVersion: cityConfig.version,
    serverTimestamp: Date.now(),
  }
}
