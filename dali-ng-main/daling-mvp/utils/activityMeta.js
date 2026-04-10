export const LEGACY_CATEGORY_ID_MAP = {
  reading: 'culture',
  movie: 'culture',
  travel: 'outdoor',
}

export const ACTIVITY_SCENE_DEFINITIONS = [
  { id: 'local_explore', label: '在地探索', desc: '围绕大理空间、点位、路线、城市体验展开', iconHint: '地图/定位' },
  { id: 'casual_gathering', label: '轻松聚会', desc: '低门槛、轻社交、容易参加', iconHint: '聊天/碰杯' },
  { id: 'social_networking', label: '交友社交', desc: '以认识人、链接人、破冰为主', iconHint: '人群/握手' },
  { id: 'learning_sharing', label: '学习分享', desc: '听讲、交流、输入内容为主', iconHint: '书本/麦克风' },
  { id: 'workshop_experience', label: '体验工作坊', desc: '更重参与、动手、体验感', iconHint: '手作/画笔' },
  { id: 'music_performance', label: '音乐演出', desc: '演出、放映、现场娱乐氛围', iconHint: '音符/舞台' },
  { id: 'market_popups', label: '市集摆摊', desc: '摆摊、市集、试吃试用、快闪', iconHint: '摊位/购物袋' },
  { id: 'outdoor_nature', label: '户外活动', desc: '徒步、骑行、露营、自然活动', iconHint: '山/帐篷' },
  { id: 'family_pet', label: '亲子宠物', desc: '家庭、儿童、宠物友好活动', iconHint: '小孩/宠物' },
  { id: 'public_welfare', label: '公益社区', desc: '志愿、环保、社区共建、交换', iconHint: '爱心/树叶' },
  { id: 'nomad_city', label: '旅居同城', desc: '新来大理、旅居融入、数字游民等', iconHint: '小屋/行李箱' },
  { id: 'festival_theme', label: '节庆主题', desc: '三月街、火把节、节日和时令主题', iconHint: '火把/灯笼' },
]

export const ACTIVITY_TYPE_OPTIONS_BY_SCENE = {
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

export const ACTIVITY_THEME_OPTIONS = [
  { id: 'dali_local_life', label: '大理在地生活' },
  { id: 'erhai_sunset', label: '洱海日落' },
  { id: 'newcomer_dali', label: '初到大理' },
  { id: 'digital_nomad', label: '数字游民' },
  { id: 'march_street', label: '三月街' },
  { id: 'torch_festival', label: '火把节' },
  { id: 'bai_culture', label: '白族文化' },
  { id: 'intangible_heritage', label: '非遗体验' },
  { id: 'coffee_lifestyle', label: '咖啡生活' },
  { id: 'healing_retreat', label: '疗愈放松' },
  { id: 'summer_holiday', label: '暑期活动' },
  { id: 'national_day', label: '国庆主题' },
  { id: 'new_year', label: '跨年主题' },
  { id: 'valentine', label: '七夕/情人节' },
]

const CATEGORY_DEFINITIONS = [
  { id: 'sport', label: '运动', scene: '跑步、球类、健身' },
  { id: 'cycling', label: '骑行', scene: '单车、环湖' },
  { id: 'outdoor', label: '户外', scene: '徒步、登山、露营' },
  { id: 'music', label: '音乐', scene: '演奏、演唱、音乐会' },
  { id: 'game', label: '游戏', scene: '桌游、剧本杀、电竞' },
  { id: 'culture', label: '文化', scene: '读书、展览、手工' },
  { id: 'food', label: '美食', scene: '探店、烧烤、聚餐' },
  { id: 'photo', label: '摄影', scene: '街拍、风景、人像' },
  { id: 'wellness', label: '身心', scene: '瑜伽、冥想、太极' },
  { id: 'social', label: '交流', scene: '语言交换、分享会、聊天' },
  { id: 'other', label: '其他', scene: '以上都不匹配' },
]

export const ACTIVITY_CATEGORY_LABEL_MAP = CATEGORY_DEFINITIONS.reduce((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {
  reading: '文化',
  movie: '文化',
  travel: '户外',
})

export const DISCOVERY_CATEGORY_FILTER_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'hot', label: '热门' },
  { id: 'official', label: '官方推荐' },
  { id: 'sport', label: ACTIVITY_CATEGORY_LABEL_MAP.sport },
  { id: 'cycling', label: ACTIVITY_CATEGORY_LABEL_MAP.cycling },
  { id: 'outdoor', label: ACTIVITY_CATEGORY_LABEL_MAP.outdoor },
  { id: 'music', label: ACTIVITY_CATEGORY_LABEL_MAP.music },
  { id: 'game', label: ACTIVITY_CATEGORY_LABEL_MAP.game },
  { id: 'culture', label: ACTIVITY_CATEGORY_LABEL_MAP.culture },
  { id: 'food', label: ACTIVITY_CATEGORY_LABEL_MAP.food },
  { id: 'photo', label: ACTIVITY_CATEGORY_LABEL_MAP.photo },
  { id: 'wellness', label: ACTIVITY_CATEGORY_LABEL_MAP.wellness },
  { id: 'social', label: ACTIVITY_CATEGORY_LABEL_MAP.social },
  { id: 'other', label: ACTIVITY_CATEGORY_LABEL_MAP.other },
]

