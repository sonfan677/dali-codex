const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

const DEFAULT_CITY_ID = 'dali'
const COLLECTION_CANDIDATES = ['festivalThemes', 'officialFestivalThemes']
const MAX_TAG_COUNT = 6

function parseAdminMeta(openid) {
  const adminOpenids = String(process.env.ADMIN_OPENIDS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const roleMap = String(process.env.ADMIN_ROLE_MAP || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [k, v] = item.split(':').map((s) => s.trim())
      if (k && v) acc[k] = v
      return acc
    }, {})
  const cityScopeMap = String(process.env.ADMIN_CITY_SCOPE || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((acc, item) => {
      const [k, v] = item.split(':').map((s) => s.trim())
      if (k && v) acc[k] = v
      return acc
    }, {})
  return {
    isAdmin: adminOpenids.includes(openid),
    adminRole: roleMap[openid] || 'superAdmin',
    adminCityId: cityScopeMap[openid] || DEFAULT_CITY_ID,
  }
}

async function resolveAdminMeta(openid = '') {
  const localMeta = parseAdminMeta(openid)
  if (localMeta.isAdmin) return localMeta

  // 容错：新函数若未配置管理员环境变量，回退复用 checkAdmin 的鉴权结果
  try {
    const ret = await cloud.callFunction({
      name: 'checkAdmin',
      data: {},
    })
    const result = ret?.result || {}
    if (result?.success && result?.isAdmin) {
      return {
        isAdmin: true,
        adminRole: String(result.adminRole || 'superAdmin').trim() || 'superAdmin',
        adminCityId: String(result.cityId || DEFAULT_CITY_ID).trim() || DEFAULT_CITY_ID,
      }
    }
  } catch (e) {}

  return localMeta
}

function resolveCollectionName() {
  const preferred = String(process.env.FESTIVAL_THEME_COLLECTION || '').trim()
  if (preferred) return preferred
  return COLLECTION_CANDIDATES[0]
}

function normalizeShortName(value = '') {
  const safe = String(value || '').trim().replace(/\s+/g, '')
  if (!safe) return ''
  return safe.slice(0, 8)
}

function normalizeIntro(value = '') {
  return String(value || '').trim().slice(0, 120)
}

function normalizeLocationKeywords(input = []) {
  const source = Array.isArray(input)
    ? input
    : String(input || '').split(/[,\n，、;；]/g)
  const next = []
  source.forEach((item) => {
    const keyword = String(item || '').trim().toLowerCase()
    if (!keyword || next.includes(keyword)) return
    next.push(keyword.slice(0, 20))
  })
  return next.slice(0, MAX_TAG_COUNT)
}

function isDayKey(value = '') {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim())
}

function safeDayKey(value = '') {
  const safe = String(value || '').trim()
  return isDayKey(safe) ? safe : ''
}

function compareDayKey(a = '', b = '') {
  return String(a || '').localeCompare(String(b || ''))
}

function buildThemeResponse(item = {}) {
  return {
    _id: item._id || '',
    cityId: item.cityId || DEFAULT_CITY_ID,
    shortName: normalizeShortName(item.themeShortName || item.shortName || item.title || ''),
    title: String(item.title || item.themeShortName || '').trim(),
    intro: normalizeIntro(item.intro || item.note || ''),
    startDayKey: safeDayKey(item.startDayKey),
    endDayKey: safeDayKey(item.endDayKey),
    locationKeywords: normalizeLocationKeywords(item.locationKeywords || []),
    themeColor: String(item.themeColor || '#0F766E').trim() || '#0F766E',
    isActive: item.isActive !== false,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null,
    updatedBy: item.updatedBy || '',
  }
}

async function listThemes(cityId = DEFAULT_CITY_ID) {
  const collection = resolveCollectionName()
  const { data } = await db.collection(collection)
    .where({
      cityId,
      isActive: _.neq(false),
    })
    .orderBy('startDayKey', 'asc')
    .orderBy('updatedAt', 'desc')
    .limit(200)
    .get()
    .catch(() => ({ data: [] }))
  return (Array.isArray(data) ? data : [])
    .map((item) => buildThemeResponse(item))
    .sort((a, b) => compareDayKey(a.startDayKey, b.startDayKey))
}

