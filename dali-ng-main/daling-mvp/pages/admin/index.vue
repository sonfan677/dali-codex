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

      <scroll-view
        v-if="activeTab === 'reports'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in reportSortOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === reportSort }"
            @tap="reportSort = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <scroll-view
        v-if="activeTab === 'logs'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in logTimeOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === logTimeRange }"
            @tap="logTimeRange = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <scroll-view
        v-if="activeTab === 'logs'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in logViewOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === logViewMode }"
            @tap="logViewMode = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <scroll-view
        v-if="activeTab === 'logs'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in logSortOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === logSort }"
            @tap="logSort = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <scroll-view
        v-if="activeTab === 'logs'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in logOperatorOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === logOperator }"
            @tap="logOperator = item.value"
          >{{ item.label }}</view>
        </view>
      </scroll-view>

      <scroll-view
        v-if="activeTab === 'logs'"
        scroll-x
        class="chip-scroll chip-scroll--sort"
        show-scrollbar="false"
      >
        <view class="chip-row">
          <view
            v-for="item in logRoleOptions"
            :key="item.value"
            class="chip chip--sort"
            :class="{ 'chip--active': item.value === logRole }"
            @tap="logRole = item.value"
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
          :class="{
            'card--flash-handled': isRecentHandled(item._id, 'HANDLED'),
            'card--flash-ignored': isRecentHandled(item._id, 'IGNORED'),
          }"
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
              <text
                v-if="isHandlingReport(item._id)"
                class="card-openid card-openid--processing"
              >处理中，请稍候...</text>
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
            <button
              class="action-btn action-btn--detail"
              :disabled="isHandlingReport(item._id)"
              @tap="goActivityDetail(item.targetId)"
            >查看详情</button>
            <button
              class="action-btn action-btn--approve"
              :loading="isHandlingReport(item._id, 'resolve_report_hide')"
              :disabled="isHandlingReport(item._id)"
              @tap="handleReport(item)"
            >下架并处理</button>
            <button
              class="action-btn action-btn--reject"
              :loading="isHandlingReport(item._id, 'resolve_report_ignore')"
              :disabled="isHandlingReport(item._id)"
              @tap="ignoreReport(item)"
            >忽略并处理</button>
          </view>
          <view v-else class="card-actions">
            <button
              class="action-btn action-btn--detail"
              :disabled="isHandlingReport(item._id)"
              @tap="goActivityDetail(item.targetId)"
            >查看详情</button>
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
              <view v-if="item.reportMeta && item.reportMeta.total > 0" class="inline-badges">
                <text class="mini-pill mini-pill--report">累计举报 {{ item.reportMeta.total }}</text>
                <text v-if="item.reportMeta.pending > 0" class="mini-pill mini-pill--pending">待处理 {{ item.reportMeta.pending }}</text>
              </view>
              <text class="card-sub">{{ item.currentParticipants }}人参与{{ item.isRecommended ? ' · 官方推荐' : '' }}</text>
              <text v-if="item.publisherNickname" class="card-sub">发布者：{{ item.publisherNickname }}</text>
              <text class="card-openid">{{ item.location && item.location.address }}</text>
              <text v-if="item.reportMeta && item.reportMeta.latestReason" class="card-openid">
                最近举报：{{ item.reportMeta.latestReason }}
              </text>
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
        <view class="export-toolbar">
          <button
            class="action-btn action-btn--export"
            :loading="csvExporting"
            @tap="exportStatsCsv"
          >导出统计报表 CSV</button>
          <text class="export-tip">导出总览统计 + 操作记录明细（当前筛选）</text>
        </view>

        <view v-if="logViewMode === 'flat' && filteredActionLogList.length > 0" class="logs-overview">
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ logOverview.total }}</text>
            <text class="logs-overview-label">筛选后总数</text>
          </view>
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ logOverview.highRisk }}</text>
            <text class="logs-overview-label">高风险操作</text>
          </view>
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ logOverview.reportRelated }}</text>
            <text class="logs-overview-label">举报处理相关</text>
          </view>
        </view>

        <template v-if="logViewMode === 'flat'">
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
              <view class="result-row">
                <text class="card-sub">结果：</text>
                <text class="status-pill" :class="resultToneClass(item.action)">{{ item.result || '已执行' }}</text>
              </view>
              <text class="card-sub">原因：{{ item.reason || '--' }}</text>
              <text class="card-openid">对象ID: {{ item.targetId ? item.targetId.slice(0,12) + '...' : '--' }}</text>
              <text v-if="item.linkedActivityId" class="card-openid">
                关联活动ID: {{ item.linkedActivityId.slice(0,12) + '...' }}
              </text>
              <text v-if="item.linkedActivity && item.linkedActivity.title" class="card-sub">
                关联活动：{{ item.linkedActivity.title }}
              </text>
              <text class="card-openid">操作者: {{ item.adminRole || 'admin' }} · {{ shortOpenid(item.adminOpenid) }}</text>
              <text class="card-openid">时间：{{ formatTime(item.createdAt) }}</text>
            </view>
            <view v-if="item.linkedActivityId" class="card-actions card-actions--single">
              <button
                class="action-btn action-btn--detail"
                @tap="goActivityDetail(item.linkedActivityId)"
              >查看关联活动</button>
            </view>
          </view>
        </template>

        <template v-else>
          <view v-if="logActivityAggregateList.length === 0" class="empty">
            <text class="empty-text">暂无可聚合链路</text>
          </view>
          <view
            v-for="group in logActivityAggregateList"
            :key="group.activityId"
            class="card"
          >
            <view class="card-text">
              <view class="title-row">
                <text class="card-title">{{ group.title || '未命名活动' }}</text>
                <text class="status-pill" :class="activityStatusClass(group.status)">{{ statusText(group.status) }}</text>
              </view>
              <view class="inline-badges">
                <text class="mini-pill mini-pill--report">举报 {{ group.reportTotal }}</text>
                <text v-if="group.pendingReports > 0" class="mini-pill mini-pill--pending">待处理 {{ group.pendingReports }}</text>
                <text class="mini-pill mini-pill--log">管理动作 {{ group.actionCount }}</text>
                <text v-if="group.highRiskCount > 0" class="mini-pill mini-pill--risk">高风险 {{ group.highRiskCount }}</text>
              </view>
              <text class="card-openid">活动ID: {{ group.activityId.slice(0,12) + '...' }}</text>
              <text class="card-openid">最近事件：{{ formatTime(group.latestAt) }}</text>
            </view>

            <view class="timeline">
              <view
                v-for="item in group.timeline"
                :key="item.eventKey"
                class="timeline-item"
              >
                <view class="timeline-dot" :class="item.eventType === 'REPORT' ? 'timeline-dot--report' : 'timeline-dot--action'" />
                <view class="timeline-content">
                  <view class="title-row">
                    <text class="card-sub">{{ item.title }}</text>
                    <text class="card-openid">{{ formatTime(item.at) }}</text>
                  </view>
                  <text class="card-openid">{{ item.desc }}</text>
                </view>
              </view>
            </view>

            <text
              v-if="group.totalTimelineCount > group.timeline.length"
              class="card-openid"
            >仅显示最近 {{ group.timeline.length }} 条，共 {{ group.totalTimelineCount }} 条</text>

            <view class="card-actions card-actions--single">
              <button
                class="action-btn action-btn--detail"
                @tap="goActivityDetail(group.activityId)"
              >查看活动详情</button>
            </view>
          </view>
        </template>
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
      reportSort: 'created_desc',
      logTimeRange: 'all',
      logSort: 'created_desc',
      logViewMode: 'flat',
      logOperator: 'all',
      logRole: 'all',
      reportHandlingId: '',
      reportHandlingAction: '',
      lastHandledReportId: '',
      lastHandledReportStatus: '',
      reportHighlightTimer: null,
      csvExporting: false,
      loading: false,
      hasAccess: true,
      currentAdminOpenid: '',
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
        logs: '搜索原因 / 对象ID / 关联活动ID / 管理员',
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
          { label: '被举报', value: 'reported' },
        ]
      }
      if (this.activeTab === 'logs') {
        return [
          { label: '全部', value: 'all' },
          { label: '设为推荐', value: 'recommend' },
          { label: '取消推荐', value: 'unrecommend' },
          { label: '手动下架', value: 'hide' },
          { label: '通过认证', value: 'verify' },
          { label: '拒绝认证', value: 'reject_verify' },
          { label: '举报下架', value: 'resolve_report_hide' },
          { label: '举报忽略', value: 'resolve_report_ignore' },
        ]
      }
      return []
    },

    reportSortOptions() {
      return [
        { label: '按提交时间(新->旧)', value: 'created_desc' },
        { label: '按提交时间(旧->新)', value: 'created_asc' },
        { label: '按处理时间(新->旧)', value: 'handled_desc' },
      ]
    },

    logTimeOptions() {
      return [
        { label: '时间：全部', value: 'all' },
        { label: '时间：今日', value: 'today' },
        { label: '时间：近7天', value: 'last7' },
      ]
    },

    logSortOptions() {
      return [
        { label: '排序：新->旧', value: 'created_desc' },
        { label: '排序：旧->新', value: 'created_asc' },
      ]
    },

    logViewOptions() {
      return [
        { label: '视图：明细', value: 'flat' },
        { label: '视图：按活动聚合', value: 'by_activity' },
      ]
    },

    logOperatorOptions() {
      const total = this.actionLogList.length
      const meCount = this.currentAdminOpenid
        ? this.actionLogList.filter((item) => item.adminOpenid === this.currentAdminOpenid).length
        : 0
      const otherCount = Math.max(total - meCount, 0)

      const options = [{ label: `操作者：全部(${total})`, value: 'all' }]
      if (this.currentAdminOpenid) {
        options.push({ label: `操作者：我自己(${meCount})`, value: 'me' })
        if (otherCount > 0) {
          options.push({ label: `操作者：其他(${otherCount})`, value: 'others' })
        }
      }
      return options
    },

    logRoleOptions() {
      const roleCountMap = this.actionLogList.reduce((acc, item) => {
        const role = item.adminRole || 'superAdmin'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {})

      const options = [{ label: `角色：全部(${this.actionLogList.length})`, value: 'all' }]
      if (roleCountMap.superAdmin) {
        options.push({ label: `角色：超管(${roleCountMap.superAdmin})`, value: 'superAdmin' })
      }
      if (roleCountMap.cityAdmin) {
        options.push({ label: `角色：城市管理员(${roleCountMap.cityAdmin})`, value: 'cityAdmin' })
      }
      return options
    },

    logOverview() {
      const list = this.filteredActionLogList
      const highRiskActions = ['hide', 'ban', 'resolve_report_hide', 'reject_verify']
      const reportRelatedActions = ['resolve_report_hide', 'resolve_report_ignore']
      return {
        total: list.length,
        highRisk: list.filter((item) => highRiskActions.includes(item.action)).length,
        reportRelated: list.filter((item) => reportRelatedActions.includes(item.action)).length,
      }
    },

    logActivityAggregateList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const activityMap = this.activityList.reduce((acc, item) => {
        acc[item._id] = item
        return acc
      }, {})
      const groups = {}
      const highRiskActions = ['hide', 'ban', 'resolve_report_hide', 'reject_verify']

      const toTs = (value) => {
        const ms = new Date(value).getTime()
        return Number.isFinite(ms) ? ms : 0
      }

      const ensureGroup = (activityId, fallback = {}) => {
        if (!activityId) return null
        if (!groups[activityId]) {
          const base = activityMap[activityId] || fallback || {}
          groups[activityId] = {
            activityId,
            title: base.title || '活动',
            status: base.status || 'OPEN',
            reportTotal: 0,
            pendingReports: 0,
            handledReports: 0,
            ignoredReports: 0,
            actionCount: 0,
            highRiskCount: 0,
            latestAt: null,
            timeline: [],
            totalTimelineCount: 0,
          }
        }
        return groups[activityId]
      }

      this.filteredActionLogList.forEach((item) => {
        const activityId = item.linkedActivityId || (item.targetType === 'activity' ? item.targetId : '')
        if (!activityId) return
        const group = ensureGroup(activityId, item.linkedActivity || {})
        if (!group) return

        group.actionCount += 1
        if (highRiskActions.includes(item.action)) group.highRiskCount += 1
        const currentTs = toTs(item.createdAt)
        if (!group.latestAt || currentTs > toTs(group.latestAt)) group.latestAt = item.createdAt

        group.timeline.push({
          eventKey: `action_${item._id}`,
          eventType: 'ACTION',
          at: item.createdAt,
          ts: currentTs,
          title: `${this.actionText(item.action)} · ${item.result || '已执行'}`,
          desc: `操作者：${item.adminRole || 'admin'} · ${this.shortOpenid(item.adminOpenid)} · 原因：${item.reason || '--'}`,
        })
      })

      const canIncludeReportOnly = this.activeFilter === 'all' && this.logOperator === 'all' && this.logRole === 'all'
      this.reportList.forEach((item) => {
        if (!item.targetId) return
        if (!this.isLogInTimeRange(item.createdAt)) return
        if (keyword && !this.matchAny(keyword, [
          item.reason,
          item.targetId,
          item.reporterNickname,
          item.reporterOpenid,
          item.targetActivity?.title,
          item.targetActivity?.location?.address,
        ])) {
          return
        }
        if (!canIncludeReportOnly && !groups[item.targetId]) return

        const group = ensureGroup(item.targetId, item.targetActivity || {})
        if (!group) return

        group.reportTotal += 1
        if (item.reportStatus === 'HANDLED') group.handledReports += 1
        else if (item.reportStatus === 'IGNORED') group.ignoredReports += 1
        else group.pendingReports += 1

        const currentTs = toTs(item.createdAt)
        if (!group.latestAt || currentTs > toTs(group.latestAt)) group.latestAt = item.createdAt
        group.timeline.push({
          eventKey: `report_${item._id}`,
          eventType: 'REPORT',
          at: item.createdAt,
          ts: currentTs,
          title: `用户举报 · ${this.reportStatusText(item.reportStatus)}`,
          desc: `举报人：${item.reporterNickname || this.shortOpenid(item.reporterOpenid)} · 原因：${item.reason || '--'}`,
        })
      })

      const list = Object.values(groups).map((group) => {
        const sorted = [...group.timeline].sort((a, b) => b.ts - a.ts)
        return {
          ...group,
          timeline: sorted.slice(0, 6),
          totalTimelineCount: sorted.length,
        }
      })

      list.sort((a, b) => toTs(b.latestAt) - toTs(a.latestAt))
      return list
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
      const filtered = this.reportList.filter((item) => {
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

      const toTs = (t) => {
        const ms = new Date(t).getTime()
        return Number.isFinite(ms) ? ms : 0
      }

      const sorted = [...filtered]
      sorted.sort((a, b) => {
        if (this.reportSort === 'created_asc') {
          return toTs(a.createdAt) - toTs(b.createdAt)
        }
        if (this.reportSort === 'handled_desc') {
          const deltaHandled = toTs(b.handledAt) - toTs(a.handledAt)
          if (deltaHandled !== 0) return deltaHandled
          return toTs(b.createdAt) - toTs(a.createdAt)
        }
        return toTs(b.createdAt) - toTs(a.createdAt)
      })
      return sorted
    },

    filteredActivityList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      return this.activityList.filter((item) => {
        const statusMatch = this.activeFilter === 'all'
          || (this.activeFilter === 'recommended'
            ? !!item.isRecommended
            : this.activeFilter === 'reported'
              ? Number(item.reportMeta?.total || 0) > 0
              : item.status === this.activeFilter)
        const keywordMatch = !keyword || this.matchAny(keyword, [
          item.title,
          item.location?.address,
          item.publisherNickname,
          item._id,
          item.reportMeta?.latestReason,
        ])
        return statusMatch && keywordMatch
      })
    },

    filteredActionLogList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const filtered = this.actionLogList.filter((item) => {
        const targetMatch = this.activeFilter === 'all' || item.action === this.activeFilter
        const timeMatch = this.isLogInTimeRange(item.createdAt)
        const role = item.adminRole || 'superAdmin'
        const roleMatch = this.logRole === 'all' || role === this.logRole
        const operatorMatch = this.logOperator === 'all'
          || (this.logOperator === 'me' && item.adminOpenid === this.currentAdminOpenid)
          || (this.logOperator === 'others' && item.adminOpenid !== this.currentAdminOpenid)
        const keywordMatch = !keyword || this.matchAny(keyword, [
          item.reason,
          item.result,
          item.targetId,
          item.linkedActivityId,
          item.linkedActivity?.title,
          item.adminOpenid,
          item.adminRole,
        ])
        return targetMatch && timeMatch && roleMatch && operatorMatch && keywordMatch
      })

      const toTs = (t) => {
        const ms = new Date(t).getTime()
        return Number.isFinite(ms) ? ms : 0
      }

      const sorted = [...filtered]
      sorted.sort((a, b) => (
        this.logSort === 'created_asc'
          ? toTs(a.createdAt) - toTs(b.createdAt)
          : toTs(b.createdAt) - toTs(a.createdAt)
      ))

      return sorted
    },
  },

  async onShow() {
    await this.loadData()
  },

  watch: {
    activeTab() {
      this.activeFilter = 'all'
      this.searchKeyword = ''
      this.reportSort = 'created_desc'
      this.logTimeRange = 'all'
      this.logSort = 'created_desc'
      this.logViewMode = 'flat'
      this.logOperator = 'all'
      this.logRole = 'all'
    },
  },

  onUnload() {
    if (this.reportHighlightTimer) {
      clearTimeout(this.reportHighlightTimer)
      this.reportHighlightTimer = null
    }
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
        this.currentAdminOpenid = res.currentOpenid || ''
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
          this.reportHandlingId = reportItem._id
          this.reportHandlingAction = 'resolve_report_hide'
          try {
            const result = await callCloud('adminAction', {
              action: 'resolve_report_hide',
              reportId: reportItem._id,
              targetId: reportItem.targetId,
              targetType: 'report',
              reason: res.content,
            })
            if (result.success) {
              if (this.activeFilter === 'PENDING') this.activeFilter = 'all'
              uni.showToast({ title: result.message || '举报已处理', icon: 'success' })
              await this.loadData()
              this.markReportHandled(reportItem._id, 'HANDLED')
            }
          } catch(e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          } finally {
            this.reportHandlingId = ''
            this.reportHandlingAction = ''
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
          this.reportHandlingId = reportItem._id
          this.reportHandlingAction = 'resolve_report_ignore'
          try {
            const result = await callCloud('adminAction', {
              action: 'resolve_report_ignore',
              reportId: reportItem._id,
              targetId: reportItem.targetId,
              targetType: 'report',
              reason: res.content,
            })
            if (result.success) {
              if (this.activeFilter === 'PENDING') this.activeFilter = 'all'
              uni.showToast({ title: result.message || '举报已处理', icon: 'success' })
              await this.loadData()
              this.markReportHandled(reportItem._id, 'IGNORED')
            } else {
              uni.showToast({ title: result.message || '操作失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          } finally {
            this.reportHandlingId = ''
            this.reportHandlingAction = ''
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

    isHandlingReport(reportId, action = '') {
      if (!reportId || this.reportHandlingId !== reportId) return false
      if (!action) return true
      return this.reportHandlingAction === action
    },

    markReportHandled(reportId, status) {
      this.lastHandledReportId = reportId
      this.lastHandledReportStatus = status
      if (this.reportHighlightTimer) clearTimeout(this.reportHighlightTimer)
      this.reportHighlightTimer = setTimeout(() => {
        this.lastHandledReportId = ''
        this.lastHandledReportStatus = ''
        this.reportHighlightTimer = null
      }, 8000)
    },

    isRecentHandled(reportId, status) {
      return this.lastHandledReportId === reportId && this.lastHandledReportStatus === status
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

    resultToneClass(action) {
      const map = {
        recommend: 'status-pill--result-positive',
        verify: 'status-pill--result-positive',
        unrecommend: 'status-pill--result-neutral',
        resolve_report_ignore: 'status-pill--result-neutral',
        hide: 'status-pill--result-risk',
        ban: 'status-pill--result-risk',
        reject_verify: 'status-pill--result-risk',
        resolve_report_hide: 'status-pill--result-risk',
      }
      return map[action] || 'status-pill--result-default'
    },

    isLogInTimeRange(createdAt) {
      if (this.activeTab !== 'logs') return true
      if (this.logTimeRange === 'all') return true

      const ts = new Date(createdAt).getTime()
      if (!Number.isFinite(ts)) return false

      const now = new Date()
      if (this.logTimeRange === 'today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        return ts >= start
      }

      if (this.logTimeRange === 'last7') {
        return ts >= (now.getTime() - 7 * 24 * 60 * 60 * 1000)
      }

      return true
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

    formatDateToken(d = new Date()) {
      const y = d.getFullYear()
      const mo = (d.getMonth() + 1).toString().padStart(2, '0')
      const day = d.getDate().toString().padStart(2, '0')
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      const s = d.getSeconds().toString().padStart(2, '0')
      return `${y}${mo}${day}_${h}${m}${s}`
    },

    formatExportTime(d = new Date()) {
      const y = d.getFullYear()
      const mo = (d.getMonth() + 1).toString().padStart(2, '0')
      const day = d.getDate().toString().padStart(2, '0')
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      const s = d.getSeconds().toString().padStart(2, '0')
      return `${y}-${mo}-${day} ${h}:${m}:${s}`
    },

    escapeCsvCell(value) {
      const text = value === null || value === undefined ? '' : String(value)
      if (/[",\n]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`
      }
      return text
    },

    buildCsvLine(values = []) {
      return values.map((item) => this.escapeCsvCell(item)).join(',')
    },

    buildStatsCsv() {
      const lines = []
      const append = (values = []) => lines.push(this.buildCsvLine(values))

      const now = new Date()
      const statusCounter = { OPEN: 0, FULL: 0, ENDED: 0, CANCELLED: 0 }
      this.activityList.forEach((item) => {
        const s = item.status || 'OPEN'
        statusCounter[s] = (statusCounter[s] || 0) + 1
      })

      const reportCounter = { PENDING: 0, HANDLED: 0, IGNORED: 0 }
      this.reportList.forEach((item) => {
        const s = item.reportStatus || 'PENDING'
        reportCounter[s] = (reportCounter[s] || 0) + 1
      })

      const actionCounter = {}
      this.actionLogList.forEach((item) => {
        const k = item.action || 'unknown'
        actionCounter[k] = (actionCounter[k] || 0) + 1
      })
      const sortedActionRows = Object.keys(actionCounter)
        .sort((a, b) => actionCounter[b] - actionCounter[a])
        .map((action) => [this.actionText(action), action, actionCounter[action]])

      const topReportedActivities = [...this.activityList]
        .map((item) => ({
          activityId: item._id || '',
          title: item.title || '',
          status: item.status || '',
          reportTotal: Number(item.reportMeta?.total || 0),
          reportPending: Number(item.reportMeta?.pending || 0),
          publisherNickname: item.publisherNickname || '',
        }))
        .filter((item) => item.reportTotal > 0)
        .sort((a, b) => b.reportTotal - a.reportTotal)
        .slice(0, 20)

      append(['搭里管理统计报表（CSV）'])
      append(['导出时间', this.formatExportTime(now)])
      append(['导出角色', this.adminRoleLabel])
      append(['城市范围', this.cityIdLabel])
      append(['当前页面', this.activeTab])
      append(['筛选上下文', `filter=${this.activeFilter}; keyword=${this.searchKeyword || '-'}; logTime=${this.logTimeRange}; logView=${this.logViewMode}; logSort=${this.logSort}; operator=${this.logOperator}; role=${this.logRole}`])
      append([])

      append(['一、总览指标'])
      append(['指标', '数值'])
      append(['待审认证', this.pendingVerifyList.length])
      append(['待处理举报', reportCounter.PENDING || 0])
      append(['活跃活动(OPEN+FULL)', this.activeActivityCount])
      append(['活动总量', this.activityList.length])
      append(['举报记录总量', this.reportList.length])
      append(['操作记录总量', this.actionLogList.length])
      append(['当前筛选操作记录', this.filteredActionLogList.length])
      append([])

      append(['二、活动状态统计'])
      append(['状态', '数量'])
      append(['OPEN(招募中)', statusCounter.OPEN || 0])
      append(['FULL(已满员)', statusCounter.FULL || 0])
      append(['ENDED(已结束)', statusCounter.ENDED || 0])
      append(['CANCELLED(已取消)', statusCounter.CANCELLED || 0])
      append(['官方推荐活动数', this.activityList.filter((item) => !!item.isRecommended).length])
      append([])

      append(['三、举报处理统计'])
      append(['状态', '数量'])
      append(['PENDING(待处理)', reportCounter.PENDING || 0])
      append(['HANDLED(已处理)', reportCounter.HANDLED || 0])
      append(['IGNORED(已忽略)', reportCounter.IGNORED || 0])
      append([])

      append(['四、操作类型统计'])
      append(['动作中文', '动作编码', '次数'])
      sortedActionRows.forEach((row) => append(row))
      append([])

      append(['五、被举报活动 Top20'])
      append(['活动ID', '活动标题', '状态', '累计举报', '待处理举报', '发布者'])
      if (topReportedActivities.length === 0) {
        append(['-', '暂无', '-', 0, 0, '-'])
      } else {
        topReportedActivities.forEach((row) => {
          append([row.activityId, row.title, row.status, row.reportTotal, row.reportPending, row.publisherNickname])
        })
      }
      append([])

      append(['六、当前筛选下的操作记录明细'])
      append(['时间', '动作中文', '动作编码', '结果', '对象类型', '对象ID', '关联活动ID', '操作者角色', '操作者OPENID', '原因'])
      if (this.filteredActionLogList.length === 0) {
        append(['-', '-', '-', '-', '-', '-', '-', '-', '-', '-'])
      } else {
        this.filteredActionLogList.forEach((item) => {
          append([
            this.formatExportTime(new Date(item.createdAt || Date.now())),
            this.actionText(item.action),
            item.action || '',
            item.result || '',
            item.targetType || '',
            item.targetId || '',
            item.linkedActivityId || '',
            item.adminRole || '',
            item.adminOpenid || '',
            item.reason || '',
          ])
        })
      }

      return lines.join('\n')
    },

    async saveCsvToClipboard(csvText) {
      return new Promise((resolve, reject) => {
        uni.setClipboardData({
          data: csvText,
          success: resolve,
          fail: reject,
        })
      })
    },

    async saveCsvToFile(csvText, fileName) {
      return new Promise((resolve, reject) => {
        if (typeof wx === 'undefined' || !wx.getFileSystemManager || !wx.env?.USER_DATA_PATH) {
          reject(new Error('CURRENT_ENV_NOT_SUPPORT_FILE'))
          return
        }
        const fs = wx.getFileSystemManager()
        const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`
        fs.writeFile({
          filePath,
          data: `\uFEFF${csvText}`,
          encoding: 'utf8',
          success: () => resolve(filePath),
          fail: (err) => reject(err),
        })
      })
    },

    async openCsvFile(filePath) {
      return new Promise((resolve, reject) => {
        if (typeof wx === 'undefined' || !wx.openDocument) {
          reject(new Error('OPEN_DOCUMENT_NOT_SUPPORT'))
          return
        }
        wx.openDocument({
          filePath,
          fileType: 'csv',
          showMenu: true,
          success: resolve,
          fail: reject,
        })
      })
    },

    async exportStatsCsv() {
      if (this.csvExporting) return
      this.csvExporting = true
      try {
        const csvText = this.buildStatsCsv()
        const fileName = `dali_admin_report_${this.formatDateToken(new Date())}.csv`

        try {
          const filePath = await this.saveCsvToFile(csvText, fileName)
          await this.openCsvFile(filePath)
          uni.showToast({ title: 'CSV已生成', icon: 'success' })
          return
        } catch (fileErr) {
          console.warn('保存CSV文件失败，回退剪贴板', fileErr)
        }

        await this.saveCsvToClipboard(csvText)
        uni.showModal({
          title: '已复制CSV内容',
          content: '当前环境不支持直接打开文件，已复制到剪贴板，可粘贴到表格工具保存为 .csv',
          showCancel: false,
        })
      } catch (e) {
        console.error('导出CSV失败', e)
        uni.showToast({ title: '导出失败，请重试', icon: 'none' })
      } finally {
        this.csvExporting = false
      }
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
.chip-scroll--sort {
  margin-top: -8rpx;
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
.chip--sort {
  font-size: 20rpx;
  padding: 10rpx 18rpx;
}

.center-tip, .empty {
  display: flex; flex-direction: column;
  align-items: center; padding: 80rpx 40rpx;
}
.empty-text { font-size: 28rpx; color: #999; }

.logs-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12rpx;
  margin: 0 0 14rpx;
}
.export-toolbar {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  margin: 0 0 14rpx;
}
.export-tip {
  font-size: 22rpx;
  color: #667085;
}
.logs-overview-card {
  background: #ffffff;
  border-radius: 12rpx;
  padding: 14rpx 16rpx;
}
.logs-overview-value {
  display: block;
  font-size: 32rpx;
  line-height: 1.2;
  font-weight: 700;
  color: #1A3C5E;
}
.logs-overview-label {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #667085;
}

.card {
  background: white; border-radius: 12rpx;
  padding: 24rpx 28rpx; margin-bottom: 16rpx;
  transition: all .22s ease;
}
.card--flash-handled {
  box-shadow: 0 0 0 2rpx #1E7145 inset;
  background: #F6FFF8;
}
.card--flash-ignored {
  box-shadow: 0 0 0 2rpx #667085 inset;
  background: #F8FAFC;
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
.card-openid--processing { color: #1A3C5E; }
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
.inline-badges {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
  margin: 6rpx 0 2rpx;
}
.mini-pill {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  font-size: 20rpx;
  line-height: 1.2;
}
.mini-pill--report {
  background: #FFF7E8;
  color: #8B5E00;
}
.mini-pill--pending {
  background: #FFF0F0;
  color: #C00000;
}
.mini-pill--log {
  background: #EEF4FB;
  color: #1A3C5E;
}
.mini-pill--risk {
  background: #FFF1F2;
  color: #9F1239;
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
.status-pill--result-default { background: #EEF4FB; color: #1A3C5E; }
.status-pill--result-positive { background: #EEF7EE; color: #1E7145; }
.status-pill--result-neutral { background: #f1f3f5; color: #667085; }
.status-pill--result-risk { background: #FFF0F0; color: #C00000; }

.result-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.timeline {
  margin-top: 14rpx;
  padding-top: 8rpx;
}
.timeline-item {
  display: flex;
  gap: 14rpx;
  margin-bottom: 12rpx;
}
.timeline-item:last-child {
  margin-bottom: 0;
}
.timeline-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin-top: 8rpx;
  flex-shrink: 0;
}
.timeline-dot--report {
  background: #F59E0B;
}
.timeline-dot--action {
  background: #1A3C5E;
}
.timeline-content {
  flex: 1;
  min-width: 0;
}

.card-actions { display: flex; gap: 16rpx; }
.card-actions--single { margin-top: 16rpx; }
.action-btn {
  flex: 1; height: 72rpx; border-radius: 12rpx;
  font-size: 26rpx; font-weight: bold; border: none;
}
.action-btn--approve    { background: #EEF7EE; color: #1E7145; }
.action-btn--reject     { background: #FFF0F0; color: #C00000; }
.action-btn--recommend  { background: #EEF4FB; color: #1A3C5E; }
.action-btn--unrecommend{ background: #f5f5f5; color: #888; }
.action-btn--detail     { background: #F6F8FA; color: #344054; }
.action-btn--export     { background: #1A3C5E; color: #fff; }
.action-btn::after { border: none; }
</style>
