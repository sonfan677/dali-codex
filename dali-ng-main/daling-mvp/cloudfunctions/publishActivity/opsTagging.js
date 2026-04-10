const OPS_TAG_VERSION = 'structured_keyword_v1'

const OUTDOOR_SCENE_SET = new Set(['local_explore', 'outdoor_nature', 'festival_theme'])
const INDOOR_SCENE_SET = new Set(['learning_sharing', 'workshop_experience', 'music_performance'])
const SOCIAL_SCENE_SET = new Set(['casual_gathering', 'social_networking', 'nomad_city'])
const FESTIVAL_SCENE_SET = new Set(['festival_theme'])
const MARKET_SCENE_SET = new Set(['market_popups'])
const FAMILY_SCENE_SET = new Set(['family_pet'])
const PUBLIC_SCENE_SET = new Set(['public_welfare'])

const ALCOHOL_TYPE_SET = new Set(['bar_gathering', 'industry_wine_social', 'dj_party', 'cocktail_workshop'])
const OUTDOOR_TYPE_SET = new Set([
  'hiking', 'running', 'walking', 'cycling', 'camping', 'light_trail_run',
  'erhai_co_travel', 'sunrise_sunset_trip', 'stargazing', 'farm_experience',
  'beach_cleanup', 'dog_walk', 'outdoor_social', 'mountain_healing',
])
const WATER_TYPE_SET = new Set(['paddle_water_sports', 'erhai_co_travel'])
const CHILD_TYPE_SET = new Set(['parent_child', 'children_handcraft', 'parent_child_movie', 'nature_education'])
const PET_TYPE_SET = new Set(['pet_social', 'dog_walk', 'pet_friendly_gathering', 'pet_friendly_market', 'pet_photography'])
const PRIVATE_SOCIAL_TYPE_SET = new Set(['private_circle', 'closed_small_group', 'singles_social', 'friend_making'])
const MARKET_SALES_TYPE_SET = new Set(['stall_recruitment', 'brand_popup', 'cohost_event', 'tasting_event', 'trial_event'])

const AREA_RULES = [
  { tag: '大理古城片区', keywords: ['大理古城', '古城', '人民路', '洋人街', '博爱路'] },
  { tag: '下关片区', keywords: ['下关', '泰安路', '建设路', '万达', '高铁站'] },
  { tag: '洱海生态廊道片区', keywords: ['生态廊道', '廊道', '龙龛', '才村码头'] },
  { tag: '双廊片区', keywords: ['双廊', '玉几岛'] },
  { tag: '喜洲片区', keywords: ['喜洲', '周城', '海舌'] },
  { tag: '苍山片区', keywords: ['苍山', '感通', '寂照庵', '洗马潭'] },
  { tag: '海东片区', keywords: ['海东', '理想邦', '文笔村'] },
  { tag: '才村片区', keywords: ['才村'] },
  { tag: '磻溪/S湾片区', keywords: ['磻溪', 's湾', 'S湾'] },
  { tag: '凤阳邑片区', keywords: ['凤阳邑'] },
]

const GOAL_MAP = {
  local_explore: ['拉新', '活跃'],
  casual_gathering: ['活跃', '留存'],
  social_networking: ['拉新', '资源连接'],
  learning_sharing: ['活跃', '留存'],
  workshop_experience: ['转化', '留存'],
  music_performance: ['品牌曝光', '拉新'],
  market_popups: ['转化', '品牌曝光'],
  outdoor_nature: ['活跃', '留存'],
  family_pet: ['活跃', '留存'],
  public_welfare: ['品牌曝光', '活跃'],
  nomad_city: ['拉新', '资源连接'],
  festival_theme: ['品牌曝光', '拉新'],
}

const DRIVER_MAP = {
  local_explore: ['体验驱动'],
  casual_gathering: ['社交驱动', '氛围驱动'],
  social_networking: ['社交驱动'],
  learning_sharing: ['内容驱动'],
  workshop_experience: ['体验驱动', '内容驱动'],
  music_performance: ['氛围驱动'],
  market_popups: ['体验驱动', '氛围驱动'],
  outdoor_nature: ['体验驱动'],
  family_pet: ['社交驱动', '体验驱动'],
  public_welfare: ['内容驱动'],
  nomad_city: ['社交驱动'],
  festival_theme: ['氛围驱动', '体验驱动'],
}

const OBJECTIVE_MAP = {
  拉新: '拉新型',
  活跃: '促活型',
  留存: '留存型',
  转化: '转化型',
  品牌曝光: '品牌传播型',
  资源连接: '商业合作型',
}

