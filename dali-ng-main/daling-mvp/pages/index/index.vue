<template>
  <view class="page">

    <!-- 顶部：位置授权失败时的提示条 -->
    <view v-if="locationStore.hasPermission === false" class="tip-bar">
      <text class="tip-text">{{ topTipText }}</text>
      <text class="tip-btn" @tap="requestLocation">授权位置</text>
    </view>

    <!-- 数据来源小角标 -->
    <view class="data-badge-wrap">
      <view class="data-badge" :class="`data-badge--${dataSourceBadge.type}`">
        <text class="data-badge-title">{{ dataSourceBadge.title }}</text>
        <text class="data-badge-desc">{{ dataSourceBadge.desc }}</text>
      </view>
    </view>

    <!-- 搜索与筛选 -->
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

      <scroll-view scroll-x class="category-scroll" show-scrollbar="false">
        <view class="category-list">
          <text
            v-for="item in categoryOptions"
            :key="`cat-${item.id}`"
            class="category-chip"
            :class="{ 'category-chip--active': selectedCategoryId === item.id }"
            @tap="onCategoryChange(item.id)"
          >{{ item.label }}</text>
        </view>
      </scroll-view>

      <view class="filter-row">
        <view class="distance-block">
          <text class="filter-label">距离</text>
          <picker
            mode="selector"
            :range="distancePickerRange"
            :value="distanceIndex"
            @change="onDistanceChange"
          >
            <view class="distance-picker">{{ currentDistanceLabel }} <text class="picker-arrow">›</text></view>
          </picker>
        </view>
        <text class="filter-hint">{{ filterHintText }}</text>
      </view>
    </view>

    <!-- 活动列表 -->
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
          <text class="empty-text">附近暂时没有活动</text>
        </view>
      </template>

    </scroll-view>

    <!-- 底部：未授权时的引导Banner -->
    <view
      v-if="locationStore.hasPermission === null"
      class="auth-banner"
      @tap="requestLocation"
    >
      <text class="banner-text">📍 发现你附近正在发生的活动 →</text>
    </view>
	<!-- 隐私弹窗 -->
	<PrivacyPopup ref="privacyPopup" />

  </view>
</template>

<script>
import { useLocationStore } from '@/stores/location.js'
import { useUserStore }     from '@/stores/user.js'
import { callCloud }        from '@/utils/cloud.js'
import ActivityCard  from '@/components/ActivityCard.vue'
import PrivacyPopup  from '@/components/PrivacyPopup.vue'
import {
  ACTIVITY_CATEGORY_OPTIONS,
  DISTANCE_FILTER_OPTIONS,
  getCategoryLabel,
} from '@/utils/activityMeta.js'

// 小开关：当前位置5km查不到真实活动时，是否回退示例数据
// false: 不回退，直接显示“附近暂时没有活动”
// true: 回退示例数据
const NEARBY_EMPTY_USE_MOCK = false

