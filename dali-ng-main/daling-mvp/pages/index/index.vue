<template>
  <view class="page">
    <view v-if="showTopTipBar" class="tip-bar">
      <text class="tip-text">{{ topTipText }}</text>
      <text class="tip-btn" @tap="requestLocation">授权位置</text>
    </view>

    <view class="data-badge-wrap">
      <view class="data-badge" :class="`data-badge--${dataSourceBadge.type}`">
        <text class="data-badge-title">{{ dataSourceBadge.title }}</text>
        <text class="data-badge-desc">{{ dataSourceBadge.desc }}</text>
      </view>
    </view>

    <view class="calendar-entry" @tap="goCalendar">
      <text class="calendar-entry-title">官方活动日历</text>
      <text class="calendar-entry-sub">查看未来 14 天官方推荐活动 →</text>
    </view>

    <view class="filter-panel">
      <view class="search-row">
        <input
          v-model="searchKeyword"
          class="search-input"
          confirm-type="search"
          placeholder="搜索标题 / 地点 / 描述"
          @confirm="onSearchConfirm"
        />
        <text class="search-action" @tap="onSearchConfirm">搜索</text>
      </view>

      <view class="filter-dropdown-row">
        <view class="dropdown-btn" :class="{ 'dropdown-btn--active': categoryFilterId !== 'all' }" @tap="openCategoryFilter">
          <text class="dropdown-btn-text">{{ categoryFilterLabel }}</text>
          <text class="dropdown-btn-arrow">▾</text>
        </view>
        <view class="dropdown-btn" :class="{ 'dropdown-btn--active': !!distanceFilterId }" @tap="openDistanceFilter">
          <text class="dropdown-btn-text">{{ distanceFilterLabel }}</text>
          <text class="dropdown-btn-arrow">▾</text>
        </view>
        <view class="dropdown-btn" :class="{ 'dropdown-btn--active': dateFilterId !== 'all' }" @tap="openDateFilter">
          <text class="dropdown-btn-text">{{ dateFilterLabel }}</text>
          <text class="dropdown-btn-arrow">▾</text>
        </view>
        <view class="dropdown-btn" :class="{ 'dropdown-btn--active': statusFilterId !== 'all' }" @tap="openStatusFilter">
          <text class="dropdown-btn-text">{{ statusFilterLabel }}</text>
          <text class="dropdown-btn-arrow">▾</text>
        </view>
      </view>

      <text class="filter-hint">{{ filterHintText }}</text>
    </view>

    <view v-if="showDistributionCard" class="distribution-panel">
      <view class="distribution-head">
        <text class="distribution-title">附近活动分布可视化</text>
        <text class="distribution-sub">{{ distributionSubtitle }}</text>
      </view>

      <view class="distribution-section">
        <text class="distribution-label">距离分布</text>
        <view class="distribution-list">
          <view
            v-for="item in distanceDistribution"
            :key="`dist-${item.key}`"
            class="distribution-item"
          >
            <view class="distribution-item-top">
              <text class="distribution-item-name">{{ item.label }}</text>
              <text class="distribution-item-count">{{ item.count }}</text>
            </view>
            <view class="distribution-bar">
              <view class="distribution-bar-fill" :style="{ width: item.percent + '%' }" />
            </view>
          </view>
        </view>
      </view>

      <view class="distribution-section">
        <text class="distribution-label">类型分布（Top 6）</text>
        <view class="distribution-list">
          <view
            v-for="item in categoryDistribution"
            :key="`cat-${item.id}`"
            class="distribution-item"
          >
            <view class="distribution-item-top">
              <text class="distribution-item-name">{{ item.label }}</text>
              <text class="distribution-item-count">{{ item.count }}</text>
            </view>
            <view class="distribution-bar distribution-bar--cat">
              <view class="distribution-bar-fill distribution-bar-fill--cat" :style="{ width: item.percent + '%' }" />
            </view>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="list">
      <view v-if="loading" class="center-tip">
        <text>加载中...</text>
      </view>

      <template v-else>
        <ActivityCard
          v-for="item in displayActivities"
          :key="item._id"
          :activity="item"
          :userLat="locationStore.lat"
          :userLng="locationStore.lng"
          :serverTime="serverTime"
          @tap="onCardTap(item)"
        />

        <view v-if="displayActivities.length === 0" class="center-tip">
          <text class="empty-icon">👀</text>
          <text class="empty-text">{{ emptyText }}</text>
        </view>
      </template>
    </scroll-view>

    <view
      v-if="showBottomAuthBanner"
      class="auth-banner"
      @tap="requestLocation"
    >
      <text class="banner-text">📍 发现你附近正在发生的活动 →</text>
    </view>

    <view v-if="selectorVisible" class="selector-mask" @tap="closeFilterSelector">
      <view class="selector-sheet" @tap.stop="">
        <view class="selector-head">
          <text class="selector-title">{{ selectorTitle }}</text>
          <text class="selector-close" @tap="closeFilterSelector">取消</text>
        </view>
        <scroll-view scroll-y class="selector-list">
          <view
            v-for="opt in selectorOptions"
            :key="`${selectorType}-${opt.id}`"
            class="selector-item"
            :class="{ 'selector-item--active': opt.id === selectorValue }"
            @tap="handleSelectorChoose(opt)"
          >
            <text class="selector-item-label">{{ opt.label }}</text>
            <text v-if="opt.id === selectorValue" class="selector-item-check">✓</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <PrivacyPopup ref="privacyPopup" />
  </view>