const KEYWORD_RULES = [
  {
    code: 'social_sensitive',
    label: '交友敏感',
    keywords: ['交友', '单身', '脱单'],
    score: 12,
    effects: {
      risk: {
        order: ['交友敏感', '私密社交风险'],
        governance: ['易涉虚假交友', '需限制联系方式直出'],
      },
      operation: {
        userStructure: ['强筛选属性'],
      },
    },
  },
  {
    code: 'alcohol_related',
    label: '酒精相关风险',
    keywords: ['酒局', '微醺', '精酿', '清吧', '酒吧', '喝酒'],
    score: 16,
    effects: {
      risk: {
        safety: ['酒精相关风险'],
        governance: ['易涉收费争议'],
      },
      operation: {
        contentAttribute: ['氛围驱动'],
      },
    },
  },
  {
    code: 'outdoor_motion',
    label: '户外运动风险',
    keywords: ['徒步', '骑行', '露营', '越野', '登山', '桨板'],
    score: 10,
    effects: {
      risk: {
        safety: ['户外运动风险'],
        emergency: ['需天气预案', '需紧急联系人'],
      },
      region: {
        venue: ['室外', '自然场地'],
      },
    },
  },
  {
    code: 'open_fire',
    label: '明火风险',
    keywords: ['火把', '篝火', '明火', '焰火'],
    score: 14,
    effects: {
      risk: {
        safety: ['明火风险', '天气敏感风险'],
        emergency: ['需天气预案', '需取消预案'],
      },
    },
  },
  {
    code: 'yunnan_heritage',
    label: '云南民俗/非遗主题',
    keywords: ['三月街', '火把节', '白族', '扎染', '非遗', '绕三灵', '甲马', '瓦猫'],
    score: 3,
    effects: {
      region: {
        yunnanTheme: ['三月街主题', '火把节主题', '白族文化主题', '非遗体验主题'],
      },
      operation: {
        contentAttribute: ['节庆驱动', '内容驱动'],
      },
      commercial: {
        commercialValue: ['高内容传播价值', '高品牌曝光价值'],
      },
    },
  },
  {
    code: 'brand_sponsor',
    label: '品牌联名/赞助',
    keywords: ['联名', '赞助', '品牌合作', '合作品牌'],
    score: 2,
    effects: {
      commercial: {
        chargingMode: ['赞助支持', '联名合作'],
        monetizationPath: ['品牌赞助'],
        commercialValue: ['高联名潜力', '高赞助潜力'],
        supplySide: ['品牌驱动', '官方适合介入'],
      },
      operation: {
        officialOpsValue: ['适合官方联办', '适合平台招商'],
      },
    },
  },
]

function normalizeText(value = '') {
  return String(value || '').trim()
}

function normalizeLower(value = '') {
  return normalizeText(value).toLowerCase()
}

function uniq(list = []) {
  return [...new Set((Array.isArray(list) ? list : []).map((item) => normalizeText(item)).filter(Boolean))]
}

function pushTags(target = [], tags = []) {
  uniq(tags).forEach((tag) => {
    if (!target.includes(tag)) target.push(tag)
  })
}

function includesAny(text = '', keywords = []) {
  if (!text) return false
  return (Array.isArray(keywords) ? keywords : []).some((kw) => text.includes(String(kw || '')))
}

function toMs(value) {
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : NaN
}

function chinaHourFromMs(ms) {
  if (!Number.isFinite(ms)) return -1
  const dt = new Date(ms + 8 * 60 * 60 * 1000)
  return dt.getUTCHours()
}

function resolveAreaTag(address = '') {
  const text = normalizeText(address)
  if (!text) return '非固定地点'
  const hit = AREA_RULES.find((rule) => includesAny(text, rule.keywords))
  return hit ? hit.tag : '周边县域片区'
}

function resolveChargeModeTag(chargeType = 'free', feeAmount = 0) {
  const safe = normalizeLower(chargeType)
  const fee = Number(feeAmount || 0)
  if (safe === 'aa') return 'AA制'
  if (safe !== 'paid') return '免费'
  if (fee <= 39) return '低价付费'
  if (fee <= 99) return '中价付费'
  return '高价付费'
}

function resolveMonetizationPath(sceneId = '', typeId = '', chargeModeTag = '') {
  const tags = []
  if (chargeModeTag === '免费' || chargeModeTag === 'AA制') {
    if (MARKET_SCENE_SET.has(sceneId)) pushTags(tags, ['导流成交'])
    else pushTags(tags, ['线索收集'])
    return tags
  }
  if (sceneId === 'learning_sharing' || sceneId === 'workshop_experience') pushTags(tags, ['课程收入'])
  if (sceneId === 'music_performance') pushTags(tags, ['门票收入'])
  if (sceneId === 'market_popups') pushTags(tags, ['摊位费收入', '商品销售'])
  if (!tags.length) pushTags(tags, ['体验收入'])
  if (MARKET_SALES_TYPE_SET.has(typeId)) pushTags(tags, ['导流成交'])
  return tags
}