// 3条示例数据（位置未授权时展示）
const MOCK_ACTIVITIES = [
  {
    _id: 'mock1',
    title: '茶话会 · 下午茶时光',
    description: '大家一起喝茶聊天，欢迎来玩',
    categoryId: 'social',
    categoryLabel: '社交',
    location: { address: '大理古城洱海边', lat: 25.6065, lng: 100.2679 },
    startTime: new Date(Date.now() + 30 * 60 * 1000),
    endTime:   new Date(Date.now() + 4 * 60 * 60 * 1000),
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
    location: { address: '才村码头集合', lat: 25.6200, lng: 100.2100 },
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    endTime:   new Date(Date.now() + 6 * 60 * 60 * 1000),
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
    location: { address: '人民路某青旅', lat: 25.6010, lng: 100.2650 },
    startTime: new Date(Date.now() + 4 * 60 * 60 * 1000),
    endTime:   new Date(Date.now() + 7 * 60 * 60 * 1000),
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
    const userStore     = useUserStore()
    return { locationStore, userStore }
  },

  data() {
    return {
      activities: [],
      loading: false,
      serverTime: Date.now(),
      lastQueryMode: 'default', // nearby: 当前位置5km, default: 默认坐标50km
      categoryOptions: ACTIVITY_CATEGORY_OPTIONS,
      selectedCategoryId: 'all',
      searchKeyword: '',
      appliedKeyword: '',
      distanceOptions: DISTANCE_FILTER_OPTIONS,
      distanceIndex: Math.max(0, DISTANCE_FILTER_OPTIONS.findIndex((item) => item.radius === 50000)),
      distanceTouched: false,
    }
  },

  computed: {
    baseActivities() {
      // 只要云端返回了数据就优先展示真实数据
      if (this.activities.length > 0) {
        return this.activities
      }

      // 当前位置5km查询为空时，可按开关决定是否展示示例数据
      if (this.lastQueryMode === 'nearby' && !NEARBY_EMPTY_USE_MOCK) {
        return []
      }

      return MOCK_ACTIVITIES
    },

    displayActivities() {
      return this.filterActivities(this.baseActivities)
    },

    dataSourceBadge() {
      if (this.lastQueryMode === 'nearby') {
        return {
          type: 'real',
          title: '真实数据',
          desc: `当前位置 ${this.currentDistanceLabel}`,
        }
      }

      if (this.activities.length === 0) {
        return {
          type: 'mock',
          title: '示例数据',
          desc: '当前展示内置示例活动',
        }
      }

      return {
        type: 'real-default',
        title: '真实数据',
        desc: `默认坐标 ${this.currentDistanceLabel}`,
      }
    },

    topTipText() {
      if (this.activities.length > 0) {
        return '📍 未获取位置，已按默认坐标展示活动'
      }
      return '📍 未获取位置，以下为示例活动'
    },

    distancePickerRange() {
      return this.distanceOptions.map((item) => item.label)
    },

    currentDistanceLabel() {
      return this.distanceOptions[this.distanceIndex]?.label || '5km'
    },

    selectedCategoryLabel() {
      return this.categoryOptions.find((item) => item.id === this.selectedCategoryId)?.label || '全部'
    },

    filterHintText() {
      const bits = []
      if (this.selectedCategoryId !== 'all') bits.push(this.selectedCategoryLabel)
      if (this.appliedKeyword) bits.push(`关键词:${this.appliedKeyword}`)
      return bits.length > 0 ? bits.join(' · ') : '未设置筛选条件'
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
    // #ifdef MP-WEIXIN
    wx.getSetting({
      success: async (settingRes) => {
        if (settingRes.authSetting['scope.userFuzzyLocation']) {
          try {
            const ok = await this.locationStore.refreshLocation()
            if (ok) {
              this.applyDefaultDistanceForMode('nearby')
              await this.loadActivities()
              return
            }
          } catch(e) {
            console.log('位置获取失败，使用默认坐标')
          }
        }
        // 无论有没有位置权限，都用默认坐标加载活动
        this.applyDefaultDistanceForMode('default')
        await this.loadActivitiesWithDefault()
      },
      fail: async () => {
        this.applyDefaultDistanceForMode('default')
        await this.loadActivitiesWithDefault()
      }
    })
    // #endif
  },



  methods: {
    getSelectedRadius() {
      return Number(this.distanceOptions[this.distanceIndex]?.radius) || 5000
    },

    applyDefaultDistanceForMode(mode) {
      if (this.distanceTouched) return
      const targetRadius = mode === 'nearby' ? 5000 : 50000
      const idx = this.distanceOptions.findIndex((item) => item.radius === targetRadius)
      if (idx >= 0) this.distanceIndex = idx
    },

    buildQueryParams(lat, lng) {
      return {
        lat,
        lng,
        radius: this.getSelectedRadius(),
        keyword: this.appliedKeyword,
        categoryId: this.selectedCategoryId,
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

    filterActivities(list = []) {
      const keyword = String(this.appliedKeyword || '').trim().toLowerCase()
      const selectedCategoryId = this.selectedCategoryId
      const radius = this.getSelectedRadius()

      return (list || [])
        .map((item) => this.normalizeActivityCategory(item))
        .filter((item) => {
          if (selectedCategoryId !== 'all' && item.categoryId !== selectedCategoryId) {
            return false
          }
          if (keyword) {
            const haystack = [
              item.title,
              item.description,
              item.location?.address,
              item.categoryLabel,
            ].filter(Boolean).join(' ').toLowerCase()
            if (!haystack.includes(keyword)) return false
          }
          if (Number.isFinite(Number(item._distance)) && Number(item._distance) > radius) {
            return false
          }
          return true
        })
    },

    async reloadActivities() {
      if (this.locationStore.hasPermission === true && this.locationStore.lat && this.locationStore.lng) {
        await this.loadActivities()
        return
      }
      await this.loadActivitiesWithDefault()
    },

    async onSearchConfirm() {
      this.appliedKeyword = String(this.searchKeyword || '').trim()
      await this.reloadActivities()
    },

    async onCategoryChange(categoryId) {
      if (this.selectedCategoryId === categoryId) return
      this.selectedCategoryId = categoryId
      await this.reloadActivities()
    },

    async onDistanceChange(e) {
      const idx = Number(e?.detail?.value || 0)
      this.distanceIndex = idx
      this.distanceTouched = true
      await this.reloadActivities()
    },

    // 用户点击授权Banner或提示条
    async requestLocation() {
      const ok = await this.locationStore.refreshLocation({ interactive: true, force: true })
      if (ok) {
        this.applyDefaultDistanceForMode('nearby')
        await this.loadActivities()
      } else {
        const msg = this.locationStore.lastErrorCode === 'FUZZY_API_PENDING'
          ? '地理位置接口审核中，先为你展示示例活动'
          : this.locationStore.lastErrorCode === 'LOCATION_DENIED'
            ? '你已拒绝定位授权，请到设置中开启'
            : '获取位置失败，请在设置中开启'
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
            }
          })
        }
      }
    },
	async loadActivitiesWithDefault() {
	  // 使用大理古城坐标作为默认位置
	  const defaultLat = 25.6065
	  const defaultLng = 100.2679
	  try {
	    this.loading = true
      this.lastQueryMode = 'default'
      const res = await callCloud('getActivityList', this.buildQueryParams(defaultLat, defaultLng))
      this.activities = Array.isArray(res?.activities) ? res.activities : []
      this.serverTime = res?.serverTime || Date.now()
	  } catch(e) {
	    console.error('加载活动失败', e)
	  } finally {
	    this.loading = false
	  }
	},

    // 从云端加载附近活动
    async loadActivities() {
      if (!this.locationStore.lat || !this.locationStore.lng) return
      this.loading = true
      try {
        this.lastQueryMode = 'nearby'
        const res = await callCloud('getActivityList', this.buildQueryParams(
          this.locationStore.lat,
          this.locationStore.lng
        ))
        this.activities  = res.activities  || []
        this.serverTime  = res.serverTime  || Date.now()
      } catch(e) {
        console.error('加载活动失败', e)
        uni.showToast({ title: '加载失败，请重试', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    onCardTap(item) {
      if (item._isMock) {
        // 示例卡片点击→引导授权
        this.requestLocation()
        return
      }
      uni.navigateTo({ url: `/pages/detail/index?id=${item._id}` })
    },
  }
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
  background: #FFF3CD;
}
.tip-text { font-size: 26rpx; color: #856404; }
.tip-btn  { font-size: 26rpx; color: #2E75B6; font-weight: bold; padding: 8rpx 20rpx; }

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

.data-badge--real-default {
  background: #edf4ff;
}

.data-badge--real-default .data-badge-title,
.data-badge--real-default .data-badge-desc {
  color: #295fa6;
}

.filter-panel {
  background: #fff;
  margin: 0 16rpx 8rpx;
  border-radius: 14rpx;
  padding: 18rpx 18rpx 16rpx;
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
  color: #1A3C5E;
  font-weight: 700;
}

.category-scroll {
  margin-top: 14rpx;
  white-space: nowrap;
}

.category-list {
  display: inline-flex;
  gap: 10rpx;
}

.category-chip {
  display: inline-block;
  padding: 8rpx 18rpx;
  border-radius: 20rpx;
  background: #f3f3f3;
  color: #666;
  font-size: 24rpx;
}

.category-chip--active {
  background: #1A3C5E;
  color: #fff;
}

.filter-row {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.distance-block {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.filter-label {
  font-size: 22rpx;
  color: #888;
}

.distance-picker {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  font-size: 24rpx;
  color: #1A3C5E;
  font-weight: 700;
}

.picker-arrow {
  font-size: 24rpx;
  color: #999;
}

.filter-hint {
  flex: 1;
  text-align: right;
  font-size: 22rpx;
  color: #999;
}

.list { flex: 1; padding: 16rpx; box-sizing: border-box; }

.center-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 40rpx;
  gap: 20rpx;
}
.empty-icon { font-size: 80rpx; }
.empty-text { font-size: 28rpx; color: #999; }

.auth-banner {
  position: fixed;
  bottom: 40rpx;
  left: 32rpx;
  right: 32rpx;
  background: #1A3C5E;
  border-radius: 16rpx;
  padding: 32rpx;
  text-align: center;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.2);
}
.banner-text { color: white; font-size: 30rpx; font-weight: bold; }
</style>
