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
    }
  },

  computed: {
    displayActivities() {
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

    dataSourceBadge() {
      if (this.lastQueryMode === 'nearby') {
        return {
          type: 'real',
          title: '真实数据',
          desc: '当前位置 5km',
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
        desc: '默认坐标 50km',
      }
    },

    topTipText() {
      if (this.activities.length > 0) {
        return '📍 未获取位置，已按默认坐标展示活动'
      }
      return '📍 未获取位置，以下为示例活动'
    }
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
              await this.loadActivities()
              return
            }
          } catch(e) {
            console.log('位置获取失败，使用默认坐标')
          }
        }
        // 无论有没有位置权限，都用默认坐标加载活动
        await this.loadActivitiesWithDefault()
      },
      fail: async () => {
        await this.loadActivitiesWithDefault()
      }
    })
    // #endif
  },



  methods: {
    // 用户点击授权Banner或提示条
    async requestLocation() {
      const ok = await this.locationStore.refreshLocation({ interactive: true, force: true })
      if (ok) {
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
	    const res = await callCloud('getActivityList', {
	      lat: defaultLat,
	      lng: defaultLng,
	      radius: 50000, // 50公里（云函数单位为米）
	    })
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
        const res = await callCloud('getActivityList', {
          lat: this.locationStore.lat,
          lng: this.locationStore.lng,
          radius: 5000,
        })
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

.list { height: calc(100vh - 0rpx); padding: 16rpx; box-sizing: border-box; }

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