function resolveCommercialValue(chargeModeTag = '', sceneId = '') {
  const tags = []
  if (chargeModeTag === '高价付费') pushTags(tags, ['商业化强', '高客单潜力'])
  else if (chargeModeTag === '中价付费' || chargeModeTag === '低价付费') pushTags(tags, ['商业化中'])
  else pushTags(tags, ['商业化弱'])

  if (sceneId === 'workshop_experience' || sceneId === 'learning_sharing') pushTags(tags, ['高复购潜力'])
  if (sceneId === 'music_performance' || sceneId === 'festival_theme') pushTags(tags, ['高品牌曝光价值', '高内容传播价值'])
  if (sceneId === 'market_popups') pushTags(tags, ['高招商潜力', '高联名潜力'])
  return tags
}

function resolveSupplySide(sceneId = '', typeId = '') {
  const tags = ['主理人驱动']
  if (MARKET_SCENE_SET.has(sceneId) || MARKET_SALES_TYPE_SET.has(typeId)) pushTags(tags, ['商家驱动'])
  if (sceneId === 'festival_theme' || sceneId === 'music_performance') pushTags(tags, ['平台驱动', '官方适合介入'])
  else if (sceneId === 'casual_gathering' || sceneId === 'social_networking') pushTags(tags, ['官方不宜重介入'])

  if (sceneId === 'casual_gathering' || sceneId === 'social_networking' || sceneId === 'outdoor_nature') {
    pushTags(tags, ['易标准化', '可复制'])
  } else {
    pushTags(tags, ['难标准化', '强定制'])
  }
  return tags
}

function resolveCostStructure(sceneId = '', maxParticipants = 999) {
  const cap = Number(maxParticipants || 999)
  const tags = []
  if (sceneId === 'music_performance' || sceneId === 'market_popups' || sceneId === 'festival_theme') {
    pushTags(tags, ['高成本活动', '高物料依赖', '高场地依赖'])
  } else if (sceneId === 'casual_gathering' || sceneId === 'social_networking' || sceneId === 'learning_sharing') {
    pushTags(tags, ['低成本活动', '低物料依赖', '低场地依赖'])
  } else {
    pushTags(tags, ['中成本活动'])
  }

  if (cap >= 40) pushTags(tags, ['高人员依赖'])
  else pushTags(tags, ['低人员依赖'])
  return tags
}