export const ACTIVITY_CATEGORY_OPTIONS = DISCOVERY_CATEGORY_FILTER_OPTIONS

export const PUBLISH_CATEGORY_OPTIONS = CATEGORY_DEFINITIONS.map((item) => ({
  id: item.id,
  label: item.label,
  scene: item.scene,
}))

export const PUBLISH_SCENE_OPTIONS = ACTIVITY_SCENE_DEFINITIONS.map((item) => ({
  id: item.id,
  label: item.label,
  desc: item.desc,
}))

const SCENE_ID_SET = new Set(ACTIVITY_SCENE_DEFINITIONS.map((item) => item.id))
const SCENE_LABEL_MAP = ACTIVITY_SCENE_DEFINITIONS.reduce((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {})

const TYPE_INDEX_BY_SCENE = Object.keys(ACTIVITY_TYPE_OPTIONS_BY_SCENE).reduce((acc, sceneId) => {
  const list = ACTIVITY_TYPE_OPTIONS_BY_SCENE[sceneId] || []
  const map = {}
  list.forEach((item) => {
    map[item.id] = item
  })
  acc[sceneId] = map
  return acc
}, {})

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

const SCENE_DEFAULT_CATEGORY_MAP = {
  local_explore: 'culture',
  casual_gathering: 'social',
  social_networking: 'social',
  learning_sharing: 'culture',
  workshop_experience: 'culture',
  music_performance: 'music',
  market_popups: 'culture',
  outdoor_nature: 'outdoor',
  family_pet: 'social',
  public_welfare: 'social',
  nomad_city: 'social',
  festival_theme: 'culture',
}

export const DISCOVERY_SCENE_FILTER_OPTIONS = [
  { id: 'all', label: '全部' },
  { id: 'hot', label: '热门' },
  { id: 'official', label: '官方推荐' },
  ...ACTIVITY_SCENE_DEFINITIONS.map((item) => ({ id: item.id, label: item.label })),
  { id: 'other', label: '其它' },
]

export const DISTANCE_FILTER_OPTIONS = [
  { id: 'sort_near', label: '从近到远', type: 'sort', sortBy: 'distance_asc', radius: 2000000 },
  { id: 'sort_far', label: '从远到近', type: 'sort', sortBy: 'distance_desc', radius: 2000000 },
  { id: 'r_1', label: '1km', type: 'radius', radius: 1000 },
  { id: 'r_3', label: '3km', type: 'radius', radius: 3000 },
  { id: 'r_5', label: '5km', type: 'radius', radius: 5000 },
  { id: 'r_10', label: '10km', type: 'radius', radius: 10000 },
  { id: 'r_20', label: '20km', type: 'radius', radius: 20000 },
  { id: 'r_50', label: '50km', type: 'radius', radius: 50000 },
  { id: 'r_100', label: '100km', type: 'radius', radius: 100000 },
  { id: 'r_1000', label: '1000km', type: 'radius', radius: 1000000 },
]

export const USER_SOCIAL_PREFERENCE_OPTIONS = [
  { id: 'unknown', label: '未设置' },
  { id: 'introvert', label: '偏I（安静小圈）' },
  { id: 'extrovert', label: '偏E（热闹扩列）' },
  { id: 'balanced', label: '都可以' },
]

export const USER_RESIDENCY_TYPE_OPTIONS = [
  { id: 'unknown', label: '未设置' },
  { id: 'visitor', label: '游客' },
  { id: 'nomad', label: '旅居者' },
  { id: 'local', label: '本地人' },
]

export const USER_IDENTITY_TAG_OPTIONS = [
  { id: 'homestay_owner', label: '民宿老板' },
  { id: 'host', label: '主理人' },
  { id: 'merchant', label: '商家' },
  { id: 'student', label: '学生' },
  { id: 'freelancer', label: '自由职业者' },
  { id: 'office_worker', label: '上班族' },
  { id: 'creator', label: '内容创作者' },
  { id: 'parent', label: '亲子家长' },
  { id: 'pet_owner', label: '养宠人' },
  { id: 'other', label: '其他' },
]

const USER_SOCIAL_PREFERENCE_LABEL_MAP = USER_SOCIAL_PREFERENCE_OPTIONS.reduce((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {})

const USER_RESIDENCY_TYPE_LABEL_MAP = USER_RESIDENCY_TYPE_OPTIONS.reduce((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {})

const USER_IDENTITY_TAG_LABEL_MAP = USER_IDENTITY_TAG_OPTIONS.reduce((acc, item) => {
  acc[item.id] = item.label
  return acc
}, {})

const USER_IDENTITY_TAG_ID_SET = new Set(USER_IDENTITY_TAG_OPTIONS.map((item) => item.id))

export const SOCIAL_ENERGY_OPTIONS = [
  { id: 'all', label: '社交偏好' },
  { id: 'i', label: '偏I友好' },
  { id: 'e', label: '偏E友好' },
  { id: 'balanced', label: '都可以' },
]

const SOCIAL_ENERGY_LABEL_MAP = {
  i: '偏I友好',
  e: '偏E友好',
  balanced: '都可以',
}

const SOCIAL_ENERGY_BY_SCENE = {
  social_networking: 'e',
  music_performance: 'e',
  market_popups: 'e',
  learning_sharing: 'i',
  workshop_experience: 'i',
}

const SOCIAL_ENERGY_TYPE_OVERRIDE = {
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

export function normalizeSocialPreference(value = '') {
  const safe = String(value || '').trim()
  if (safe === 'introvert' || safe === 'extrovert' || safe === 'balanced') return safe
  return 'unknown'
}

export function getSocialPreferenceLabel(value = '') {
  return USER_SOCIAL_PREFERENCE_LABEL_MAP[normalizeSocialPreference(value)] || USER_SOCIAL_PREFERENCE_LABEL_MAP.unknown
}

export function normalizeResidencyType(value = '') {
  const safe = String(value || '').trim()
  if (safe === 'visitor' || safe === 'nomad' || safe === 'local') return safe
  return 'unknown'
}

export function getResidencyTypeLabel(value = '') {
  return USER_RESIDENCY_TYPE_LABEL_MAP[normalizeResidencyType(value)] || USER_RESIDENCY_TYPE_LABEL_MAP.unknown
}

export function normalizeIdentityTags(values = [], max = 3) {
  const unique = []
  ;(Array.isArray(values) ? values : []).forEach((item) => {
    const safe = String(item || '').trim()
    if (!safe || !USER_IDENTITY_TAG_ID_SET.has(safe) || unique.includes(safe)) return
    unique.push(safe)
  })
  return unique.slice(0, Math.max(0, Number(max) || 3))
}

export function getIdentityTagLabel(value = '') {
  const safe = String(value || '').trim()
  return USER_IDENTITY_TAG_LABEL_MAP[safe] || ''
}

export function getIdentityTagLabels(values = [], max = 3) {
  return normalizeIdentityTags(values, max)
    .map((item) => USER_IDENTITY_TAG_LABEL_MAP[item] || '')
    .filter(Boolean)
}

export function normalizeSocialEnergy(value = '') {
  const safe = String(value || '').trim().toLowerCase()
  if (safe === 'i' || safe === 'e' || safe === 'balanced') return safe
  return ''
}

export function getSocialEnergyLabel(value = '') {
  const safe = normalizeSocialEnergy(value)
  if (!safe) return '都可以'
  return SOCIAL_ENERGY_LABEL_MAP[safe] || '都可以'
}

export function inferActivitySocialEnergy(input = {}) {
  const typeId = String(input?.typeId || '').trim()
  const fromType = normalizeSocialEnergy(SOCIAL_ENERGY_TYPE_OVERRIDE[typeId] || '')
  if (fromType) return fromType

  const sceneId = String(input?.sceneId || '').trim()
  const fromScene = normalizeSocialEnergy(SOCIAL_ENERGY_BY_SCENE[sceneId] || '')
  if (fromScene) return fromScene

  const text = [input?.title, input?.description, input?.typeName, input?.sceneName]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const extrovertHints = ['交友', '扩列', '派对', '酒局', '微醺', '蹦迪', '开麦', 'live', '社交']
  if (extrovertHints.some((kw) => text.includes(kw))) return 'e'

  const introvertHints = ['读书', '观影', '手作', '冥想', '瑜伽', '安静', '深聊', '写作', '疗愈']
  if (introvertHints.some((kw) => text.includes(kw))) return 'i'

  return 'balanced'
}

export function normalizeCategoryId(categoryId) {
  const safe = String(categoryId || '').trim().toLowerCase()
  return LEGACY_CATEGORY_ID_MAP[safe] || safe || 'other'
}

export function getCategoryLabel(categoryId) {
  const normalized = normalizeCategoryId(categoryId)
  return ACTIVITY_CATEGORY_LABEL_MAP[normalized] || '其他'
}

export function normalizeSceneId(sceneId) {
  const safe = String(sceneId || '').trim()
  return SCENE_ID_SET.has(safe) ? safe : ''
}

export function getSceneLabel(sceneId = '') {
  const safe = normalizeSceneId(sceneId)
  return SCENE_LABEL_MAP[safe] || '未分类场景'
}

export function getTypesByScene(sceneId = '') {
  const safe = normalizeSceneId(sceneId)
  return safe ? [...(ACTIVITY_TYPE_OPTIONS_BY_SCENE[safe] || [])] : []
}

export function resolveTypeForScene(sceneId = '', typeId = '') {
  const safeScene = normalizeSceneId(sceneId)
  if (!safeScene) return null
  const safeType = String(typeId || '').trim()
  if (safeType && TYPE_INDEX_BY_SCENE[safeScene]?.[safeType]) {
    return TYPE_INDEX_BY_SCENE[safeScene][safeType]
  }
  const first = (ACTIVITY_TYPE_OPTIONS_BY_SCENE[safeScene] || [])[0]
  return first || null
}

export function resolveCategoryBySceneType(sceneId = '', typeId = '') {
  const type = resolveTypeForScene(sceneId, typeId)
  if (type?.categoryId) return type.categoryId
  const safeScene = normalizeSceneId(sceneId)
  if (safeScene && SCENE_DEFAULT_CATEGORY_MAP[safeScene]) return SCENE_DEFAULT_CATEGORY_MAP[safeScene]
  return 'other'
}

export function resolveSceneTypeFromLegacyFields(input = {}) {
  const sceneIdFromInput = normalizeSceneId(input?.sceneId)
  const sceneId = sceneIdFromInput || CATEGORY_TO_SCENE_TYPE[normalizeCategoryId(input?.categoryId)]?.sceneId || 'casual_gathering'
  const resolvedType = resolveTypeForScene(sceneId, input?.typeId) || resolveTypeForScene(sceneId, '')
  const finalSceneId = sceneId
  const finalTypeId = String(resolvedType?.id || '')
  return {
    sceneId: finalSceneId,
    sceneName: getSceneLabel(finalSceneId),
    typeId: finalTypeId,
    typeName: String(resolvedType?.name || '未分类'),
  }
}

export function normalizeThemeIds(themeIds = [], max = 3) {
  const allow = new Set(ACTIVITY_THEME_OPTIONS.map((item) => item.id))
  const unique = []
  ;(Array.isArray(themeIds) ? themeIds : []).forEach((item) => {
    const id = String(item || '').trim()
    if (!id || !allow.has(id) || unique.includes(id)) return
    unique.push(id)
  })
  return unique.slice(0, Math.max(0, Number(max) || 3))
}