exports.main = async (event = {}) => {
  const { OPENID } = cloud.getWXContext()
  const { isAdmin, adminRole, adminCityId } = await resolveAdminMeta(OPENID)
  if (!isAdmin) return { success: false, error: 'UNAUTHORIZED', message: '无管理员权限' }

  const action = String(event.action || 'list').trim().toLowerCase()
  const requestedCityId = String(event.cityId || adminCityId || DEFAULT_CITY_ID).trim() || DEFAULT_CITY_ID
  const cityId = requestedCityId

  if (adminRole === 'cityAdmin' && cityId !== adminCityId) {
    return { success: false, error: 'CITY_SCOPE_DENIED', message: '无该城市权限' }
  }

  const collection = resolveCollectionName()

  if (action === 'list') {
    const themes = await listThemes(cityId)
    return {
      success: true,
      cityId,
      collection,
      themes,
      total: themes.length,
    }
  }

  if (action === 'upsert') {
    const themeId = String(event.themeId || '').trim()
    const shortName = normalizeShortName(event.shortName || event.themeShortName || '')
    const intro = normalizeIntro(event.intro || '')
    const startDayKey = safeDayKey(event.startDayKey)
    const endDayKey = safeDayKey(event.endDayKey)
    const locationKeywords = normalizeLocationKeywords(event.locationKeywords || [])
    if (!shortName) return { success: false, error: 'INVALID_SHORT_NAME', message: '请填写节庆短名' }
    if (!startDayKey || !endDayKey) return { success: false, error: 'INVALID_DATE_RANGE', message: '请填写有效起止日期（YYYY-MM-DD）' }
    if (compareDayKey(startDayKey, endDayKey) > 0) {
      return { success: false, error: 'INVALID_DATE_RANGE', message: '结束日期不能早于开始日期' }
    }

    const payload = {
      cityId,
      themeShortName: shortName,
      title: shortName,
      intro,
      startDayKey,
      endDayKey,
      locationKeywords,
      themeColor: '#0F766E',
      isActive: true,
      updatedAt: db.serverDate(),
      updatedBy: OPENID,
    }

    if (themeId) {
      const existing = await db.collection(collection).doc(themeId).get().catch(() => null)
      if (!existing?.data) return { success: false, error: 'NOT_FOUND', message: '节庆主题不存在' }
      if (adminRole === 'cityAdmin' && String(existing.data.cityId || '') !== adminCityId) {
        return { success: false, error: 'CITY_SCOPE_DENIED', message: '无该城市权限' }
      }
      await db.collection(collection).doc(themeId).update({ data: payload })
    } else {
      await db.collection(collection).add({
        data: {
          ...payload,
          createdAt: db.serverDate(),
          createdBy: OPENID,
        },
      })
    }

    const themes = await listThemes(cityId)
    return {
      success: true,
      cityId,
      collection,
      themes,
      total: themes.length,
      message: themeId ? '节庆主题已更新' : '节庆主题已新增',
    }
  }

  if (action === 'remove') {
    const themeId = String(event.themeId || '').trim()
    if (!themeId) return { success: false, error: 'INVALID_THEME_ID', message: '缺少节庆主题ID' }
    const existing = await db.collection(collection).doc(themeId).get().catch(() => null)
    if (!existing?.data) return { success: false, error: 'NOT_FOUND', message: '节庆主题不存在' }
    if (adminRole === 'cityAdmin' && String(existing.data.cityId || '') !== adminCityId) {
      return { success: false, error: 'CITY_SCOPE_DENIED', message: '无该城市权限' }
    }
    await db.collection(collection).doc(themeId).update({
      data: {
        isActive: false,
        updatedAt: db.serverDate(),
        updatedBy: OPENID,
      },
    })
    const themes = await listThemes(cityId)
    return {
      success: true,
      cityId,
      collection,
      themes,
      total: themes.length,
      message: '节庆主题已删除',
    }
  }

  return { success: false, error: 'INVALID_ACTION', message: '不支持的操作类型' }
}