function resolveOperations({
  sceneId = '',
  chargeModeTag = '',
  maxParticipants = 999,
  requireApproval = false,
  hasLocation = false,
  isNight = false,
}) {
  const goals = GOAL_MAP[sceneId] || ['活跃']
  const objective = uniq(goals.map((tag) => OBJECTIVE_MAP[tag] || '').filter(Boolean))
  if (!objective.length) objective.push('促活型')

  const launchDifficulty = []
  if (sceneId === 'casual_gathering' || sceneId === 'social_networking') pushTags(launchDifficulty, ['易发起'])
  else if (sceneId === 'music_performance' || sceneId === 'market_popups' || sceneId === 'festival_theme') pushTags(launchDifficulty, ['高门槛发起'])
  else pushTags(launchDifficulty, ['中等发起'])

  const formingDifficulty = []
  const cap = Number(maxParticipants || 999)
  if (requireApproval || cap >= 40) pushTags(formingDifficulty, ['难成局', '强依赖主理人'])
  else if (sceneId === 'casual_gathering' || sceneId === 'social_networking') pushTags(formingDifficulty, ['易成局'])
  else pushTags(formingDifficulty, ['中等成局'])
  if (isNight) pushTags(formingDifficulty, ['强依赖时间地点'])

  const frequency = []
  if (sceneId === 'festival_theme') pushTags(frequency, ['低频', '一次性活动', '适合节庆节点'])
  else if (sceneId === 'market_popups' || sceneId === 'music_performance') pushTags(frequency, ['中频', '适合月更'])
  else pushTags(frequency, ['可高频', '可系列化', '适合周更'])

  const distribution = ['适合首页推荐']
  if (hasLocation) pushTags(distribution, ['适合附近推荐'])
  if (sceneId === 'learning_sharing' || sceneId === 'workshop_experience') pushTags(distribution, ['适合专题推荐', '适合内容种草'])
  if (sceneId === 'music_performance' || sceneId === 'market_popups' || sceneId === 'festival_theme') pushTags(distribution, ['适合海报传播', '适合短视频传播'])
  if (SOCIAL_SCENE_SET.has(sceneId)) pushTags(distribution, ['适合社群分发', '适合口碑传播'])
  if (chargeModeTag !== '免费') pushTags(distribution, ['适合私域扩散'])

  const userStructure = []
  if (chargeModeTag === '免费') pushTags(userStructure, ['新用户友好'])
  if (sceneId === 'nomad_city') pushTags(userStructure, ['旅居者偏好'])
  if (sceneId === 'local_explore') pushTags(userStructure, ['游客偏好'])
  if (sceneId === 'family_pet') pushTags(userStructure, ['新手友好'])
  if (SOCIAL_SCENE_SET.has(sceneId)) pushTags(userStructure, ['独自参与友好'])
  if (cap <= 12) pushTags(userStructure, ['强圈层属性'])
  else pushTags(userStructure, ['混合人群适配'])
  if (requireApproval) pushTags(userStructure, ['邀请审核制', '强筛选属性'])
  else pushTags(userStructure, ['开放参与'])

  const officialOpsValue = []
  if (sceneId === 'festival_theme' || sceneId === 'music_performance') {
    pushTags(officialOpsValue, ['适合官方专题运营', '适合城市内容策展', '适合官方背书'])
  } else if (sceneId === 'market_popups') {
    pushTags(officialOpsValue, ['适合官方联办', '适合平台招商'])
  } else if (sceneId === 'nomad_city' || sceneId === 'local_explore') {
    pushTags(officialOpsValue, ['适合官方冷启动'])
  } else {
    pushTags(officialOpsValue, ['不适合官方重介入'])
  }

  const contentAttribute = []
  if (sceneId === 'learning_sharing' || sceneId === 'workshop_experience' || sceneId === 'public_welfare') pushTags(contentAttribute, ['内容驱动'])
  if (SOCIAL_SCENE_SET.has(sceneId) || FAMILY_SCENE_SET.has(sceneId)) pushTags(contentAttribute, ['社交驱动'])
  if (sceneId === 'music_performance' || sceneId === 'festival_theme') pushTags(contentAttribute, ['氛围驱动', '演出驱动'])
  if (MARKET_SCENE_SET.has(sceneId)) pushTags(contentAttribute, ['商家驱动'])
  if (OUTDOOR_SCENE_SET.has(sceneId) || sceneId === 'local_explore') pushTags(contentAttribute, ['地点驱动'])
  if (FESTIVAL_SCENE_SET.has(sceneId)) pushTags(contentAttribute, ['节庆驱动'])
  if (!contentAttribute.length) pushTags(contentAttribute, ['主理人驱动'])

  return {
    objective: objective.slice(0, 3),
    launchDifficulty: launchDifficulty.slice(0, 3),
    formingDifficulty: formingDifficulty.slice(0, 3),
    frequency: frequency.slice(0, 3),
    distribution: distribution.slice(0, 4),
    userStructure: userStructure.slice(0, 4),
    officialOpsValue: officialOpsValue.slice(0, 3),
    contentAttribute: contentAttribute.slice(0, 3),
  }
}

