<template>
  <view class="page">

    <view class="header">
      <text class="title">管理后台</text>
      <text class="subtitle">{{ adminRoleLabel }} · {{ cityIdLabel }}</text>
    </view>

    <view v-if="hasAccess && !loading" class="summary-grid">
      <view class="summary-card">
        <text class="summary-value">{{ pendingVerifyList.length }}</text>
        <text class="summary-label">待审认证</text>
      </view>
      <view class="summary-card">
        <text class="summary-value">{{ pendingReportCount }}</text>
        <text class="summary-label">待处理举报</text>
      </view>
      <view class="summary-card">
        <text class="summary-value">{{ activeActivityCount }}</text>
        <text class="summary-label">活跃活动</text>
      </view>
      <view class="summary-card">
        <text class="summary-value">{{ actionLogList.length }}</text>
        <text class="summary-label">操作记录</text>
      </view>
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
      <view
        class="tab"
        :class="{ 'tab--active': activeTab === 'logs' }"
        @tap="activeTab = 'logs'"
      >操作记录</view>
    </view>

    <view v-if="!hasAccess" class="empty">
      <text class="empty-text">无管理员权限</text>
    </view>

    <!-- 加载中 -->
    <view v-else-if="loading" class="center-tip">
      <text>加载中...</text>
    </view>

    <view v-else class="content">

      <view class="toolbar">
        <input
          v-model="searchKeyword"
          class="search-input"
          :placeholder="searchPlaceholder"
          maxlength="30"
        />
      </view>

      <scroll-view
        v-if="filterOptions.length > 0"
        scroll-x
        class="chip-scroll"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in filterOptions"
            :key="item.value"
            class="chip"
            :class="{ 'chip--active': item.value === activeFilter }"
            @tap="activeFilter = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <!-- 待审核认证 -->
      <template v-if="activeTab === 'verify'">
        <view v-if="filteredPendingVerifyList.length === 0" class="empty">
          <text class="empty-text">暂无待审核认证</text>
        </view>
        <view
          v-for="item in filteredPendingVerifyList"
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
        <view v-if="filteredReportList.length === 0" class="empty">
          <text class="empty-text">暂无举报记录</text>
        </view>
        <view
          v-for="item in filteredReportList"
          :key="item._id"
          class="card"
        >
          <view class="card-info">
            <view class="card-text">
              <view class="title-row">
                <text class="card-title">活动举报</text>
                <text class="status-pill" :class="reportStatusClass(item.reportStatus)">{{ reportStatusText(item.reportStatus) }}</text>
              </view>
              <text class="card-sub">原因：{{ item.reason }}</text>
              <text v-if="item.reporterNickname || item.reporterOpenid" class="card-sub">
                举报人：{{ item.reporterNickname || shortOpenid(item.reporterOpenid) }}
              </text>
              <text class="card-openid">活动ID: {{ item.targetId ? item.targetId.slice(0,12) + '...' : '' }}</text>
              <text v-if="item.reportStatus !== 'PENDING'" class="card-openid">
                处理结果：{{ handleActionText(item.handleAction) }}{{ item.handleNote ? '（' + item.handleNote + '）' : '' }}
              </text>
              <text v-if="item.handledAt" class="card-openid">处理时间：{{ formatTime(item.handledAt) }}</text>
              <text class="card-openid">提交时间：{{ formatTime(item.createdAt) }}</text>
            </view>
          </view>
          <view v-if="item.targetActivity" class="activity-preview">
            <view class="title-row">
              <text class="preview-title">{{ item.targetActivity.title || '未命名活动' }}</text>
              <text class="status-pill" :class="activityStatusClass(item.targetActivity.status)">{{ statusText(item.targetActivity.status) }}</text>
            </view>
            <text v-if="item.targetActivity.location && item.targetActivity.location.address" class="preview-sub">
              地点：{{ item.targetActivity.location.address }}
            </text>
            <text class="preview-sub">
              参与人数：{{ item.targetActivity.currentParticipants || 0 }}{{ item.targetActivity.isRecommended ? ' · 官方推荐' : '' }}
            </text>
          </view>
          <view v-else class="activity-preview activity-preview--missing">
            <text class="preview-sub">关联活动不存在或已超出当前查询范围</text>
          </view>
          <view v-if="item.reportStatus === 'PENDING'" class="card-actions">
            <button class="action-btn action-btn--detail" @tap="goActivityDetail(item.targetId)">查看详情</button>
            <button class="action-btn action-btn--approve" @tap="handleReport(item)">下架并处理</button>
            <button class="action-btn action-btn--reject"  @tap="ignoreReport(item)">忽略并处理</button>
          </view>
          <view v-else class="card-actions">
            <button class="action-btn action-btn--detail" @tap="goActivityDetail(item.targetId)">查看详情</button>
          </view>
        </view>
      </template>

      <!-- 活动管理 -->
      <template v-else-if="activeTab === 'activities'">
        <view v-if="filteredActivityList.length === 0" class="empty">
          <text class="empty-text">暂无活动</text>
        </view>
        <view
          v-for="item in filteredActivityList"
          :key="item._id"
          class="card"
        >
          <view class="card-info">
            <view class="card-text">
              <view class="title-row">
                <text class="card-title">{{ item.title }}</text>
                <text class="status-pill" :class="activityStatusClass(item.status)">{{ statusText(item.status) }}</text>
              </view>
              <text class="card-sub">{{ item.currentParticipants }}人参与{{ item.isRecommended ? ' · 官方推荐' : '' }}</text>
              <text v-if="item.publisherNickname" class="card-sub">发布者：{{ item.publisherNickname }}</text>
              <text class="card-openid">{{ item.location && item.location.address }}</text>
              <text class="card-openid">活动ID: {{ item._id ? item._id.slice(0,12) + '...' : '' }}</text>
            </view>
          </view>
          <view class="card-actions">
            <button
              class="action-btn action-btn--detail"
              @tap="goActivityDetail(item._id)"
            >查看详情</button>
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

      <!-- 操作记录 -->
      <template v-else>
        <view v-if="filteredActionLogList.length === 0" class="empty">
          <text class="empty-text">暂无操作记录</text>
        </view>
        <view
          v-for="item in filteredActionLogList"
          :key="item._id"
          class="card"
        >
          <view class="card-text">
            <view class="title-row">
              <text class="card-title">{{ actionText(item.action) }}</text>
              <text class="status-pill status-pill--log">{{ targetTypeText(item.targetType) }}</text>
            </view>
            <text class="card-sub">结果：{{ item.result || '已执行' }}</text>
            <text class="card-sub">原因：{{ item.reason || '--' }}</text>
            <text class="card-openid">对象ID: {{ item.targetId ? item.targetId.slice(0,12) + '...' : '--' }}</text>
            <text class="card-openid">操作者: {{ item.adminRole || 'admin' }} · {{ shortOpenid(item.adminOpenid) }}</text>
            <text class="card-openid">时间：{{ formatTime(item.createdAt) }}</text>
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
      activeFilter: 'all',
      searchKeyword: '',
      loading: false,
      hasAccess: true,
      adminRole: '',
      cityId: '',
      pendingVerifyList: [],
      reportList: [],
      activityList: [],
      actionLogList: [],
    }
  },

  computed: {
    pendingReportCount() {
      return this.reportList.filter((item) => item.reportStatus === 'PENDING').length
    },

    activeActivityCount() {
      return this.activityList.filter((item) => ['OPEN', 'FULL'].includes(item.status)).length
    },

    adminRoleLabel() {
      return this.adminRole === 'cityAdmin' ? '城市管理员' : '超级管理员'
    },

    cityIdLabel() {
      return this.cityId ? `城市：${this.cityId}` : '城市：全部'
    },

    searchPlaceholder() {
      const map = {
        verify: '搜索昵称 / openid',
        reports: '搜索举报原因 / 举报人 / 活动ID',
        activities: '搜索标题 / 地址 / 发布者 / 活动ID',
        logs: '搜索原因 / 对象ID / 管理员',
      }
      return map[this.activeTab] || '搜索'
    },

    filterOptions() {
      if (this.activeTab === 'reports') {
        return [
          { label: '全部', value: 'all' },
          { label: '待处理', value: 'PENDING' },
          { label: '已处理', value: 'HANDLED' },
          { label: '已忽略', value: 'IGNORED' },
        ]
      }
      if (this.activeTab === 'activities') {
        return [
          { label: '全部', value: 'all' },
          { label: '招募中', value: 'OPEN' },
          { label: '已满员', value: 'FULL' },
          { label: '已结束', value: 'ENDED' },
          { label: '已取消', value: 'CANCELLED' },
          { label: '官方推荐', value: 'recommended' },
        ]
      }
      if (this.activeTab === 'logs') {
        return [
          { label: '全部', value: 'all' },
          { label: '活动操作', value: 'activity' },
          { label: '用户审核', value: 'user' },
          { label: '举报处理', value: 'report' },
        ]
      }
      return []
    },

    filteredPendingVerifyList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      if (!keyword) return this.pendingVerifyList
      return this.pendingVerifyList.filter((item) => this.matchAny(keyword, [
        item.nickname,
        item._openid,
      ]))
    },

    filteredReportList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      return this.reportList.filter((item) => {
        const statusMatch = this.activeFilter === 'all' || (item.reportStatus || 'PENDING') === this.activeFilter
        const keywordMatch = !keyword || this.matchAny(keyword, [
          item.reason,
          item.reporterNickname,
          item.reporterOpenid,
          item.targetId,
          item.handleNote,
          item.targetActivity?.title,
          item.targetActivity?.location?.address,
        ])
        return statusMatch && keywordMatch
      })
    },

    filteredActivityList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      return this.activityList.filter((item) => {
        const statusMatch = this.activeFilter === 'all'
          || (this.activeFilter === 'recommended' ? !!item.isRecommended : item.status === this.activeFilter)
        const keywordMatch = !keyword || this.matchAny(keyword, [
          item.title,
          item.location?.address,
          item.publisherNickname,
          item._id,
        ])
        return statusMatch && keywordMatch
      })
    },

    filteredActionLogList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      return this.actionLogList.filter((item) => {
        const targetMatch = this.activeFilter === 'all' || item.targetType === this.activeFilter
        const keywordMatch = !keyword || this.matchAny(keyword, [
          item.reason,
          item.result,
          item.targetId,
          item.adminOpenid,
          item.adminRole,
        ])
        return targetMatch && keywordMatch
      })
    },
  },

  async onShow() {
    await this.loadData()
  },

  watch: {
    activeTab() {
      this.activeFilter = 'all'
      this.searchKeyword = ''
    },
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
        this.adminRole = res.adminRole || 'superAdmin'
        this.cityId = res.cityId || 'dali'
        this.pendingVerifyList = res.pendingVerifyList || []
        this.reportList = res.reportList || []
        this.activityList = res.activityList || []
        this.actionLogList = res.actionLogList || []
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
              await this.loadData()
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
              await this.loadData()
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
              await this.loadData()
            }
          } catch(e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },

    goActivityDetail(activityId) {
      if (!activityId) {
        uni.showToast({ title: '缺少活动ID', icon: 'none' })
        return
      }
      uni.navigateTo({
        url: `/pages/detail/index?id=${activityId}`,
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

    reportStatusClass(status) {
      const map = {
        PENDING: 'status-pill--pending',
        HANDLED: 'status-pill--handled',
        IGNORED: 'status-pill--ignored',
      }
      return map[status] || 'status-pill--pending'
    },

    activityStatusClass(status) {
      const map = {
        OPEN: 'status-pill--open',
        FULL: 'status-pill--full',
        ENDED: 'status-pill--ended',
        CANCELLED: 'status-pill--cancelled',
      }
      return map[status] || 'status-pill--open'
    },

    actionText(action) {
      const map = {
        recommend: '设为推荐',
        unrecommend: '取消推荐',
        hide: '手动下架活动',
        verify: '通过实名认证',
        reject_verify: '拒绝实名认证',
        ban: '封禁用户',
        resolve_report_hide: '举报处理并下架',
        resolve_report_ignore: '举报处理并忽略',
      }
      return map[action] || action
    },

    targetTypeText(type) {
      const map = {
        activity: '活动',
        user: '用户',
        report: '举报',
      }
      return map[type] || '记录'
    },

    normalizeKeyword(text) {
      return String(text || '').trim().toLowerCase()
    },

    matchAny(keyword, values) {
      return values.some((item) => String(item || '').toLowerCase().includes(keyword))
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
.subtitle { display: block; margin-top: 10rpx; font-size: 24rpx; color: rgba(255,255,255,0.75); }

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
  padding: 16rpx;
}
.summary-card {
  background: white;
  border-radius: 16rpx;
  padding: 22rpx 24rpx;
}
.summary-value {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #1A3C5E;
}
.summary-label {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #888;
}

.tabs {
  display: flex; background: white;
  border-bottom: 1rpx solid #f0f0f0;
}
.tab {
  flex: 1; text-align: center;
  padding: 24rpx 0;
  font-size: 23rpx; color: #888;
}
.tab--active {
  color: #1A3C5E; font-weight: bold;
  border-bottom: 4rpx solid #1A3C5E;
}

.content { padding: 16rpx; }

.toolbar {
  margin-bottom: 14rpx;
}
.search-input {
  height: 76rpx;
  border-radius: 38rpx;
  background: white;
  padding: 0 24rpx;
  font-size: 26rpx;
  color: #333;
}
.chip-scroll {
  margin: 0 0 16rpx;
  white-space: nowrap;
}
.chip-row {
  display: flex;
  gap: 12rpx;
}
.chip {
  padding: 12rpx 22rpx;
  border-radius: 999rpx;
  background: #f0f2f4;
  font-size: 22rpx;
  color: #666;
  flex-shrink: 0;
}
.chip--active {
  background: #1A3C5E;
  color: white;
}

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
.activity-preview {
  margin: 0 0 18rpx;
  padding: 18rpx 20rpx;
  border-radius: 12rpx;
  background: #F8FBFF;
  border: 1rpx solid #E1ECF7;
}
.activity-preview--missing {
  background: #f6f7f8;
  border-color: #eceff1;
}
.preview-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
}
.preview-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 23rpx;
  color: #667085;
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.status-pill {
  flex-shrink: 0;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1.2;
}
.status-pill--pending { background: #FFF3CD; color: #8B5E00; }
.status-pill--handled { background: #EEF7EE; color: #1E7145; }
.status-pill--ignored { background: #f1f3f5; color: #666; }
.status-pill--open { background: #EEF7EE; color: #1E7145; }
.status-pill--full { background: #FFF3CD; color: #8B5E00; }
.status-pill--ended { background: #f1f3f5; color: #666; }
.status-pill--cancelled { background: #FFF0F0; color: #C00000; }
.status-pill--log { background: #EEF4FB; color: #1A3C5E; }

.card-actions { display: flex; gap: 16rpx; }
.action-btn {
  flex: 1; height: 72rpx; border-radius: 12rpx;
  font-size: 26rpx; font-weight: bold; border: none;
}
.action-btn--approve    { background: #EEF7EE; color: #1E7145; }
.action-btn--reject     { background: #FFF0F0; color: #C00000; }
.action-btn--recommend  { background: #EEF4FB; color: #1A3C5E; }
.action-btn--unrecommend{ background: #f5f5f5; color: #888; }
.action-btn--detail     { background: #F6F8FA; color: #344054; }
.action-btn::after { border: none; }
</style>
