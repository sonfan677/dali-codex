<template>
  <view class="page">

    <view class="header">
      <text class="title">管理后台</text>
    </view>

    <!-- Tab -->
    <view class="tabs">
      <view
        class="tab"
        :class="{ 'tab--active': activeTab === 'verify' }"
        @tap="activeTab = 'verify'"
      >待审核认证 {{ pendingVerifyList.length > 0 ? '(' + pendingVerifyList.length + ')' : '' }}</view>
      <view
        class="tab"
        :class="{ 'tab--active': activeTab === 'reports' }"
        @tap="activeTab = 'reports'"
      >举报记录 {{ reportList.length > 0 ? '(' + reportList.length + ')' : '' }}</view>
      <view
        class="tab"
        :class="{ 'tab--active': activeTab === 'activities' }"
        @tap="activeTab = 'activities'"
      >活动管理</view>
    </view>

    <view v-if="!hasAccess" class="empty">
      <text class="empty-text">无管理员权限</text>
    </view>

    <!-- 加载中 -->
    <view v-else-if="loading" class="center-tip">
      <text>加载中...</text>
    </view>

    <view v-else class="content">

      <!-- 待审核认证 -->
      <template v-if="activeTab === 'verify'">
        <view v-if="pendingVerifyList.length === 0" class="empty">
          <text class="empty-text">暂无待审核认证</text>
        </view>
        <view
          v-for="item in pendingVerifyList"
          :key="item._id"
          class="card"
        >
          <view class="card-info">
            <image class="mini-avatar" :src="item.avatarUrl || '/static/default-avatar.png'" mode="aspectFill" />
            <view class="card-text">
              <text class="card-title">{{ item.nickname || '未知用户' }}</text>
              <text class="card-sub">申请实名认证</text>
              <text class="card-openid">{{ item._openid ? item._openid.slice(0,12) + '...' : '' }}</text>
            </view>
          </view>
          <view class="card-actions">
            <button class="action-btn action-btn--approve" @tap="verifyUser(item._openid, 'verify')">通过</button>
            <button class="action-btn action-btn--reject"  @tap="verifyUser(item._openid, 'reject_verify')">拒绝</button>
          </view>
        </view>
      </template>

      <!-- 举报记录 -->
      <template v-else-if="activeTab === 'reports'">
        <view v-if="reportList.length === 0" class="empty">
          <text class="empty-text">暂无举报记录</text>
        </view>
        <view
          v-for="item in reportList"
          :key="item._id"
          class="card"
        >
          <view class="card-info">
            <view class="card-text">
              <text class="card-title">活动举报 · {{ reportStatusText(item.reportStatus) }}</text>
              <text class="card-sub">原因：{{ item.reason }}</text>
              <text v-if="item.reporterNickname || item.reporterOpenid" class="card-sub">
                举报人：{{ item.reporterNickname || shortOpenid(item.reporterOpenid) }}
              </text>
              <text class="card-openid">活动ID: {{ item.targetId ? item.targetId.slice(0,12) + '...' : '' }}</text>
              <text v-if="item.reportStatus !== 'PENDING'" class="card-openid">
                处理结果：{{ handleActionText(item.handleAction) }}{{ item.handleNote ? '（' + item.handleNote + '）' : '' }}
              </text>
              <text class="card-openid">提交时间：{{ formatTime(item.createdAt) }}</text>
            </view>
          </view>
          <view v-if="item.reportStatus === 'PENDING'" class="card-actions">
            <button class="action-btn action-btn--approve" @tap="handleReport(item)">下架并处理</button>
            <button class="action-btn action-btn--reject"  @tap="ignoreReport(item)">忽略并处理</button>
          </view>
        </view>
      </template>

      <!-- 活动管理 -->
      <template v-else>
        <view v-if="activityList.length === 0" class="empty">
          <text class="empty-text">暂无活动</text>
        </view>
        <view
          v-for="item in activityList"
          :key="item._id"
          class="card"
        >
          <view class="card-info">
            <view class="card-text">
              <text class="card-title">{{ item.title }}</text>
              <text class="card-sub">{{ item.currentParticipants }}人参与 · {{ statusText(item.status) }}</text>
              <text class="card-openid">{{ item.location && item.location.address }}</text>
            </view>
          </view>
          <view class="card-actions">
            <button
              v-if="!item.isRecommended"
              class="action-btn action-btn--recommend"
              @tap="recommendActivity(item._id, 'recommend')"
            >推荐</button>
            <button
              v-else
              class="action-btn action-btn--unrecommend"
              @tap="recommendActivity(item._id, 'unrecommend')"
            >取消推荐</button>
            <button
              v-if="item.status !== 'CANCELLED'"
              class="action-btn action-btn--reject"
              @tap="hideActivity(item._id)"
            >下架</button>
          </view>
        </view>
      </template>

    </view>
  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'