function resolveRisk({
  sceneId = '',
  typeId = '',
  chargeType = 'free',
  maxParticipants = 999,
  isNight = false,
}) {
  const safety = []
  const order = []
  const governance = []
  const emergency = []
  let score = 8

  const isAlcohol = ALCOHOL_TYPE_SET.has(typeId)
  const isOutdoor = OUTDOOR_SCENE_SET.has(sceneId) || OUTDOOR_TYPE_SET.has(typeId)
  const isWater = WATER_TYPE_SET.has(typeId)
  const hasChildren = FAMILY_SCENE_SET.has(sceneId) || CHILD_TYPE_SET.has(typeId)
  const hasPet = FAMILY_SCENE_SET.has(sceneId) || PET_TYPE_SET.has(typeId)
  const socialSensitive = sceneId === 'social_networking' || PRIVATE_SOCIAL_TYPE_SET.has(typeId)
  const marketSales = MARKET_SCENE_SET.has(sceneId) || MARKET_SALES_TYPE_SET.has(typeId)
  const cap = Number(maxParticipants || 999)

  if (isNight) {
    score += 14
    pushTags(safety, ['夜间风险'])
  }
  if (isAlcohol) {
    score += 16
    pushTags(safety, ['酒精相关风险'])
    pushTags(governance, ['易涉收费争议'])
  }
  if (isOutdoor) {
    score += 10
    pushTags(safety, ['户外运动风险'])
  }
  if (isWater) {
    score += 16
    pushTags(safety, ['水域风险'])
  }
  if (hasChildren) {
    score += 8
    pushTags(safety, ['儿童参与风险'])
  }
  if (hasPet) {
    score += 4
    pushTags(safety, ['宠物参与风险'])
  }
  if (cap >= 40) {
    score += 12
    pushTags(safety, ['人群拥挤风险'])
  }
  if (normalizeLower(chargeType) === 'paid') {
    score += 6
    pushTags(order, ['退款争议风险'])
    pushTags(governance, ['易涉收费争议'])
  }
  if (socialSensitive) {
    score += 10
    pushTags(order, ['交友敏感'])
    if (PRIVATE_SOCIAL_TYPE_SET.has(typeId)) pushTags(order, ['私密社交风险'])
    pushTags(governance, ['易涉虚假交友'])
  }
  if (marketSales) {
    score += 6
    pushTags(order, ['商业销售倾向'])
    pushTags(governance, ['易被营销刷屏'])
    pushTags(order, ['摊位纠纷风险'])
  }
  if (sceneId === 'music_performance') pushTags(safety, ['演出设备风险'])

  const base = []
  if (score >= 45) pushTags(base, ['高风险', '需人工审核'])
  else if (score >= 25) pushTags(base, ['中风险', '需二次确认'])
  else pushTags(base, ['低风险'])

  if (score >= 45 && (isWater || isOutdoor)) pushTags(base, ['需线下核验'])
  if (socialSensitive && !isNight) pushTags(governance, ['需限制联系方式直出'])
  if (socialSensitive && isNight) pushTags(governance, ['需限制私聊'])

  if (cap > 0 && cap < 99999) pushTags(emergency, ['需人数上限'])
  if (isOutdoor || isWater) pushTags(emergency, ['需天气预案', '需紧急联系人'])
  if (normalizeLower(chargeType) === 'paid') pushTags(emergency, ['需取消预案'])
  if (score >= 45) pushTags(emergency, ['需客服值守'])
  if (hasChildren) pushTags(emergency, ['需实名制'])

  return {
    score,
    triggers: {
      isOutdoor,
      isAlcohol,
      isChildren: hasChildren,
      isPet: hasPet,
    },
    base: base.slice(0, 3),
    safety: safety.slice(0, 4),
    order: order.slice(0, 4),
    governance: governance.slice(0, 4),
    emergency: emergency.slice(0, 4),
  }
}

function resolveRegion({
  sceneId = '',
  address = '',
  areaTag = '非固定地点',
}) {
  const text = normalizeText(address)
  const venue = []
  if (OUTDOOR_SCENE_SET.has(sceneId)) pushTags(venue, ['室外', '自然场地'])
  if (INDOOR_SCENE_SET.has(sceneId)) pushTags(venue, ['室内'])
  if (MARKET_SCENE_SET.has(sceneId)) pushTags(venue, ['半开放空间', '流动场景'])
  if (!venue.length) pushTags(venue, ['室内'])

  if (includesAny(text, ['咖啡', '咖啡馆'])) pushTags(venue, ['咖啡馆'])
  if (includesAny(text, ['酒吧', '餐吧', '清吧'])) pushTags(venue, ['餐酒吧'])
  if (includesAny(text, ['民宿'])) pushTags(venue, ['民宿空间'])
  if (includesAny(text, ['农场', '营地'])) pushTags(venue, ['农场营地'])
  if (includesAny(text, ['展馆', '博物馆', '美术馆'])) pushTags(venue, ['景观点位'])

  const vibe = []
  if (sceneId === 'local_explore') pushTags(vibe, ['在地文化感', '古城生活感'])
  if (sceneId === 'outdoor_nature') pushTags(vibe, ['亲近自然', '洱海风景感'])
  if (sceneId === 'music_performance') pushTags(vibe, ['夜生活导向', '社交氛围强'])
  if (sceneId === 'casual_gathering' || sceneId === 'social_networking') pushTags(vibe, ['社交氛围强', '文艺松弛感'])
  if (sceneId === 'workshop_experience' || sceneId === 'learning_sharing') pushTags(vibe, ['安静疗愈导向'])
  if (sceneId === 'nomad_city') pushTags(vibe, ['旅居社区感', '文艺松弛感'])
  if (!vibe.length) pushTags(vibe, ['文艺松弛感'])

  const transport = []
  if (['大理古城片区', '下关片区'].includes(areaTag)) pushTags(transport, ['步行友好', '打车友好'])
  if (['双廊片区', '喜洲片区', '苍山片区', '海东片区', '周边县域片区'].includes(areaTag)) {
    pushTags(transport, ['自驾友好', '停车方便'])
  }
  if (areaTag === '非固定地点') pushTags(transport, ['集合点清晰'])
  if (!transport.length) pushTags(transport, ['打车友好'])

  const people = []
  if (sceneId === 'local_explore') pushTags(people, ['适合游客', '适合旅居者'])
  if (sceneId === 'nomad_city') pushTags(people, ['适合旅居者', '适合本地常住'])
  if (sceneId === 'outdoor_nature') pushTags(people, ['适合周末短途'])
  if (sceneId === 'music_performance') pushTags(people, ['适合夜场'])
  if (sceneId === 'festival_theme') pushTags(people, ['适合旺季'])
  if (!people.length) pushTags(people, ['适合本地常住'])

  const yunnanTheme = []
  if (sceneId === 'festival_theme') pushTags(yunnanTheme, ['三月街主题', '火把节主题', '白族文化主题', '节气主题'])
  if (sceneId === 'local_explore') pushTags(yunnanTheme, ['洱海主题', '苍山主题', '旅居主题'])
  if (sceneId === 'market_popups') pushTags(yunnanTheme, ['市集主题'])
  if (sceneId === 'nomad_city') pushTags(yunnanTheme, ['数字游民主题', '旅居主题'])

  return {
    cityLayer: [areaTag],
    venue: venue.slice(0, 4),
    vibe: vibe.slice(0, 3),
    transport: transport.slice(0, 3),
    people: people.slice(0, 3),
    yunnanTheme: yunnanTheme.slice(0, 4),
  }
}