</template>

<script>
import { useLocationStore } from '@/stores/location.js'
import { useUserStore } from '@/stores/user.js'
import { callCloud } from '@/utils/cloud.js'
import ActivityCard from '@/components/ActivityCard.vue'
import PrivacyPopup from '@/components/PrivacyPopup.vue'
import {
  DISCOVERY_CATEGORY_FILTER_OPTIONS,
  DISTANCE_FILTER_OPTIONS,
  getCategoryLabel,
} from '@/utils/activityMeta.js'

const DEFAULT_CENTER = {
  lat: 25.6065,
  lng: 100.2679,
}
const ONBOARDING_DEMO_SEEN_PREFIX = 'dali_onboarding_demo_seen_'
const COMMON_CATEGORY_ID_SET = new Set([
  'sport',
  'music',
  'reading',
  'game',
  'social',
  'outdoor',
  'food',
  'movie',
  'travel',
])

const MOCK_ACTIVITIES = [
  {
    _id: 'mock1',
    title: '茶话会 · 下午茶时光',
    description: '大家一起喝茶聊天，欢迎来玩',
    categoryId: 'social',
    categoryLabel: '社交',
    location: { address: '大理古城洱海边', lat: 25.6065, lng: 100.2679 },
    startTime: new Date(Date.now() + 30 * 60 * 1000),
    endTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    currentParticipants: 3,
    maxParticipants: 10,
    status: 'OPEN',
    isVerified: true,
    isRecommended: true,
    isGroupFormation: false,
    _distance: 800,
    _isMock: true,
  },
  {
    _id: 'mock2',
    title: '环洱海骑行',
    description: '一起骑行环洱海，约需3小时',
    categoryId: 'sport',
    categoryLabel: '运动',
    location: { address: '才村码头集合', lat: 25.62, lng: 100.21 },
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
    currentParticipants: 5,
    maxParticipants: 8,
    status: 'OPEN',
    isVerified: true,
    isRecommended: false,
    isGroupFormation: true,
    minParticipants: 3,
    formationStatus: 'CONFIRMED',
    _distance: 2200,
    _isMock: true,
  },
  {
    _id: 'mock3',
    title: '狼人杀 · 8人局',
    description: '今晚在青旅大堂，欢迎新手',
    categoryId: 'game',
    categoryLabel: '游戏',
    location: { address: '人民路某青旅', lat: 25.601, lng: 100.265 },
    startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 7 * 60 * 60 * 1000),
    currentParticipants: 2,
    maxParticipants: 8,
    status: 'OPEN',
    isVerified: false,
    isRecommended: false,
    isGroupFormation: true,
    minParticipants: 6,
    formationStatus: 'FORMING',
    formationDeadline: new Date(Date.now() + 30 * 60 * 1000),
    _distance: 1500,
    _isMock: true,
  },
]