export default {
  data() {
    return {
      activeTab: 'verify',
      loading: false,
      hasAccess: true,
      pendingVerifyList: [],
      reportList: [],
      activityList: [],
    }
  },

  async onShow() {
    await this.loadData()
  },

  methods: {
    async loadData() {
      this.loading = true
      try {
        const res = await callCloud('getAdminDashboard')
        if (!res || !res.success) {
          if (res && res.error === 'UNAUTHORIZED') {
            this.hasAccess = false
            uni.showToast({ title: '无管理员权限', icon: 'none' })
            setTimeout(() => uni.navigateBack(), 1200)
            return
          }
          throw new Error(res?.message || '加载失败')
        }
        this.hasAccess = true
        this.pendingVerifyList = res.pendingVerifyList || []
        this.reportList = res.reportList || []
        this.activityList = res.activityList || []
      } catch(e) {
        console.error('加载管理数据失败', e)
        uni.showToast({ title: '加载失败', icon: 'none' })
      } finally {
        this.loading = false
      }
    },

    // 审核认证
    async verifyUser(openid, action) {
      const actionText = action === 'verify' ? '通过认证' : '拒绝认证'
      uni.showModal({
        title: `确认${actionText}？`,
        editable: true,
        placeholderText: '填写操作原因（必填）',
        success: async (res) => {
          if (!res.confirm) return
          if (!res.content || res.content.trim().length < 2) {
            uni.showToast({ title: '请填写原因（至少2个字）', icon: 'none' })
            return
          }
          try {
            const result = await callCloud('adminAction', {
              action,
              targetId: openid,
              targetType: 'user',
              reason: res.content,
            })
            if (result.success) {
              uni.showToast({ title: result.message, icon: 'success' })
              // 从列表移除
              this.pendingVerifyList = this.pendingVerifyList.filter(u => u._openid !== openid)
            } else {
              uni.showToast({ title: result.message || '操作失败', icon: 'none' })
            }
          } catch(e) {
            uni.showToast({ title: '操作失败，请重试', icon: 'none' })
          }
        }
      })
    },

    // 处理举报：下架活动
    async handleReport(reportItem) {
      uni.showModal({
        title: '确认下架此活动？',
        editable: true,
        placeholderText: '填写下架原因（必填）',
        success: async (res) => {
          if (!res.confirm) return
          if (!res.content || res.content.trim().length < 2) {
            uni.showToast({ title: '请填写原因', icon: 'none' })
            return
          }
          try {
            const result = await callCloud('adminAction', {
              action: 'resolve_report_hide',
              reportId: reportItem._id,
              targetId: reportItem.targetId,
              targetType: 'report',
              reason: res.content,
            })
            if (result.success) {
              uni.showToast({ title: result.message || '举报已处理', icon: 'success' })
              await this.loadData()
            }
          } catch(e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },

    // 忽略举报
    async ignoreReport(reportItem) {
      uni.showModal({
        title: '确认忽略该举报？',
        editable: true,
        placeholderText: '填写忽略原因（必填）',
        success: async (res) => {
          if (!res.confirm) return
          if (!res.content || res.content.trim().length < 2) {
            uni.showToast({ title: '请填写原因', icon: 'none' })
            return
          }
          try {
            const result = await callCloud('adminAction', {
              action: 'resolve_report_ignore',
              reportId: reportItem._id,
              targetId: reportItem.targetId,
              targetType: 'report',
              reason: res.content,
            })
            if (result.success) {
              uni.showToast({ title: result.message || '举报已处理', icon: 'success' })
              await this.loadData()
            } else {
              uni.showToast({ title: result.message || '操作失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },

    // 推荐/取消推荐活动
    async recommendActivity(activityId, action) {
      const actionText = action === 'recommend' ? '设为官方推荐' : '取消官方推荐'
      uni.showModal({
        title: `确认${actionText}？`,
        editable: true,
        placeholderText: '填写操作原因（必填）',
        success: async (res) => {
          if (!res.confirm) return
          if (!res.content || res.content.trim().length < 2) {
            uni.showToast({ title: '请填写原因', icon: 'none' })
            return
          }
          try {
            const result = await callCloud('adminAction', {
              action,
              targetId: activityId,
              targetType: 'activity',
              reason: res.content,
            })
            if (result.success) {
              uni.showToast({ title: result.message, icon: 'success' })
              const idx = this.activityList.findIndex(a => a._id === activityId)
              if (idx !== -1) {
                this.activityList[idx].isRecommended = action === 'recommend'
              }
            }
          } catch(e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },

    // 下架活动
    async hideActivity(activityId) {
      uni.showModal({
        title: '确认下架此活动？',
        editable: true,
        placeholderText: '填写下架原因（必填）',
        success: async (res) => {
          if (!res.confirm) return
          if (!res.content || res.content.trim().length < 2) {
            uni.showToast({ title: '请填写原因', icon: 'none' })
            return
          }
          try {
            const result = await callCloud('adminAction', {
              action: 'hide',
              targetId: activityId,
              targetType: 'activity',
              reason: res.content,
            })
            if (result.success) {
              uni.showToast({ title: '活动已下架', icon: 'success' })
              this.activityList = this.activityList.filter(a => a._id !== activityId)
            }
          } catch(e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },

    statusText(status) {
      const map = { OPEN: '招募中', FULL: '已满员', ENDED: '已结束', CANCELLED: '已取消' }
      return map[status] || status
    },

    reportStatusText(status) {
      const map = {
        PENDING: '待处理',
        HANDLED: '已处理',
        IGNORED: '已忽略',
      }
      return map[status] || '待处理'
    },

    handleActionText(action) {
      const map = {
        HIDE_ACTIVITY: '已下架活动',
        IGNORE: '已忽略举报',
      }
      return map[action] || '已处理'
    },

    shortOpenid(openid) {
      if (!openid) return ''
      return openid.slice(0, 6) + '...'
    },

    formatTime(t) {
      if (!t) return '--'
      const d = new Date(t)
      if (Number.isNaN(d.getTime())) return '--'
      const mo = d.getMonth() + 1
      const day = d.getDate()
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      return `${mo}/${day} ${h}:${m}`
    },
  }
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; }

.header {
  background: #1A3C5E;
  padding: 48rpx 32rpx 32rpx;
}
.title { font-size: 40rpx; font-weight: bold; color: white; }

.tabs {
  display: flex; background: white;
  border-bottom: 1rpx solid #f0f0f0;
}
.tab {
  flex: 1; text-align: center;
  padding: 24rpx 0;
  font-size: 24rpx; color: #888;
}
.tab--active {
  color: #1A3C5E; font-weight: bold;
  border-bottom: 4rpx solid #1A3C5E;
}

.content { padding: 16rpx; }

.center-tip, .empty {
  display: flex; flex-direction: column;
  align-items: center; padding: 80rpx 40rpx;
}
.empty-text { font-size: 28rpx; color: #999; }

.card {
  background: white; border-radius: 12rpx;
  padding: 24rpx 28rpx; margin-bottom: 16rpx;
}
.card-info {
  display: flex; align-items: center;
  gap: 20rpx; margin-bottom: 20rpx;
}
.mini-avatar {
  width: 72rpx; height: 72rpx;
  border-radius: 50%; background: #eee; flex-shrink: 0;
}
.card-text { display: flex; flex-direction: column; gap: 6rpx; flex: 1; }
.card-title { font-size: 28rpx; font-weight: bold; color: #1a1a1a; }
.card-sub   { font-size: 24rpx; color: #666; }
.card-openid{ font-size: 22rpx; color: #bbb; }

.card-actions { display: flex; gap: 16rpx; }
.action-btn {
  flex: 1; height: 72rpx; border-radius: 12rpx;
  font-size: 26rpx; font-weight: bold; border: none;
}
.action-btn--approve    { background: #EEF7EE; color: #1E7145; }
.action-btn--reject     { background: #FFF0F0; color: #C00000; }
.action-btn--recommend  { background: #EEF4FB; color: #1A3C5E; }
.action-btn--unrecommend{ background: #f5f5f5; color: #888; }
</style>