function keywordHit(textLower = '', keywords = []) {
  if (!textLower) return []
  return uniq((Array.isArray(keywords) ? keywords : [])
    .map((kw) => String(kw || '').trim())
    .filter((kw) => kw && textLower.includes(kw.toLowerCase())))
}

function riskBaseByScore(score = 0, safetyTags = []) {
  const n = Number(score || 0)
  const base = []
  if (n >= 45) pushTags(base, ['高风险', '需人工审核'])
  else if (n >= 25) pushTags(base, ['中风险', '需二次确认'])
  else pushTags(base, ['低风险'])
  const safety = uniq(safeArray(safetyTags))
  if (n >= 45 && (safety.includes('户外运动风险') || safety.includes('水域风险') || safety.includes('明火风险'))) {
    pushTags(base, ['需线下核验'])
  }
  return base.slice(0, 3)
}

function safeArray(value) {
  return Array.isArray(value) ? value : []
}

function clampDimensions(dimensions = {}) {
  const cloned = JSON.parse(JSON.stringify(dimensions || {}))
  cloned.activityGoal = uniq(cloned.activityGoal).slice(0, 3)
  cloned.contentDriver = uniq(cloned.contentDriver).slice(0, 3)

  const c = cloned.commercial || {}
  c.chargingMode = uniq(c.chargingMode).slice(0, 4)
  c.monetizationPath = uniq(c.monetizationPath).slice(0, 6)
  c.commercialValue = uniq(c.commercialValue).slice(0, 6)
  c.supplySide = uniq(c.supplySide).slice(0, 6)
  c.costStructure = uniq(c.costStructure).slice(0, 6)
  cloned.commercial = c

  const o = cloned.operation || {}
  o.objective = uniq(o.objective).slice(0, 4)
  o.launchDifficulty = uniq(o.launchDifficulty).slice(0, 4)
  o.formingDifficulty = uniq(o.formingDifficulty).slice(0, 4)
  o.frequency = uniq(o.frequency).slice(0, 4)
  o.distribution = uniq(o.distribution).slice(0, 6)
  o.userStructure = uniq(o.userStructure).slice(0, 6)
  o.officialOpsValue = uniq(o.officialOpsValue).slice(0, 4)
  o.contentAttribute = uniq(o.contentAttribute).slice(0, 5)
  cloned.operation = o

  const r = cloned.risk || {}
  r.triggers = {
    isOutdoor: !!r?.triggers?.isOutdoor,
    isAlcohol: !!r?.triggers?.isAlcohol,
    isChildren: !!r?.triggers?.isChildren,
    isPet: !!r?.triggers?.isPet,
  }
  r.safety = uniq(r.safety).slice(0, 6)
  r.order = uniq(r.order).slice(0, 6)
  r.governance = uniq(r.governance).slice(0, 6)
  r.emergency = uniq(r.emergency).slice(0, 6)
  const score = Number(r.score || 0)
  r.base = riskBaseByScore(score, r.safety)
  cloned.risk = r

  const g = cloned.region || {}
  g.cityLayer = uniq(g.cityLayer).slice(0, 3)
  g.venue = uniq(g.venue).slice(0, 6)
  g.vibe = uniq(g.vibe).slice(0, 4)
  g.transport = uniq(g.transport).slice(0, 4)
  g.people = uniq(g.people).slice(0, 4)
  g.yunnanTheme = uniq(g.yunnanTheme).slice(0, 6)
  cloned.region = g

  return cloned
}