export default {
  components: { ActivityCard, PrivacyPopup },

  setup() {
    const locationStore = useLocationStore()
    const userStore = useUserStore()
    return { locationStore, userStore }
  },

  data() {
    return {
      activities: [],
      loading: false,
      serverTime: Date.now(),
      isAdminViewer: false,
      adminRole: '',
      adminCheckedAt: 0,
      lastQueryMode: 'all', // all | nearby | mock
      onboardingMockActive: false,
      categoryFilterOptions: DISCOVERY_CATEGORY_FILTER_OPTIONS,
      distanceFilterOptions: DISTANCE_FILTER_OPTIONS,
      searchKeyword: '',
      appliedKeyword: '',
      categoryFilterId: 'all',
      distanceFilterId: '',
      dateFilterId: 'all',
      statusFilterId: 'all',
      selectorVisible: false,
      selectorType: '',
      selectorTitle: '',
      selectorValue: '',
      selectorOptions: [],
    }
  },

  computed: {
    baseActivities() {
      if (this.onboardingMockActive) return MOCK_ACTIVITIES
      return this.activities
    },

    displayActivities() {
      return this.filterActivities(this.baseActivities)
    },

    emptyText() {
      if (this.onboardingMockActive) return '点击任意示例活动，授权后即可看你附近 5km 内活动'
      if (this.lastQueryMode === 'nearby') return '附近暂无真实活动'
      return '当前暂无可展示活动'
    },

    showTopTipBar() {
      return !this.onboardingMockActive && this.locationStore.hasPermission === false
    },

    topTipText() {
      return '📍 未获取位置，当前展示全量活动'
    },

    showBottomAuthBanner() {
      return !this.onboardingMockActive && this.locationStore.hasPermission !== true
    },

    dataSourceBadge() {
      if (this.onboardingMockActive) {
        return {
          type: 'mock',
          title: '示例数据',
          desc: '首次登录默认示例活动',
        }
      }
      if (this.locationStore.hasPermission === true) {
        return {
          type: 'real',
          title: '真实数据',
          desc: this.distanceFilterId
            ? `已授权定位 · ${this.distanceFilterLabel}`
            : '已授权定位 · 默认从近到远',
        }
      }
      return {
        type: 'real-all',
        title: '真实数据',
        desc: '未授权定位 · 全量活动',
      }
    },

    filterHintText() {
      if (this.appliedKeyword) return `搜索模式：${this.appliedKeyword}`
      const bits = []
      if (this.categoryFilterId !== 'all') bits.push(this.categoryFilterLabel)
      if (this.distanceFilterId) bits.push(this.distanceFilterLabel)
      if (this.dateFilterId !== 'all') bits.push(this.dateFilterLabel)
      if (this.statusFilterId !== 'all') bits.push(this.statusFilterLabel)
      return bits.length ? `筛选模式：${bits.join(' · ')}` : '未设置搜索或筛选条件'
    },

    categoryFilterLabel() {
      if (this.categoryFilterId === 'all') return '分类'
      const item = this.categoryFilterOptions.find((opt) => opt.id === this.categoryFilterId)
      return item?.label || '分类'
    },

    distanceFilterLabel() {
      const item = this.distanceFilterOptions.find((opt) => opt.id === this.distanceFilterId)
      if (item) return item.label
      if (this.locationStore.hasPermission === true) return '从近到远'
      return '距离'
    },

    dateFilterOptions() {
      const baseMs = Number(this.serverTime || Date.now())
      const list = [
        { id: 'all', label: '全部日期' },
        { id: 'today', label: '今天' },
        { id: 'tomorrow', label: '明天' },
      ]
      for (let i = 2; i <= 6; i += 1) {
        const targetMs = baseMs + i * 24 * 60 * 60 * 1000
        const dateKey = this.toChinaDateKey(targetMs)
        list.push({
          id: `date_${dateKey}`,
          label: this.formatDateLabel(targetMs),
        })
      }
      return list
    },

    dateFilterLabel() {
      if (this.dateFilterId === 'all') return '日期'
      const item = this.dateFilterOptions.find((opt) => opt.id === this.dateFilterId)
      return item?.label || '日期'
    },

    statusFilterOptions() {
      return [
        { id: 'all', label: '全部状态' },
        { id: 'imminent', label: '即将开始' },
        { id: 'formed', label: '已成团' },
        { id: 'recruiting', label: '招募中' },
        { id: 'latest', label: '最新发布' },
      ]
    },

    statusFilterLabel() {
      if (this.statusFilterId === 'all') return '状态'
      const item = this.statusFilterOptions.find((opt) => opt.id === this.statusFilterId)
      return item?.label || '状态'
    },

    showDistributionCard() {
      return this.isAdminViewer && !this.onboardingMockActive && this.activities.length > 0
    },

    distributionSubtitle() {
      const source = this.locationStore.hasPermission === true ? '已授权定位' : '未授权全量'
      return `${source} · 共 ${this.activities.length} 条`
    },

    distanceDistribution() {
      const buckets = [
        { key: '0-1', label: '0-1km', min: 0, max: 1000, count: 0 },
        { key: '1-3', label: '1-3km', min: 1000, max: 3000, count: 0 },
        { key: '3-5', label: '3-5km', min: 3000, max: 5000, count: 0 },
        { key: '5-10', label: '5-10km', min: 5000, max: 10000, count: 0 },
        { key: '10+', label: '10km+', min: 10000, max: Number.POSITIVE_INFINITY, count: 0 },
      ]
      ;(this.activities || []).forEach((item) => {
        const d = Number(item?._distance)
        if (!Number.isFinite(d) || d < 0) return
        const hit = buckets.find((bucket) => d >= bucket.min && d < bucket.max)
        if (hit) hit.count += 1
      })
      const maxCount = Math.max(...buckets.map((item) => item.count), 1)
      return buckets.map((item) => ({
        ...item,
        percent: Math.max(8, Math.round((item.count / maxCount) * 100)),
      }))
    },

    categoryDistribution() {
      const counter = {}
      ;(this.activities || []).forEach((item) => {
        const categoryId = item?.categoryId || 'other'
        const categoryLabel = item?.categoryLabel || getCategoryLabel(categoryId)
        const current = counter[categoryId] || { id: categoryId, label: categoryLabel, count: 0 }
        current.count += 1
        counter[categoryId] = current
      })
      const list = Object.values(counter).sort((a, b) => b.count - a.count).slice(0, 6)
      const maxCount = Math.max(...list.map((item) => item.count), 1)
      return list.map((item) => ({
        ...item,
        percent: Math.max(8, Math.round((item.count / maxCount) * 100)),
      }))
    },

    currentDistanceScopeLabel() {
      const scope = this.getDistanceScopeConfig(this.lastQueryMode)
      const meters = Number(scope.radius || 0)
      if (!Number.isFinite(meters) || meters <= 0) return '--'
      if (meters >= 1000) return `${Math.round(meters / 1000)}km`
      return `${meters}m`
    },
  },

  onLoad() {
    uni.$on('showPrivacyPopup', () => {
      this.$refs.privacyPopup && this.$refs.privacyPopup.authorize()
    })
  },

  onUnload() {
    uni.$off('showPrivacyPopup')
  },

  async onShow() {
    await this.ensureAdminVisibility()
    await this.initAndLoad()
  },

  methods: {
    goCalendar() {
      uni.navigateTo({ url: '/pages/calendar/index' })
    },

    toChinaDateKey(input = Date.now()) {
      const ms = new Date(input).getTime()
      if (!Number.isFinite(ms)) return ''
      const chinaMs = ms + 8 * 60 * 60 * 1000
      const date = new Date(chinaMs)
      const y = date.getUTCFullYear()
      const m = `${date.getUTCMonth() + 1}`.padStart(2, '0')
      const d = `${date.getUTCDate()}`.padStart(2, '0')
      return `${y}-${m}-${d}`
    },

    formatDateLabel(input) {
      const ms = new Date(input).getTime()
      const date = new Date(ms)
      const weekMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `${date.getMonth() + 1}/${date.getDate()} ${weekMap[date.getDay()]}`
    },

    getOnboardingStorageKey() {
      const openid = getApp().globalData?.openid || this.userStore.openid || 'anonymous'
      return `${ONBOARDING_DEMO_SEEN_PREFIX}${openid}`
    },

    shouldUseOnboardingDemo() {
      const gd = getApp().globalData || {}
      const isNewUser = !!gd.isNewUser
      if (!isNewUser) return false
      const seen = uni.getStorageSync(this.getOnboardingStorageKey())
      return !seen
    },

    markOnboardingDemoSeen() {
      uni.setStorageSync(this.getOnboardingStorageKey(), true)
      const gd = getApp().globalData || {}
      gd.isNewUser = false
    },

    async initAndLoad() {
      this.onboardingMockActive = this.shouldUseOnboardingDemo()
      if (this.onboardingMockActive) {
        this.lastQueryMode = 'mock'
        this.activities = []
        this.loading = false
        return
      }

      await this.locationStore.refreshLocation()
      await this.loadActivitiesAll()
    },

    clearSearch() {
      this.searchKeyword = ''
      this.appliedKeyword = ''
    },

    clearFiltersToDefault() {
      this.categoryFilterId = 'all'
      this.distanceFilterId = ''
      this.dateFilterId = 'all'
      this.statusFilterId = 'all'
    },

    getDistanceScopeConfig(mode = this.lastQueryMode) {
      const selected = this.distanceFilterOptions.find((item) => item.id === this.distanceFilterId)
      if (selected) {
        if (selected.type === 'sort') {
          return { radius: 2000000, sortBy: selected.sortBy || 'default' }
        }
        return { radius: Number(selected.radius || 5000), sortBy: 'default' }
      }
      if (this.locationStore.hasPermission === true) {
        return { radius: 2000000, sortBy: 'distance_asc' }
      }
      return { radius: 2000000, sortBy: 'default' }
    },

    isRealCategoryFilter(categoryId = '') {
      return !!COMMON_CATEGORY_ID_SET.has(String(categoryId || ''))
    },

    buildQueryParams({ mode, lat, lng }) {
      const scope = this.getDistanceScopeConfig(mode)
      const useSearch = !!this.appliedKeyword
      const queryCategoryId = (!useSearch && this.isRealCategoryFilter(this.categoryFilterId))
        ? this.categoryFilterId
        : 'all'
      const queryKeyword = useSearch ? this.appliedKeyword : ''

      return {
        cityId: 'dali',
        lat,
        lng,
        queryMode: 'all',
        radius: Number(scope.radius || 5000),
        sortBy: scope.sortBy || 'default',
        categoryId: queryCategoryId,
        keyword: queryKeyword,
        limit: 500,
      }
    },

    normalizeActivityCategory(item) {
      const categoryId = item?.categoryId || 'other'
      return {
        ...item,
        categoryId,
        categoryLabel: item?.categoryLabel || getCategoryLabel(categoryId),
      }
    },

    isHotActivity(item = {}) {
      if (item.isRecommended) return true
      const current = Number(item.currentParticipants || 0)
      const max = Number(item.maxParticipants || 0)
      if (current >= 6) return true
      if (max > 0 && current / max >= 0.6) return true
      return false
    },

    isOngoing(item = {}, nowMs = Number(this.serverTime || Date.now())) {
      const startMs = new Date(item.startTime).getTime()
      const endMs = new Date(item.endTime).getTime()
      return Number.isFinite(startMs) && Number.isFinite(endMs) && nowMs >= startMs && nowMs < endMs
    },

    applySearchFilter(list = []) {
      const keyword = String(this.appliedKeyword || '').trim().toLowerCase()
      if (!keyword) return list
      return list.filter((item) => {
        const haystack = [
          item.title,
          item.description,
          item.location?.address,
          item.categoryLabel,
          item.publisherNickname,
        ].filter(Boolean).join(' ').toLowerCase()
        return haystack.includes(keyword)
      })
    },

    applyCategoryFilter(list = []) {
      const selected = this.categoryFilterId
      if (selected === 'all') return list
      if (selected === 'official') {
        return list.filter((item) => !!item.isRecommended)
      }
      if (selected === 'hot') {
        return list.filter((item) => this.isHotActivity(item))
      }
      if (selected === 'other') {
        return list.filter((item) => {
          const cid = String(item.categoryId || 'other')
          return cid === 'other' || !COMMON_CATEGORY_ID_SET.has(cid)
        })
      }
      return list.filter((item) => String(item.categoryId || 'other') === selected)
    },

    applyDistanceFilter(list = []) {
      const option = this.distanceFilterOptions.find((item) => item.id === this.distanceFilterId)
      if (!option || option.type !== 'radius') return list
      const radius = Number(option.radius || 0)
      return list.filter((item) => Number.isFinite(Number(item._distance)) && Number(item._distance) <= radius)
    },

    applyDateFilter(list = []) {
      const selected = this.dateFilterId
      if (selected === 'all') return list
      const todayKey = this.toChinaDateKey(this.serverTime)
      let targetKey = ''
      if (selected === 'today') {
        targetKey = todayKey
      } else if (selected === 'tomorrow') {
        targetKey = this.toChinaDateKey(Number(this.serverTime) + 24 * 60 * 60 * 1000)
      } else if (selected.startsWith('date_')) {
        targetKey = selected.replace('date_', '')
      }
      if (!targetKey) return list
      return list.filter((item) => this.toChinaDateKey(item.startTime) === targetKey)
    },

    applyStatusFilter(list = []) {
      const selected = this.statusFilterId
      if (selected === 'all') return list
      const nowMs = Number(this.serverTime || Date.now())
      if (selected === 'imminent') {
        return list.filter((item) => {
          const startMs = new Date(item.startTime).getTime()
          return Number.isFinite(startMs) && startMs > nowMs && startMs - nowMs <= 60 * 60 * 1000
        })
      }
      if (selected === 'formed') {
        return list.filter((item) => !!item.isGroupFormation && String(item.formationStatus || '').toUpperCase() === 'CONFIRMED')
      }
      if (selected === 'recruiting') {
        return list.filter((item) => String(item.status || '').toUpperCase() === 'OPEN')
      }
      if (selected === 'latest') {
        return list.filter((item) => {
          const createdMs = new Date(item.createdAt).getTime()
          return Number.isFinite(createdMs) && nowMs - createdMs <= 60 * 60 * 1000
        })
      }
      return list
    },

    applySorting(list = []) {
      const distanceOpt = this.distanceFilterOptions.find((item) => item.id === this.distanceFilterId)
      if (distanceOpt && distanceOpt.type === 'sort') {
        const isAsc = distanceOpt.sortBy === 'distance_asc'
        return [...list].sort((a, b) => {
          const ad = Number.isFinite(Number(a._distance)) ? Number(a._distance) : Number.POSITIVE_INFINITY
          const bd = Number.isFinite(Number(b._distance)) ? Number(b._distance) : Number.POSITIVE_INFINITY
          if (ad !== bd) return isAsc ? ad - bd : bd - ad
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        })
      }

      // 已授权定位时，默认按距离从近到远（即使未手动选择“距离”筛选）
      if (this.locationStore.hasPermission === true) {
        return [...list].sort((a, b) => {
          const ad = Number.isFinite(Number(a._distance)) ? Number(a._distance) : Number.POSITIVE_INFINITY
          const bd = Number.isFinite(Number(b._distance)) ? Number(b._distance) : Number.POSITIVE_INFINITY
          if (ad !== bd) return ad - bd
          const startDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
          if (startDiff !== 0) return startDiff
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
      }

      const nowMs = Number(this.serverTime || Date.now())
      return [...list].sort((a, b) => {
        const aRecommended = !!a.isRecommended
        const bRecommended = !!b.isRecommended
        if (aRecommended !== bRecommended) return aRecommended ? -1 : 1

        const aOngoing = this.isOngoing(a, nowMs)
        const bOngoing = this.isOngoing(b, nowMs)
        if (aOngoing !== bOngoing) return aOngoing ? -1 : 1

        const startDiff = new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        if (startDiff !== 0) return startDiff

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    },

    filterActivities(list = []) {
      let result = (list || []).map((item) => this.normalizeActivityCategory(item))

      if (this.appliedKeyword) {
        result = this.applySearchFilter(result)
      } else {
        result = this.applyCategoryFilter(result)
        result = this.applyDistanceFilter(result)
        result = this.applyDateFilter(result)
        result = this.applyStatusFilter(result)
      }

      return this.applySorting(result)
    },

    async ensureAdminVisibility(force = false) {
      const now = Date.now()
      if (!force && this.adminCheckedAt && now - this.adminCheckedAt < 5 * 60 * 1000) {
        return this.isAdminViewer
      }
      try {
        const res = await callCloud('checkAdmin')
        this.isAdminViewer = !!(res && res.success && res.isAdmin)
        this.adminRole = res?.adminRole || ''
      } catch (e) {
        this.isAdminViewer = false
        this.adminRole = ''
      } finally {
        this.adminCheckedAt = now
      }
      return this.isAdminViewer
    },

    async reloadActivitiesByContext() {
      if (this.onboardingMockActive) return
      await this.loadActivitiesAll()
    },

    async onSearchConfirm() {
      this.appliedKeyword = String(this.searchKeyword || '').trim()
      this.clearFiltersToDefault()
      await this.reloadActivitiesByContext()
    },

    clearSearchForFilterMode() {
      if (this.appliedKeyword || this.searchKeyword) {
        this.clearSearch()
      }
    },

    openFilterSelector({ type = '', title = '', value = '', options = [] } = {}) {
      this.selectorType = type
      this.selectorTitle = title
      this.selectorValue = value
      this.selectorOptions = Array.isArray(options) ? options : []
      this.selectorVisible = true
    },

    closeFilterSelector() {
      this.selectorVisible = false
      this.selectorType = ''
      this.selectorTitle = ''
      this.selectorValue = ''
      this.selectorOptions = []
    },

    async handleSelectorChoose(option) {
      if (!option || !this.selectorType) return
      this.clearSearchForFilterMode()
      if (this.selectorType === 'category') this.categoryFilterId = option.id
      if (this.selectorType === 'distance') this.distanceFilterId = option.id
      if (this.selectorType === 'date') this.dateFilterId = option.id
      if (this.selectorType === 'status') this.statusFilterId = option.id
      this.selectorValue = option.id
      this.closeFilterSelector()
      await this.reloadActivitiesByContext()
    },

    openCategoryFilter() {
      this.openFilterSelector({
        type: 'category',
        title: '分类',
        value: this.categoryFilterId,
        options: this.categoryFilterOptions,
      })
    },

    async ensureLocationForDistanceFilter() {
      if (this.locationStore.hasPermission === true) return true

      const res = await new Promise((resolve) => {
        uni.showModal({
          title: '距离筛选需要定位授权',
          content: '开启位置权限后，才能按距离筛选和排序活动。',
          confirmText: '去授权',
          cancelText: '取消',
          success: (ret) => resolve(ret),
          fail: () => resolve({ confirm: false }),
        })
      })
      if (!res?.confirm) return false
      const ok = await this.requestLocation({ fromDistanceFilter: true })
      return !!ok
    },

    async openDistanceFilter() {
      const canUseDistance = await this.ensureLocationForDistanceFilter()
      if (!canUseDistance) return
      this.openFilterSelector({
        type: 'distance',
        title: '距离',
        value: this.distanceFilterId,
        options: this.distanceFilterOptions,
      })
    },

    openDateFilter() {
      this.openFilterSelector({
        type: 'date',
        title: '日期',
        value: this.dateFilterId,
        options: this.dateFilterOptions,
      })
    },

    openStatusFilter() {
      this.openFilterSelector({
        type: 'status',
        title: '状态',
        value: this.statusFilterId,
        options: this.statusFilterOptions,
      })
    },

    async requestLocation(options = {}) {
      const ok = await this.locationStore.refreshLocation({ interactive: true, force: true })
      if (ok) {
        if (this.onboardingMockActive) {
          this.markOnboardingDemoSeen()
          this.onboardingMockActive = false
        }
        await this.loadActivitiesAll()
        return true
      }

      if (this.onboardingMockActive) {
        this.markOnboardingDemoSeen()
        this.onboardingMockActive = false
        this.distanceFilterId = ''
        await this.loadActivitiesAll()
      }

      const msg = this.locationStore.lastErrorCode === 'FUZZY_API_PENDING'
        ? '定位能力暂不可用，请稍后重试'
        : this.locationStore.lastErrorCode === 'LOCATION_DENIED'
          ? '你已拒绝定位授权，已为你展示全量活动'
          : this.locationStore.lastErrorCode === 'PRIVACY_DENIED'
            ? '你未同意隐私授权，已为你展示全量活动'
            : '获取位置失败，已为你展示全量活动'
      uni.showToast({ title: msg, icon: 'none', duration: 2500 })

      if (this.locationStore.lastErrorCode === 'LOCATION_DENIED') {
        uni.showModal({
          title: '需要定位权限',
          content: '请在设置页开启位置权限后重试',
          confirmText: '去设置',
          success: (res) => {
            if (res.confirm && typeof wx !== 'undefined' && wx.openSetting) {
              wx.openSetting({ withSubscriptions: false })
            }
          },
        })
      }
      return false
    },

    async loadActivitiesAll() {
      this.loading = true
      this.lastQueryMode = 'all'
      try {
        const latForQuery = this.locationStore.hasPermission === true && Number.isFinite(Number(this.locationStore.lat))
          ? Number(this.locationStore.lat)
          : DEFAULT_CENTER.lat
        const lngForQuery = this.locationStore.hasPermission === true && Number.isFinite(Number(this.locationStore.lng))
          ? Number(this.locationStore.lng)
          : DEFAULT_CENTER.lng
        const res = await callCloud('getActivityList', this.buildQueryParams({
          mode: 'all',
          lat: latForQuery,
          lng: lngForQuery,
        }))
        this.activities = Array.isArray(res?.activities) ? res.activities : []
        this.serverTime = Number(res?.serverTime || Date.now())
      } catch (e) {
        console.error('加载全量活动失败', e)
        this.activities = []
      } finally {
        this.loading = false
      }
    },

    async loadActivitiesNearby() {
      if (!this.locationStore.lat || !this.locationStore.lng) return
      this.loading = true
      this.lastQueryMode = 'nearby'
      try {
        const res = await callCloud('getActivityList', this.buildQueryParams({
          mode: 'nearby',
          lat: this.locationStore.lat,
          lng: this.locationStore.lng,
        }))
        this.activities = Array.isArray(res?.activities) ? res.activities : []
        this.serverTime = Number(res?.serverTime || Date.now())
      } catch (e) {
        console.error('加载附近活动失败', e)
        uni.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    onCardTap(item) {
      if (this.onboardingMockActive || item?._isMock) {
        this.requestLocation({ fromMockCard: true })
        return
      }
      uni.navigateTo({ url: `/pages/detail/index?id=${item._id}` })
    },
  },
}
</script>

<style>
.page {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  padding-bottom: 120rpx;
}

.tip-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  background: #fff3cd;
}

.tip-text {
  font-size: 26rpx;
  color: #856404;
}

.tip-btn {
  font-size: 26rpx;
  color: #2e75b6;
  font-weight: bold;
  padding: 8rpx 20rpx;
}

.data-badge-wrap {
  display: flex;
  justify-content: flex-end;
  padding: 16rpx 16rpx 0;
}

.data-badge {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
  padding: 10rpx 14rpx;
  border-radius: 14rpx;
}

.data-badge-title {
  font-size: 22rpx;
  font-weight: 700;
  line-height: 1;
}

.data-badge-desc {
  font-size: 20rpx;
  line-height: 1.2;
}

.data-badge--mock {
  background: #fff4e5;
}

.data-badge--mock .data-badge-title,
.data-badge--mock .data-badge-desc {
  color: #a15a00;
}

.data-badge--real {
  background: #e8f8ef;
}

.data-badge--real .data-badge-title,
.data-badge--real .data-badge-desc {
  color: #1f7a45;
}

.data-badge--real-all {
  background: #edf4ff;
}

.data-badge--real-all .data-badge-title,
.data-badge--real-all .data-badge-desc {
  color: #295fa6;
}

.calendar-entry {
  margin: 10rpx 16rpx 8rpx;
  padding: 16rpx 18rpx;
  border-radius: 14rpx;
  background: linear-gradient(135deg, #1a3c5e, #335e84);
  color: #fff;
}

.calendar-entry-title {
  font-size: 28rpx;
  font-weight: 700;
  display: block;
}

.calendar-entry-sub {
  margin-top: 6rpx;
  display: block;
  font-size: 22rpx;
  opacity: 0.9;
}

.filter-panel {
  background: #fff;
  margin: 0 16rpx 8rpx;
  border-radius: 14rpx;
  padding: 18rpx;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.search-input {
  flex: 1;
  height: 68rpx;
  border-radius: 34rpx;
  background: #f4f6f8;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #333;
}

.search-action {
  min-width: 90rpx;
  text-align: center;
  font-size: 26rpx;
  color: #1a3c5e;
  font-weight: 700;
}

.filter-dropdown-row {
  margin-top: 16rpx;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10rpx;
}

.dropdown-btn {
  min-height: 64rpx;
  border-radius: 12rpx;
  background: #f5f7fa;
  border: 1rpx solid #e6ebf2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12rpx;
}

.dropdown-btn--active {
  background: #edf4ff;
  border-color: #c7dcff;
}

.dropdown-btn-text {
  font-size: 22rpx;
  color: #1f2937;
  max-width: 120rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-btn-arrow {
  font-size: 20rpx;
  color: #667085;
}

.filter-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #667085;
}

.distribution-panel {
  background: #fff;
  margin: 0 16rpx 10rpx;
  border-radius: 14rpx;
  padding: 18rpx;
}

.distribution-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12rpx;
}

.distribution-title {
  font-size: 28rpx;
  color: #1a3c5e;
  font-weight: 700;
}

.distribution-sub {
  font-size: 20rpx;
  color: #667085;
}

.distribution-section {
  margin-top: 16rpx;
}

.distribution-label {
  display: block;
  font-size: 22rpx;
  color: #475467;
  margin-bottom: 10rpx;
}

.distribution-list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.distribution-item-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.distribution-item-name {
  font-size: 22rpx;
  color: #344054;
}

.distribution-item-count {
  font-size: 22rpx;
  color: #667085;
}

.distribution-bar {
  margin-top: 6rpx;
  height: 12rpx;
  border-radius: 999rpx;
  background: #e9eef5;
  overflow: hidden;
}

.distribution-bar-fill {
  height: 100%;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #2e75b6 0%, #1a3c5e 100%);
}

.distribution-bar--cat {
  background: #edf7f1;
}

.distribution-bar-fill--cat {
  background: linear-gradient(90deg, #39a169 0%, #1f7a45 100%);
}

.list {
  flex: 1;
  padding: 16rpx;
  box-sizing: border-box;
}

.center-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
  gap: 20rpx;
}

.empty-icon {
  font-size: 80rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
  text-align: center;
}

.auth-banner {
  position: fixed;
  bottom: 40rpx;
  left: 32rpx;
  right: 32rpx;
  background: #1a3c5e;
  border-radius: 16rpx;
  padding: 32rpx;
  text-align: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.2);
}

.banner-text {
  color: #fff;
  font-size: 30rpx;
  font-weight: bold;
}

.selector-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 999;
  display: flex;
  align-items: flex-end;
}

.selector-sheet {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 20rpx 20rpx calc(env(safe-area-inset-bottom) + 20rpx);
  max-height: 70vh;
  box-sizing: border-box;
}

.selector-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6rpx 8rpx 14rpx;
  border-bottom: 1rpx solid #f0f2f5;
}

.selector-title {
  font-size: 30rpx;
  color: #1f2937;
  font-weight: 700;
}

.selector-close {
  font-size: 26rpx;
  color: #667085;
}

.selector-list {
  max-height: 52vh;
}

.selector-item {
  min-height: 88rpx;
  border-bottom: 1rpx solid #f6f7f9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10rpx;
}

.selector-item--active .selector-item-label {
  color: #1a3c5e;
  font-weight: 700;
}

.selector-item-label {
  font-size: 28rpx;
  color: #1f2937;
}

.selector-item-check {
  font-size: 28rpx;
  color: #1a3c5e;
  font-weight: 700;
}
</style>