function buildRiskTriggerFlags(dimensions = {}, requireApproval = false) {
  const safetyTags = uniq(safeArray(dimensions?.risk?.safety))
  const triggerByRisk = {
    isOutdoor: !!dimensions?.risk?.triggers?.isOutdoor || safetyTags.includes('户外运动风险'),
    isAlcohol: !!dimensions?.risk?.triggers?.isAlcohol || safetyTags.includes('酒精相关风险'),
    isChildren: !!dimensions?.risk?.triggers?.isChildren || safetyTags.includes('儿童参与风险'),
    isPet: !!dimensions?.risk?.triggers?.isPet || safetyTags.includes('宠物参与风险'),
    isApprovalRequired: !!requireApproval,
  }
  return triggerByRisk
}

function applyKeywordEnhancement(dimensions = {}, input = {}) {
  const textChunks = [
    input.title,
    input.description,
    input.address,
    input.sceneName,
    input.typeName,
  ].map((item) => normalizeText(item)).filter(Boolean)
  const text = textChunks.join(' | ')
  const textLower = text.toLowerCase()
  const hits = []
  let scoreDelta = 0

  const next = JSON.parse(JSON.stringify(dimensions || {}))
  KEYWORD_RULES.forEach((rule) => {
    const matched = keywordHit(textLower, rule.keywords)
    if (!matched.length) return
    hits.push({
      code: rule.code,
      label: rule.label,
      keywords: matched.slice(0, 4),
    })
    scoreDelta += Number(rule.score || 0)
    const effects = rule.effects || {}
    pushTags(next.activityGoal, effects.activityGoal || [])
    pushTags(next.contentDriver, effects.contentDriver || [])

    if (effects.commercial) {
      next.commercial = next.commercial || {}
      pushTags(next.commercial.chargingMode, effects.commercial.chargingMode || [])
      pushTags(next.commercial.monetizationPath, effects.commercial.monetizationPath || [])
      pushTags(next.commercial.commercialValue, effects.commercial.commercialValue || [])
      pushTags(next.commercial.supplySide, effects.commercial.supplySide || [])
      pushTags(next.commercial.costStructure, effects.commercial.costStructure || [])
    }
    if (effects.operation) {
      next.operation = next.operation || {}
      pushTags(next.operation.objective, effects.operation.objective || [])
      pushTags(next.operation.launchDifficulty, effects.operation.launchDifficulty || [])
      pushTags(next.operation.formingDifficulty, effects.operation.formingDifficulty || [])
      pushTags(next.operation.frequency, effects.operation.frequency || [])
      pushTags(next.operation.distribution, effects.operation.distribution || [])
      pushTags(next.operation.userStructure, effects.operation.userStructure || [])
      pushTags(next.operation.officialOpsValue, effects.operation.officialOpsValue || [])
      pushTags(next.operation.contentAttribute, effects.operation.contentAttribute || [])
    }
    if (effects.risk) {
      next.risk = next.risk || {}
      pushTags(next.risk.safety, effects.risk.safety || [])
      pushTags(next.risk.order, effects.risk.order || [])
      pushTags(next.risk.governance, effects.risk.governance || [])
      pushTags(next.risk.emergency, effects.risk.emergency || [])
      pushTags(next.risk.base, effects.risk.base || [])
    }
    if (effects.region) {
      next.region = next.region || {}
      pushTags(next.region.cityLayer, effects.region.cityLayer || [])
      pushTags(next.region.venue, effects.region.venue || [])
      pushTags(next.region.vibe, effects.region.vibe || [])
      pushTags(next.region.transport, effects.region.transport || [])
      pushTags(next.region.people, effects.region.people || [])
      pushTags(next.region.yunnanTheme, effects.region.yunnanTheme || [])
    }
  })

  next.risk = next.risk || {}
  const baseScore = Number(next.risk.score || 0)
  next.risk.score = Math.max(0, Math.min(100, baseScore + scoreDelta))
  const clamped = clampDimensions(next)

  return {
    dimensions: clamped,
    scoreDelta,
    hits,
    textUsed: text,
  }
}

function flattenTags(node, bucket = []) {
  if (Array.isArray(node)) {
    pushTags(bucket, node)
    return bucket
  }
  if (node && typeof node === 'object') {
    Object.values(node).forEach((value) => flattenTags(value, bucket))
  }
  return bucket
}

function buildCoreTags(dimensions = {}) {
  const core = []
  pushTags(core, dimensions?.operation?.objective?.slice(0, 1) || [])
  pushTags(core, dimensions?.operation?.distribution?.slice(0, 1) || [])
  pushTags(core, dimensions?.operation?.userStructure?.slice(0, 1) || [])
  pushTags(core, dimensions?.operation?.contentAttribute?.slice(0, 1) || [])
  pushTags(core, dimensions?.operation?.officialOpsValue?.slice(0, 1) || [])
  pushTags(core, dimensions?.risk?.base?.slice(0, 1) || [])
  return core.slice(0, 6)
}

function buildOpsTagProfile(input = {}) {
  const sceneId = normalizeText(input.sceneId)
  const typeId = normalizeText(input.typeId)
  const categoryId = normalizeText(input.categoryId || 'other')
  const chargeType = normalizeLower(input.chargeType || 'free')
  const feeAmount = Number(input.feeAmount || 0)
  const maxParticipants = Number(input.maxParticipants || 999)
  const requireApproval = !!input.requireApproval
  const allowWaitlist = !!input.allowWaitlist
  const isGroupFormation = !!input.isGroupFormation
  const startMs = toMs(input.startTime)
  const startHourChina = chinaHourFromMs(startMs)
  const isNight = startHourChina >= 21 || (startHourChina >= 0 && startHourChina < 6)
  const address = normalizeText(input.address)
  const cityId = normalizeText(input.cityId || 'dali')
  const areaTag = resolveAreaTag(address)
  const hasLocation = Number.isFinite(Number(input.lat)) && Number.isFinite(Number(input.lng))
  const chargeModeTag = resolveChargeModeTag(chargeType, feeAmount)

  const activityGoal = uniq(GOAL_MAP[sceneId] || ['活跃'])
  const contentDriver = uniq(DRIVER_MAP[sceneId] || ['体验驱动'])
  const commercial = {
    chargingMode: [chargeModeTag],
    monetizationPath: resolveMonetizationPath(sceneId, typeId, chargeModeTag).slice(0, 4),
    commercialValue: resolveCommercialValue(chargeModeTag, sceneId).slice(0, 4),
    supplySide: resolveSupplySide(sceneId, typeId).slice(0, 4),
    costStructure: resolveCostStructure(sceneId, maxParticipants).slice(0, 4),
  }
  const operation = resolveOperations({
    sceneId,
    chargeModeTag,
    maxParticipants,
    requireApproval,
    hasLocation,
    isNight,
  })
  const risk = resolveRisk({
    sceneId,
    typeId,
    chargeType,
    maxParticipants,
    isNight,
  })
  const region = resolveRegion({
    sceneId,
    address,
    areaTag,
  })

  const baseDimensions = {
    activityGoal: activityGoal.slice(0, 3),
    contentDriver: contentDriver.slice(0, 3),
    commercial,
    operation,
    risk,
    region,
  }
  const keywordResult = applyKeywordEnhancement(baseDimensions, input)
  const dimensions = keywordResult.dimensions
  const riskTriggerFlags = buildRiskTriggerFlags(dimensions, requireApproval)
  const coreTags = buildCoreTags(dimensions)
  const flatTags = uniq(flattenTags(dimensions)).slice(0, 140)

  return {
    version: OPS_TAG_VERSION,
    mode: 'structured_fields+keyword_rules',
    generatedAtMs: Date.now(),
    sourceFields: {
      sceneId,
      typeId,
      categoryId,
      chargeType,
      feeAmount: Number.isFinite(feeAmount) ? feeAmount : 0,
      maxParticipants: Number.isFinite(maxParticipants) ? maxParticipants : 999,
      requireApproval,
      allowWaitlist,
      isGroupFormation,
      startHourChina,
      isNight,
      cityId,
      areaTag,
      hasLocation,
      isOutdoor: riskTriggerFlags.isOutdoor,
      isAlcohol: riskTriggerFlags.isAlcohol,
      isChildren: riskTriggerFlags.isChildren,
      isPet: riskTriggerFlags.isPet,
      isApprovalRequired: riskTriggerFlags.isApprovalRequired,
    },
    keywordEnhancement: {
      enabled: true,
      hitCount: keywordResult.hits.length,
      scoreDelta: keywordResult.scoreDelta,
      hits: keywordResult.hits,
    },
    dimensions,
    riskTriggerFlags,
    coreTags,
    flatTags,
  }
}

module.exports = {
  buildOpsTagProfile,
  OPS_TAG_VERSION,
}
