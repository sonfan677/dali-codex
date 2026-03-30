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
        :class="{ 'tab--active': activeTab === 'todo' }"
        @tap="activeTab = 'todo'"
      >待办中心 {{ todoTotalCount > 0 ? '(' + todoTotalCount + ')' : '' }}</view>
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

      <view
        v-if="activeTab === 'logs' && logTimeRange === 'custom'"
        class="date-range-panel"
      >
        <picker mode="date" :value="logCustomStartDate" @change="onPickLogStartDate">
          <view class="date-pill">开始日期：{{ logCustomStartDate || '--' }}</view>
        </picker>
        <picker mode="date" :value="logCustomEndDate" @change="onPickLogEndDate">
          <view class="date-pill">结束日期：{{ logCustomEndDate || '--' }}</view>
        </picker>
      </view>

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

      <!-- 待办中心 -->
      <template v-if="activeTab === 'todo'">
        <view class="logs-overview">
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ todoTotalCount }}</text>
            <text class="logs-overview-label">待办总数</text>
          </view>
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ overdueTodoCount }}</text>
            <text class="logs-overview-label">超时预警</text>
          </view>
          <view class="logs-overview-card">
            <text class="logs-overview-value">{{ upcomingActivityTodoList.length }}</text>
            <text class="logs-overview-label">24h即将开始</text>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">待处理举报</text>
            <text class="status-pill status-pill--pending">{{ pendingReportTodoList.length }}</text>
          </view>
          <view v-if="pendingReportTodoList.length === 0" class="empty empty--inline">
            <text class="empty-text">暂无待处理举报</text>
          </view>
          <view
            v-for="item in pendingReportTodoList"
            :key="item._id"
            class="todo-item"
            :class="{ 'todo-item--overdue': item.isOverSla }"
          >
            <view class="title-row">
              <text class="card-sub">{{ item.reason || '举报待处理' }}</text>
              <text class="card-openid">已等待 {{ item.waitHoursText }}</text>
            </view>
            <text class="card-openid">活动：{{ item.targetActivity?.title || item.targetId }}</text>
            <view class="card-actions">
              <button class="action-btn action-btn--detail" @tap="goActivityDetail(item.targetId)">查看</button>
              <button class="action-btn action-btn--approve" :disabled="isHandlingReport(item._id)" @tap="handleReportQuick(item)">下架(快捷)</button>
              <button class="action-btn action-btn--reject" :disabled="isHandlingReport(item._id)" @tap="ignoreReportQuick(item)">忽略(快捷)</button>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">待审核认证</text>
            <text class="status-pill status-pill--pending">{{ pendingVerifyTodoList.length }}</text>
          </view>
          <view v-if="pendingVerifyTodoList.length === 0" class="empty empty--inline">
            <text class="empty-text">暂无待审核认证</text>
          </view>
          <view
            v-for="item in pendingVerifyTodoList"
            :key="item._id"
            class="todo-item"
            :class="{ 'todo-item--overdue': item.isOverSla }"
          >
            <view class="title-row">
              <text class="card-sub">{{ item.nickname || shortOpenid(item._openid) }}</text>
              <text class="card-openid">已等待 {{ item.waitHoursText }}</text>
            </view>
            <text class="card-openid">{{ item._openid ? item._openid.slice(0, 20) + '...' : '--' }}</text>
            <view class="card-actions">
              <button class="action-btn action-btn--approve" @tap="verifyUserQuick(item._openid, 'verify')">通过(快捷)</button>
              <button class="action-btn action-btn--reject" @tap="verifyUserQuick(item._openid, 'reject_verify')">拒绝(快捷)</button>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">即将开始活动（24h）</text>
            <text class="status-pill status-pill--open">{{ upcomingActivityTodoList.length }}</text>
          </view>
          <view v-if="upcomingActivityTodoList.length === 0" class="empty empty--inline">
            <text class="empty-text">暂无24小时内开始的活动</text>
          </view>
          <view
            v-for="item in upcomingActivityTodoList"
            :key="item._id"
            class="todo-item"
            :class="{ 'todo-item--urgent': item.isUrgent }"
          >
            <view class="title-row">
              <text class="card-sub">{{ item.title }}</text>
              <text class="card-openid">距开始 {{ item.startInText }}</text>
            </view>
            <text class="card-openid">分类：{{ item.categoryLabel || '其他' }} · 地点：{{ item.location?.address || '--' }}</text>
            <view class="card-actions">
              <button class="action-btn action-btn--detail" @tap="goActivityDetail(item._id)">查看详情</button>
              <button v-if="!item.isRecommended" class="action-btn action-btn--recommend" @tap="recommendActivity(item._id, 'recommend')">推荐</button>
              <button v-else class="action-btn action-btn--unrecommend" @tap="recommendActivity(item._id, 'unrecommend')">取消推荐</button>
            </view>
          </view>
        </view>

        <view class="card">
          <view class="title-row">
            <text class="card-title">闭环追踪（举报处理 SLA）</text>
            <text class="status-pill status-pill--handled">{{ closureStats.withinSlaRate }}</text>
          </view>
          <view class="logs-overview">
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ closureStats.closedCount }}</text>
              <text class="logs-overview-label">已闭环举报</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ closureStats.avgHandleHours }}</text>
              <text class="logs-overview-label">平均处理时长(h)</text>
            </view>
            <view class="logs-overview-card">
              <text class="logs-overview-value">{{ closureStats.withinSlaCount }}</text>
              <text class="logs-overview-label">24h内闭环</text>
            </view>
          </view>
          <view v-if="recentClosureList.length === 0" class="empty empty--inline">
            <text class="empty-text">暂无闭环记录</text>
          </view>
          <view v-for="item in recentClosureList" :key="item._id" class="todo-item">
            <view class="title-row">
              <text class="card-sub">{{ item.targetActivity?.title || item.targetId }}</text>
              <text class="card-openid">耗时 {{ item.handleHoursText }}</text>
            </view>
            <text class="card-openid">结果：{{ reportStatusText(item.reportStatus) }} · {{ formatTime(item.handledAt) }}</text>
          </view>
        </view>
      </template>

      <!-- 待审核认证 -->
      <template v-else-if="activeTab === 'verify'">
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
          <view class="export-main-actions">
            <button
              class="action-btn action-btn--export"
              :loading="csvExporting"
              :disabled="csvExportingV2 || trendCsvExporting"
              @tap="exportStatsCsv"
            >导出基础报表 CSV</button>
            <button
              class="action-btn action-btn--export action-btn--export-v2"
              :loading="csvExportingV2"
              :disabled="csvExporting || trendCsvExporting"
              @tap="exportStatsCsvV2"
            >导出报表二期 CSV（双表）</button>
            <button
              class="action-btn action-btn--export action-btn--export-trend"
              :loading="trendCsvExporting"
              :disabled="csvExporting || csvExportingV2"
              @tap="exportTrendCsv"
            >导出周/月趋势 CSV</button>
          </view>
          <text class="export-tip">导出总览统计 + 操作记录明细（当前筛选 + 当前时间范围）</text>
          <view class="export-config">
            <view class="title-row">
              <text class="export-config-title">明细字段筛选</text>
              <text class="export-config-tip">已选 {{ exportSelectedFields.length }}/{{ exportFieldOptions.length }}</text>
            </view>
            <view class="export-actions">
              <button class="mini-btn" @tap="selectAllExportFields">全选</button>
              <button class="mini-btn mini-btn--ghost" @tap="resetExportFields">重置默认</button>
            </view>
            <view class="chip-row export-chip-wrap">
              <view
                v-for="item in exportFieldOptions"
                :key="item.key"
                class="chip chip--sort"
                :class="{ 'chip--active': exportSelectedFields.includes(item.key) }"
                @tap="toggleExportField(item.key)"
              >{{ item.label }}</view>
            </view>
          </view>
          <view class="export-config">
            <view class="title-row">
              <text class="export-config-title">趋势窗口（运营看板口径）</text>
              <text class="export-config-tip">周 {{ trendWeekWindow }} / 月 {{ trendMonthWindow }}</text>
            </view>
            <view class="export-actions export-actions--trend">
              <text class="export-tip">周窗口</text>
              <view class="chip-row">
                <view
                  v-for="item in trendWeekOptions"
                  :key="'week_' + item"
                  class="chip chip--sort"
                  :class="{ 'chip--active': trendWeekWindow === item }"
                  @tap="trendWeekWindow = item"
                >近{{ item }}周</view>
              </view>
            </view>
            <view class="export-actions export-actions--trend">
              <text class="export-tip">月窗口</text>
              <view class="chip-row">
                <view
                  v-for="item in trendMonthOptions"
                  :key="'month_' + item"
                  class="chip chip--sort"
                  :class="{ 'chip--active': trendMonthWindow === item }"
                  @tap="trendMonthWindow = item"
                >近{{ item }}月</view>
              </view>
            </view>
          </view>

          <view class="trend-dashboard">
            <view class="title-row">
              <text class="export-config-title">运营趋势看板预览</text>
              <view class="chip-row">
                <view
                  class="chip chip--sort"
                  :class="{ 'chip--active': trendDashboardMode === 'week' }"
                  @tap="trendDashboardMode = 'week'"
                >周趋势</view>
                <view
                  class="chip chip--sort"
                  :class="{ 'chip--active': trendDashboardMode === 'month' }"
                  @tap="trendDashboardMode = 'month'"
                >月趋势</view>
              </view>
            </view>

            <view class="trend-kpi-grid">
              <view
                v-for="card in trendSummaryCards"
                :key="card.key"
                class="trend-kpi-card"
              >
                <text class="trend-kpi-label">{{ card.label }}</text>
                <text class="trend-kpi-value">{{ card.value }}</text>
                <text class="trend-kpi-sub">{{ card.sub }}</text>
              </view>
            </view>

            <view class="trend-legend">
              <text class="trend-legend-item trend-legend-item--activity">活动</text>
              <text class="trend-legend-item trend-legend-item--report">举报</text>
              <text class="trend-legend-item trend-legend-item--action">管理动作</text>
            </view>

            <view v-if="trendDashboardRows.length === 0" class="empty">
              <text class="empty-text">暂无趋势数据，可先导入趋势测试数据</text>
            </view>
            <view v-else class="trend-list">
              <view
                v-for="row in trendDashboardRows"
                :key="row.key"
                class="trend-row"
              >
                <view class="title-row">
                  <text class="card-sub">{{ row.label }}</text>
                  <text class="card-openid">活动{{ row.publishedActivityCount }} · 举报{{ row.newReportCount }} · 动作{{ row.adminActionCount }}</text>
                </view>

                <view class="trend-bar-wrap">
                  <view class="trend-bar-track">
                    <view
                      class="trend-bar-fill trend-bar-fill--activity"
                      :style="{ width: trendMetricBarWidth(row.publishedActivityCount) }"
                    />
                  </view>
                  <view class="trend-bar-track">
                    <view
                      class="trend-bar-fill trend-bar-fill--report"
                      :style="{ width: trendMetricBarWidth(row.newReportCount) }"
                    />
                  </view>
                  <view class="trend-bar-track">
                    <view
                      class="trend-bar-fill trend-bar-fill--action"
                      :style="{ width: trendMetricBarWidth(row.adminActionCount) }"
                    />
                  </view>
                </view>
              </view>
            </view>

            <view v-if="trendDashboardRows.length > 0" class="trend-category-panel">
              <text class="export-config-title">分类小图表（活动发布）</text>
              <view class="trend-category-grid">
                <view
                  v-for="card in trendCategoryCards"
                  :key="card.key"
                  class="trend-category-card"
                >
                  <view class="title-row">
                    <text class="card-sub">{{ card.label }}</text>
                    <text class="card-openid">本期 {{ card.latestCount }} · 环比 {{ card.latestRate }}</text>
                  </view>
                  <view class="trend-mini-bars">
                    <view
                      v-for="point in card.points"
                      :key="`${card.key}_${point.key}`"
                      class="trend-mini-row"
                    >
                      <text class="trend-mini-label">{{ point.shortLabel }}</text>
                      <view class="trend-mini-track">
                        <view
                          class="trend-mini-fill"
                          :class="card.fillClass"
                          :style="{ width: point.width }"
                        />
                      </view>
                      <text class="trend-mini-value">{{ point.count }}</text>
                    </view>
                  </view>
                </view>
              </view>
            </view>

            <view class="export-actions">
              <button class="mini-btn mini-btn--ghost" @tap="copyTrendInsight">复制看板解读</button>
            </view>
          </view>
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
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = `${now.getMonth() + 1}`.padStart(2, '0')
    const dd = `${now.getDate()}`.padStart(2, '0')
    const today = `${yyyy}-${mm}-${dd}`

    return {
      activeTab: 'todo',
      activeFilter: 'all',
      searchKeyword: '',
      todoSlaHours: 24,
      reportSort: 'created_desc',
      logTimeRange: 'all',
      logCustomStartDate: today,
      logCustomEndDate: today,
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
      csvExportingV2: false,
      trendCsvExporting: false,
      trendWeekWindow: 12,
      trendMonthWindow: 6,
      trendDashboardMode: 'week',
      loading: false,
      hasAccess: true,
      currentAdminOpenid: '',
      adminRole: '',
      cityId: '',
      pendingVerifyList: [],
      reportList: [],
      activityList: [],
      actionLogList: [],
      exportSelectedFields: [
        'createdAt',
        'actionText',
        'action',
        'result',
        'targetType',
        'targetId',
        'linkedActivityId',
        'adminRole',
        'adminOpenid',
        'reason',
      ],
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
        todo: '搜索待办：用户/活动/原因',
        verify: '搜索昵称 / openid',
        reports: '搜索举报原因 / 举报人 / 活动ID',
        activities: '搜索标题 / 地址 / 发布者 / 活动ID',
        logs: '搜索原因 / 对象ID / 关联活动ID / 管理员',
      }
      return map[this.activeTab] || '搜索'
    },

    pendingReportTodoList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const nowTs = Date.now()
      const list = this.reportList
        .filter((item) => (item.reportStatus || 'PENDING') === 'PENDING')
        .map((item) => {
          const createdTs = this.toTimestamp(item.createdAt)
          const waitHours = Number.isFinite(createdTs) ? Math.max(0, (nowTs - createdTs) / 3600000) : 0
          const title = item.targetActivity?.title || ''
          return {
            ...item,
            waitHours,
            waitHoursText: this.formatHoursText(waitHours),
            isOverSla: waitHours >= this.todoSlaHours,
            _searchText: [item.reason, title, item.targetId, item.reporterNickname, item.reporterOpenid].join(' '),
          }
        })
        .filter((item) => !keyword || String(item._searchText || '').toLowerCase().includes(keyword))
        .sort((a, b) => {
          if (a.isOverSla !== b.isOverSla) return a.isOverSla ? -1 : 1
          return b.waitHours - a.waitHours
        })

      return list
    },

    pendingVerifyTodoList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const nowTs = Date.now()
      return this.pendingVerifyList
        .map((item) => {
          const baseTs = this.toTimestamp(item.verifySubmittedAt || item.updatedAt || item.createdAt)
          const waitHours = Number.isFinite(baseTs) ? Math.max(0, (nowTs - baseTs) / 3600000) : 0
          return {
            ...item,
            waitHours,
            waitHoursText: this.formatHoursText(waitHours),
            isOverSla: waitHours >= this.todoSlaHours,
            _searchText: [item.nickname, item._openid].join(' '),
          }
        })
        .filter((item) => !keyword || String(item._searchText || '').toLowerCase().includes(keyword))
        .sort((a, b) => {
          if (a.isOverSla !== b.isOverSla) return a.isOverSla ? -1 : 1
          return b.waitHours - a.waitHours
        })
    },

    upcomingActivityTodoList() {
      const keyword = this.normalizeKeyword(this.searchKeyword)
      const nowTs = Date.now()
      const maxTs = nowTs + 24 * 3600000

      return this.activityList
        .filter((item) => ['OPEN', 'FULL'].includes(item.status))
        .map((item) => {
          const startTs = this.toTimestamp(item.startTime)
          const startInHours = Number.isFinite(startTs) ? (startTs - nowTs) / 3600000 : NaN
          return {
            ...item,
            startTs,
            startInHours,
            startInText: this.formatHoursText(startInHours),
            isUrgent: Number.isFinite(startInHours) && startInHours <= 2,
            _searchText: [item.title, item.categoryLabel, item.location?.address].join(' '),
          }
        })
        .filter((item) => Number.isFinite(item.startTs) && item.startTs >= nowTs && item.startTs <= maxTs)
        .filter((item) => !keyword || String(item._searchText || '').toLowerCase().includes(keyword))
        .sort((a, b) => a.startTs - b.startTs)
    },

    todoTotalCount() {
      return this.pendingReportTodoList.length + this.pendingVerifyTodoList.length + this.upcomingActivityTodoList.length
    },

    overdueTodoCount() {
      return this.pendingReportTodoList.filter((item) => item.isOverSla).length
        + this.pendingVerifyTodoList.filter((item) => item.isOverSla).length
        + this.upcomingActivityTodoList.filter((item) => item.isUrgent).length
    },

    recentClosureList() {
      return this.reportList
        .filter((item) => ['HANDLED', 'IGNORED'].includes(item.reportStatus) && item.handledAt)
        .map((item) => {
          const createdTs = this.toTimestamp(item.createdAt)
          const handledTs = this.toTimestamp(item.handledAt)
          const handleHours = (Number.isFinite(createdTs) && Number.isFinite(handledTs) && handledTs >= createdTs)
            ? (handledTs - createdTs) / 3600000
            : 0
          return {
            ...item,
            handleHours,
            handleHoursText: this.formatHoursText(handleHours),
          }
        })
        .sort((a, b) => this.toTimestamp(b.handledAt) - this.toTimestamp(a.handledAt))
        .slice(0, 8)
    },

    closureStats() {
      const allClosed = this.reportList
        .filter((item) => ['HANDLED', 'IGNORED'].includes(item.reportStatus) && item.handledAt)
        .map((item) => {
          const createdTs = this.toTimestamp(item.createdAt)
          const handledTs = this.toTimestamp(item.handledAt)
          const hours = (Number.isFinite(createdTs) && Number.isFinite(handledTs) && handledTs >= createdTs)
            ? (handledTs - createdTs) / 3600000
            : 0
          return { ...item, handleHours: hours }
        })

      if (allClosed.length === 0) {
        return {
          closedCount: 0,
          avgHandleHours: '0.0',
          withinSlaCount: 0,
          withinSlaRate: '0.0%',
        }
      }

      const totalHours = allClosed.reduce((sum, item) => sum + (item.handleHours || 0), 0)
      const withinSlaCount = allClosed.filter((item) => (item.handleHours || 0) <= this.todoSlaHours).length
      return {
        closedCount: allClosed.length,
        avgHandleHours: (totalHours / allClosed.length).toFixed(1),
        withinSlaCount,
        withinSlaRate: `${((withinSlaCount / allClosed.length) * 100).toFixed(1)}%`,
      }
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
        { label: '时间：自定义', value: 'custom' },
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

    exportFieldOptions() {
      return [
        { key: 'createdAt', label: '时间' },
        { key: 'actionText', label: '动作中文' },
        { key: 'action', label: '动作编码' },
        { key: 'result', label: '结果' },
        { key: 'targetType', label: '对象类型' },
        { key: 'targetId', label: '对象ID' },
        { key: 'linkedActivityId', label: '关联活动ID' },
        { key: 'adminRole', label: '操作者角色' },
        { key: 'adminOpenid', label: '操作者OPENID' },
        { key: 'reason', label: '原因' },
      ]
    },

    trendWeekOptions() {
      return [8, 12, 16, 24]
    },

    trendMonthOptions() {
      return [3, 6, 12]
    },

    trendWeekRows() {
      return this.buildTrendRows(this.buildWeekPeriods(this.trendWeekWindow))
    },

    trendMonthRows() {
      return this.buildTrendRows(this.buildMonthPeriods(this.trendMonthWindow))
    },

    trendDashboardRows() {
      return this.trendDashboardMode === 'month' ? this.trendMonthRows : this.trendWeekRows
    },

    trendDashboardScaleMax() {
      return this.trendDashboardRows.reduce((max, row) => {
        return Math.max(max, row.publishedActivityCount || 0, row.newReportCount || 0, row.adminActionCount || 0)
      }, 1)
    },

    trendSummaryCards() {
      const rows = this.trendDashboardRows
      const latest = rows[rows.length - 1]
      if (!latest) {
        return [
          { key: 'activity', label: '新发布活动', value: 0, sub: '环比 -' },
          { key: 'report', label: '新增举报', value: 0, sub: '环比 -' },
          { key: 'action', label: '管理动作', value: 0, sub: '环比 -' },
        ]
      }

      return [
        {
          key: 'activity',
          label: '新发布活动',
          value: latest.publishedActivityCount || 0,
          sub: `环比 ${latest.activityGrowthRate || '-'}`,
        },
        {
          key: 'report',
          label: '新增举报',
          value: latest.newReportCount || 0,
          sub: `环比 ${latest.reportGrowthRate || '-'}`,
        },
        {
          key: 'action',
          label: '管理动作',
          value: latest.adminActionCount || 0,
          sub: `环比 ${latest.actionGrowthRate || '-'}`,
        },
      ]
    },

    trendCategoryCards() {
      const rows = this.trendDashboardRows
      const categories = [
        { key: 'sport', label: '运动', fillClass: 'trend-mini-fill--sport' },
        { key: 'music', label: '音乐', fillClass: 'trend-mini-fill--music' },
        { key: 'reading', label: '读书', fillClass: 'trend-mini-fill--reading' },
      ]

      if (rows.length === 0) {
        return categories.map((item) => ({
          ...item,
          latestCount: 0,
          latestRate: '-',
          points: [],
        }))
      }

      const scaleMax = rows.reduce((max, row) => {
        const map = row.categoryPublishedMap || {}
        return Math.max(max, map.sport || 0, map.music || 0, map.reading || 0)
      }, 1)

      const buildShortLabel = (label = '', key = '') => {
        if (this.trendDashboardMode === 'month') return key.slice(5) || label
        const idx = label.indexOf('-')
        if (idx > 0) return label.slice(0, idx)
        return label
      }

      return categories.map((item) => {
        const points = rows.map((row) => {
          const count = Number(row.categoryPublishedMap?.[item.key] || 0)
          return {
            key: row.key,
            shortLabel: buildShortLabel(row.label, row.key),
            count,
            width: this.calcMiniBarWidth(count, scaleMax),
          }
        })
        const latest = points[points.length - 1]
        const prev = points[points.length - 2]
        return {
          ...item,
          latestCount: latest?.count || 0,
          latestRate: prev ? this.formatRate(latest?.count || 0, prev?.count || 0) : '-',
          points,
        }
      })
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
      this.logCustomStartDate = this.getTodayDateToken()
      this.logCustomEndDate = this.getTodayDateToken()
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
    getTodayDateToken() {
      const now = new Date()
      const y = now.getFullYear()
      const mo = `${now.getMonth() + 1}`.padStart(2, '0')
      const day = `${now.getDate()}`.padStart(2, '0')
      return `${y}-${mo}-${day}`
    },

    getRangeDateBoundary(dateToken, endOfDay = false) {
      if (!dateToken || !/^\d{4}-\d{2}-\d{2}$/.test(dateToken)) return NaN
      const [y, m, d] = dateToken.split('-').map((n) => Number(n))
      const date = new Date(y, m - 1, d, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0)
      const ts = date.getTime()
      return Number.isFinite(ts) ? ts : NaN
    },

    onPickLogStartDate(e) {
      const value = e?.detail?.value || ''
      if (!value) return
      if (this.logCustomEndDate && value > this.logCustomEndDate) {
        this.logCustomEndDate = value
      }
      this.logCustomStartDate = value
    },

    onPickLogEndDate(e) {
      const value = e?.detail?.value || ''
      if (!value) return
      if (this.logCustomStartDate && value < this.logCustomStartDate) {
        this.logCustomStartDate = value
      }
      this.logCustomEndDate = value
    },

    toggleExportField(fieldKey) {
      if (!fieldKey) return
      const exists = this.exportSelectedFields.includes(fieldKey)
      if (exists) {
        if (this.exportSelectedFields.length === 1) {
          uni.showToast({ title: '至少保留1个字段', icon: 'none' })
          return
        }
        this.exportSelectedFields = this.exportSelectedFields.filter((key) => key !== fieldKey)
        return
      }
      this.exportSelectedFields = [...this.exportSelectedFields, fieldKey]
    },

    selectAllExportFields() {
      this.exportSelectedFields = this.exportFieldOptions.map((item) => item.key)
    },

    resetExportFields() {
      this.exportSelectedFields = [
        'createdAt',
        'actionText',
        'action',
        'result',
        'targetType',
        'targetId',
        'linkedActivityId',
        'adminRole',
        'adminOpenid',
        'reason',
      ]
    },

    getExportDetailFieldDefs() {
      const valueResolver = {
        createdAt: (item) => this.formatExportTime(new Date(item.createdAt || Date.now())),
        actionText: (item) => this.actionText(item.action),
        action: (item) => item.action || '',
        result: (item) => item.result || '',
        targetType: (item) => item.targetType || '',
        targetId: (item) => item.targetId || '',
        linkedActivityId: (item) => item.linkedActivityId || '',
        adminRole: (item) => item.adminRole || '',
        adminOpenid: (item) => item.adminOpenid || '',
        reason: (item) => item.reason || '',
      }
      const selectedKeys = this.exportFieldOptions
        .filter((item) => this.exportSelectedFields.includes(item.key))
        .map((item) => item.key)

      const finalKeys = selectedKeys.length > 0 ? selectedKeys : ['createdAt', 'actionText', 'action', 'targetId']
      return this.exportFieldOptions
        .filter((item) => finalKeys.includes(item.key))
        .map((item) => ({
          key: item.key,
          label: item.label,
          value: valueResolver[item.key],
        }))
    },

    formatHoursText(hours) {
      const safe = Number(hours)
      if (!Number.isFinite(safe) || safe <= 0) return '<1h'
      if (safe < 1) return '<1h'
      if (safe < 24) return `${Math.round(safe)}h`
      return `${(safe / 24).toFixed(1)}d`
    },

    getReasonTemplateOptions(scene) {
      const map = {
        verify: ['实名资料齐全，审核通过', '信息一致，允许发布活动'],
        reject_verify: ['资料不完整，请补充后重试', '信息不一致，暂不通过'],
        resolve_report_hide: ['举报成立，先下架复核', '内容违规，按规则下架处理'],
        resolve_report_ignore: ['举报不成立，已记录并忽略', '核查无异常，本次不处理'],
        recommend: ['活动质量高，进入推荐位', '符合运营主题，给予推荐'],
        unrecommend: ['活动热度下降，退出推荐位', '推荐策略调整，先取消推荐'],
      }
      return map[scene] || ['按平台规则处理']
    },

    pickReasonTemplate(scene) {
      const options = this.getReasonTemplateOptions(scene)
      return new Promise((resolve) => {
        uni.showActionSheet({
          itemList: options,
          success: (res) => {
            resolve(options[res.tapIndex] || '')
          },
          fail: () => resolve(''),
        })
      })
    },

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

    // 审核认证（支持快捷模板）
    async verifyUser(openid, action, presetReason = '') {
      const actionText = action === 'verify' ? '通过认证' : '拒绝认证'
      const execute = async (reasonText) => {
        try {
          const result = await callCloud('adminAction', {
            action,
            targetId: openid,
            targetType: 'user',
            reason: reasonText,
          })
          if (result.success) {
            uni.showToast({ title: result.message, icon: 'success' })
            await this.loadData()
          } else {
            uni.showToast({ title: result.message || '操作失败', icon: 'none' })
          }
        } catch (e) {
          uni.showToast({ title: '操作失败，请重试', icon: 'none' })
        }
      }

      if (presetReason) {
        uni.showModal({
          title: `确认${actionText}？`,
          content: `将使用模板原因：${presetReason}`,
          success: async (res) => {
            if (!res.confirm) return
            await execute(presetReason)
          },
        })
        return
      }

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
          await execute(res.content.trim())
        },
      })
    },

    async verifyUserQuick(openid, action) {
      const reason = await this.pickReasonTemplate(action)
      if (!reason) return
      await this.verifyUser(openid, action, reason)
    },

    // 处理举报：下架活动（支持快捷模板）
    async handleReport(reportItem, presetReason = '') {
      const execute = async (reasonText) => {
        this.reportHandlingId = reportItem._id
        this.reportHandlingAction = 'resolve_report_hide'
        try {
          const result = await callCloud('adminAction', {
            action: 'resolve_report_hide',
            reportId: reportItem._id,
            targetId: reportItem.targetId,
            targetType: 'report',
            reason: reasonText,
          })
          if (result.success) {
            if (this.activeFilter === 'PENDING') this.activeFilter = 'all'
            uni.showToast({ title: result.message || '举报已处理', icon: 'success' })
            await this.loadData()
            this.markReportHandled(reportItem._id, 'HANDLED')
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

      if (presetReason) {
        uni.showModal({
          title: '确认下架并处理？',
          content: `将使用模板原因：${presetReason}`,
          success: async (res) => {
            if (!res.confirm) return
            await execute(presetReason)
          },
        })
        return
      }

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
          await execute(res.content.trim())
        },
      })
    },

    async handleReportQuick(reportItem) {
      const reason = await this.pickReasonTemplate('resolve_report_hide')
      if (!reason) return
      await this.handleReport(reportItem, reason)
    },

    // 忽略举报（支持快捷模板）
    async ignoreReport(reportItem, presetReason = '') {
      const execute = async (reasonText) => {
        this.reportHandlingId = reportItem._id
        this.reportHandlingAction = 'resolve_report_ignore'
        try {
          const result = await callCloud('adminAction', {
            action: 'resolve_report_ignore',
            reportId: reportItem._id,
            targetId: reportItem.targetId,
            targetType: 'report',
            reason: reasonText,
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

      if (presetReason) {
        uni.showModal({
          title: '确认忽略并处理？',
          content: `将使用模板原因：${presetReason}`,
          success: async (res) => {
            if (!res.confirm) return
            await execute(presetReason)
          },
        })
        return
      }

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
          await execute(res.content.trim())
        },
      })
    },

    async ignoreReportQuick(reportItem) {
      const reason = await this.pickReasonTemplate('resolve_report_ignore')
      if (!reason) return
      await this.ignoreReport(reportItem, reason)
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

      if (this.logTimeRange === 'custom') {
        const start = this.getRangeDateBoundary(this.logCustomStartDate, false)
        const end = this.getRangeDateBoundary(this.logCustomEndDate, true)
        if (!Number.isFinite(start) || !Number.isFinite(end)) return true
        return ts >= start && ts <= end
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

    toTimestamp(value) {
      const ts = new Date(value).getTime()
      return Number.isFinite(ts) ? ts : NaN
    },

    formatYmd(dateLike) {
      const date = new Date(dateLike)
      if (Number.isNaN(date.getTime())) return ''
      const y = date.getFullYear()
      const mo = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      return `${y}-${mo}-${day}`
    },

    formatMd(dateLike) {
      const date = new Date(dateLike)
      if (Number.isNaN(date.getTime())) return '--'
      return `${date.getMonth() + 1}/${date.getDate()}`
    },

    getWeekStartDate(dateLike) {
      const date = new Date(dateLike)
      if (Number.isNaN(date.getTime())) return null
      const day = date.getDay()
      const diff = day === 0 ? 6 : day - 1
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate() - diff, 0, 0, 0, 0)
      return start
    },

    buildWeekPeriods(windowSize = 12) {
      const safeWindow = Math.min(Math.max(Number(windowSize) || 12, 4), 24)
      const currentWeekStart = this.getWeekStartDate(new Date())
      const periods = []
      if (!currentWeekStart) return periods

      for (let i = safeWindow - 1; i >= 0; i -= 1) {
        const start = new Date(currentWeekStart.getTime() - i * 7 * 24 * 60 * 60 * 1000)
        const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000)
        end.setHours(23, 59, 59, 999)
        periods.push({
          key: this.formatYmd(start),
          label: `${this.formatMd(start)}-${this.formatMd(end)}`,
          startTs: start.getTime(),
          endTs: end.getTime(),
        })
      }
      return periods
    },

    buildMonthPeriods(windowSize = 6) {
      const safeWindow = Math.min(Math.max(Number(windowSize) || 6, 3), 18)
      const now = new Date()
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const periods = []

      for (let i = safeWindow - 1; i >= 0; i -= 1) {
        const start = new Date(currentMonthStart.getFullYear(), currentMonthStart.getMonth() - i, 1, 0, 0, 0, 0)
        const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999)
        const y = start.getFullYear()
        const mo = `${start.getMonth() + 1}`.padStart(2, '0')
        periods.push({
          key: `${y}-${mo}`,
          label: `${y}-${mo}`,
          startTs: start.getTime(),
          endTs: end.getTime(),
        })
      }
      return periods
    },

    resolveActionActivityId(item = {}) {
      if (item.linkedActivityId) return item.linkedActivityId
      if (item.targetType === 'activity' && item.targetId) return item.targetId
      return ''
    },

    isInPeriod(ts, period) {
      return Number.isFinite(ts) && ts >= period.startTs && ts <= period.endTs
    },

    formatRate(current, previous) {
      if (!Number.isFinite(current) || !Number.isFinite(previous)) return '-'
      if (previous === 0) {
        if (current === 0) return '0.0%'
        return '+∞'
      }
      const value = ((current - previous) / previous) * 100
      const sign = value > 0 ? '+' : ''
      return `${sign}${value.toFixed(1)}%`
    },

    normalizeTrendCategory(categoryId = '') {
      const safe = String(categoryId || '').trim().toLowerCase()
      if (['sport', 'music', 'reading', 'game', 'social', 'outdoor', 'other'].includes(safe)) {
        return safe
      }
      return 'other'
    },

    calcMiniBarWidth(value, max = 1) {
      const safeValue = Number(value) || 0
      if (safeValue <= 0) return '0%'
      const safeMax = Number(max) > 0 ? Number(max) : 1
      const pct = Math.max(10, Math.round((safeValue / safeMax) * 100))
      return `${Math.min(100, pct)}%`
    },

    buildTrendRows(periods = []) {
      const highRiskActionSet = new Set(['hide', 'ban', 'resolve_report_hide', 'reject_verify'])
      const reportHandledStatusSet = new Set(['HANDLED', 'IGNORED'])
      const reportHandleActionSet = new Set(['resolve_report_hide', 'resolve_report_ignore'])

      const rows = periods.map((period) => {
        const touchedActivities = new Set()
        const activeAdmins = new Set()
        const categoryPublishedMap = {
          sport: 0,
          music: 0,
          reading: 0,
          game: 0,
          social: 0,
          outdoor: 0,
          other: 0,
        }
        let publishedActivityCount = 0
        let publishedRecommendedCount = 0
        this.activityList.forEach((item) => {
          const ts = this.toTimestamp(item.createdAt)
          if (!this.isInPeriod(ts, period)) return
          publishedActivityCount += 1
          if (item.isRecommended) publishedRecommendedCount += 1
          const category = this.normalizeTrendCategory(item.categoryId)
          categoryPublishedMap[category] = (categoryPublishedMap[category] || 0) + 1
        })

        const newReportCount = this.reportList.reduce((count, item) => {
          const ts = this.toTimestamp(item.createdAt)
          return count + (this.isInPeriod(ts, period) ? 1 : 0)
        }, 0)

        const handledReportCount = this.reportList.reduce((count, item) => {
          if (!reportHandledStatusSet.has(item.reportStatus)) return count
          const ts = this.toTimestamp(item.handledAt)
          return count + (this.isInPeriod(ts, period) ? 1 : 0)
        }, 0)

        let adminActionCount = 0
        let highRiskActionCount = 0
        let reportHandleActionCount = 0
        this.actionLogList.forEach((item) => {
          const ts = this.toTimestamp(item.createdAt)
          if (!this.isInPeriod(ts, period)) return
          adminActionCount += 1
          if (highRiskActionSet.has(item.action)) highRiskActionCount += 1
          if (reportHandleActionSet.has(item.action)) reportHandleActionCount += 1
          const activityId = this.resolveActionActivityId(item)
          if (activityId) touchedActivities.add(activityId)
          if (item.adminOpenid) activeAdmins.add(item.adminOpenid)
        })

        return {
          ...period,
          publishedActivityCount,
          publishedRecommendedCount,
          categoryPublishedMap,
          newReportCount,
          handledReportCount,
          adminActionCount,
          highRiskActionCount,
          reportHandleActionCount,
          touchedActivityCount: touchedActivities.size,
          activeAdminCount: activeAdmins.size,
        }
      })

      return rows.map((row, index) => {
        const prev = rows[index - 1]
        return {
          ...row,
          activityGrowthRate: prev ? this.formatRate(row.publishedActivityCount, prev.publishedActivityCount) : '-',
          reportGrowthRate: prev ? this.formatRate(row.newReportCount, prev.newReportCount) : '-',
          actionGrowthRate: prev ? this.formatRate(row.adminActionCount, prev.adminActionCount) : '-',
        }
      })
    },

    trendMetricBarWidth(value) {
      const safeValue = Number(value) || 0
      if (safeValue <= 0) return '0%'
      const max = Number(this.trendDashboardScaleMax) || 1
      const pct = Math.max(8, Math.round((safeValue / max) * 100))
      return `${Math.min(100, pct)}%`
    },

    buildTrendInsightText() {
      const modeText = this.trendDashboardMode === 'month'
        ? `月趋势（近${this.trendMonthWindow}月）`
        : `周趋势（近${this.trendWeekWindow}周）`
      const rows = this.trendDashboardRows
      const latest = rows[rows.length - 1]
      if (!latest) {
        return `【搭里运营看板解读】\n口径：${modeText}\n暂无可分析数据，可先导入趋势测试数据。`
      }

      const topActionRow = [...rows]
        .sort((a, b) => (b.adminActionCount || 0) - (a.adminActionCount || 0))[0]
      const topReportRow = [...rows]
        .sort((a, b) => (b.newReportCount || 0) - (a.newReportCount || 0))[0]
      const latestCategoryMap = latest.categoryPublishedMap || {}
      const categoryPairs = [
        ['运动', Number(latestCategoryMap.sport || 0)],
        ['音乐', Number(latestCategoryMap.music || 0)],
        ['读书', Number(latestCategoryMap.reading || 0)],
      ]
      const topCategory = categoryPairs.sort((a, b) => b[1] - a[1])[0]

      return [
        '【搭里运营看板解读】',
        `口径：${modeText}`,
        `当前周期：${latest.label}`,
        `新发布活动：${latest.publishedActivityCount}（环比 ${latest.activityGrowthRate}）`,
        `分类发布：运动 ${latestCategoryMap.sport || 0} / 音乐 ${latestCategoryMap.music || 0} / 读书 ${latestCategoryMap.reading || 0}`,
        `分类主力：${topCategory?.[0] || '-'}（${topCategory?.[1] || 0}）`,
        `新增举报：${latest.newReportCount}（环比 ${latest.reportGrowthRate}）`,
        `管理动作：${latest.adminActionCount}（环比 ${latest.actionGrowthRate}）`,
        `本周期已处理举报：${latest.handledReportCount}，高风险动作：${latest.highRiskActionCount}`,
        `管理最繁忙周期：${topActionRow?.label || '-'}（动作 ${topActionRow?.adminActionCount || 0}）`,
        `举报最高周期：${topReportRow?.label || '-'}（新增举报 ${topReportRow?.newReportCount || 0}）`,
      ].join('\n')
    },

    buildTrendCsv() {
      const lines = []
      const append = (values = []) => lines.push(this.buildCsvLine(values))
      const now = new Date()
      const weekPeriods = this.buildWeekPeriods(this.trendWeekWindow)
      const monthPeriods = this.buildMonthPeriods(this.trendMonthWindow)
      const weekRows = this.buildTrendRows(weekPeriods)
      const monthRows = this.buildTrendRows(monthPeriods)

      append(['搭里运营看板趋势报表（周/月）'])
      append(['导出时间', this.formatExportTime(now)])
      append(['导出角色', this.adminRoleLabel])
      append(['城市范围', this.cityIdLabel])
      append(['周窗口', `近${this.trendWeekWindow}周`])
      append(['月窗口', `近${this.trendMonthWindow}月`])
      append(['数据口径', 'activityList.createdAt / reportList.createdAt|handledAt / actionLogList.createdAt'])
      append([])

      append(['一、周趋势（运营看板口径）'])
      append([
        '周序',
        '周范围',
        '新发布活动',
        '运动发布',
        '音乐发布',
        '读书发布',
        '新发布推荐活动',
        '新增举报',
        '已处理举报',
        '管理动作',
        '高风险动作',
        '举报处理动作',
        '触达活动数',
        '活跃管理员数',
        '活动发布环比',
        '举报环比',
        '管理动作环比',
      ])
      if (weekRows.length === 0) {
        append(['-', '-', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '-', '-', '-'])
      } else {
        weekRows.forEach((row, index) => {
          const categoryMap = row.categoryPublishedMap || {}
          append([
            index + 1,
            row.label,
            row.publishedActivityCount,
            categoryMap.sport || 0,
            categoryMap.music || 0,
            categoryMap.reading || 0,
            row.publishedRecommendedCount,
            row.newReportCount,
            row.handledReportCount,
            row.adminActionCount,
            row.highRiskActionCount,
            row.reportHandleActionCount,
            row.touchedActivityCount,
            row.activeAdminCount,
            row.activityGrowthRate,
            row.reportGrowthRate,
            row.actionGrowthRate,
          ])
        })
      }
      append([])

      append(['二、月趋势（运营看板口径）'])
      append([
        '月序',
        '月份',
        '新发布活动',
        '运动发布',
        '音乐发布',
        '读书发布',
        '新发布推荐活动',
        '新增举报',
        '已处理举报',
        '管理动作',
        '高风险动作',
        '举报处理动作',
        '触达活动数',
        '活跃管理员数',
        '活动发布环比',
        '举报环比',
        '管理动作环比',
      ])
      if (monthRows.length === 0) {
        append(['-', '-', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, '-', '-', '-'])
      } else {
        monthRows.forEach((row, index) => {
          const categoryMap = row.categoryPublishedMap || {}
          append([
            index + 1,
            row.label,
            row.publishedActivityCount,
            categoryMap.sport || 0,
            categoryMap.music || 0,
            categoryMap.reading || 0,
            row.publishedRecommendedCount,
            row.newReportCount,
            row.handledReportCount,
            row.adminActionCount,
            row.highRiskActionCount,
            row.reportHandleActionCount,
            row.touchedActivityCount,
            row.activeAdminCount,
            row.activityGrowthRate,
            row.reportGrowthRate,
            row.actionGrowthRate,
          ])
        })
      }

      return lines.join('\n')
    },

    async copyTrendInsight() {
      try {
        const text = this.buildTrendInsightText()
        await this.saveCsvToClipboard(text)
        uni.showToast({ title: '看板解读已复制', icon: 'success' })
      } catch (e) {
        console.error('复制看板解读失败', e)
        uni.showToast({ title: '复制失败，请重试', icon: 'none' })
      }
    },

    getCurrentLogExportContext() {
      const exportLogList = this.filteredActionLogList
      const exportDetailFieldDefs = this.getExportDetailFieldDefs()
      const exportRangeText = this.logTimeRange === 'custom'
        ? `${this.logCustomStartDate || '--'} 至 ${this.logCustomEndDate || '--'}`
        : this.logTimeRange
      const selectedFieldText = exportDetailFieldDefs.map((item) => item.label).join(' / ')
      return {
        exportLogList,
        exportDetailFieldDefs,
        exportRangeText,
        selectedFieldText,
      }
    },

    buildStatsCsv() {
      const lines = []
      const append = (values = []) => lines.push(this.buildCsvLine(values))
      const {
        exportLogList,
        exportDetailFieldDefs,
        exportRangeText,
        selectedFieldText,
      } = this.getCurrentLogExportContext()

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
      exportLogList.forEach((item) => {
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
      append(['筛选上下文', `filter=${this.activeFilter}; keyword=${this.searchKeyword || '-'}; logTime=${exportRangeText}; logView=${this.logViewMode}; logSort=${this.logSort}; operator=${this.logOperator}; role=${this.logRole}`])
      append(['明细字段', selectedFieldText || '-'])
      append([])

      append(['一、总览指标'])
      append(['指标', '数值'])
      append(['待审认证', this.pendingVerifyList.length])
      append(['待处理举报', reportCounter.PENDING || 0])
      append(['活跃活动(OPEN+FULL)', this.activeActivityCount])
      append(['活动总量', this.activityList.length])
      append(['举报记录总量', this.reportList.length])
      append(['操作记录总量', this.actionLogList.length])
      append(['导出范围操作记录', exportLogList.length])
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
      append(exportDetailFieldDefs.map((item) => item.label))
      if (exportLogList.length === 0) {
        append(exportDetailFieldDefs.map(() => '-'))
      } else {
        exportLogList.forEach((item) => {
          append(exportDetailFieldDefs.map((field) => field.value(item)))
        })
      }

      return lines.join('\n')
    },

    buildSummaryCsvV2() {
      const lines = []
      const append = (values = []) => lines.push(this.buildCsvLine(values))
      const now = new Date()
      const { exportLogList, exportRangeText, selectedFieldText } = this.getCurrentLogExportContext()
      const highRiskActionSet = new Set(['hide', 'ban', 'resolve_report_hide', 'reject_verify'])
      const reportHandleActionSet = new Set(['resolve_report_hide', 'resolve_report_ignore'])
      const activityMap = this.activityList.reduce((acc, item) => {
        if (item && item._id) acc[item._id] = item
        return acc
      }, {})

      const activityAggMap = {}
      exportLogList.forEach((item) => {
        const activityId = item.linkedActivityId || (item.targetType === 'activity' ? item.targetId : '')
        if (!activityId) return
        const baseActivity = activityMap[activityId] || item.linkedActivity || {}
        if (!activityAggMap[activityId]) {
          activityAggMap[activityId] = {
            activityId,
            title: baseActivity.title || '',
            status: baseActivity.status || '',
            publisherNickname: baseActivity.publisherNickname || '',
            actionCount: 0,
            highRiskCount: 0,
            reportHandleCount: 0,
            recommendCount: 0,
            latestActionAt: '',
            latestTs: 0,
            totalReports: Number(baseActivity.reportMeta?.total || 0),
            pendingReports: Number(baseActivity.reportMeta?.pending || 0),
          }
        }
        const row = activityAggMap[activityId]
        row.actionCount += 1
        if (highRiskActionSet.has(item.action)) row.highRiskCount += 1
        if (reportHandleActionSet.has(item.action)) row.reportHandleCount += 1
        if (item.action === 'recommend' || item.action === 'unrecommend') row.recommendCount += 1
        const ts = new Date(item.createdAt).getTime()
        if (Number.isFinite(ts) && ts > row.latestTs) {
          row.latestTs = ts
          row.latestActionAt = item.createdAt || ''
        }
      })
      const activityAggList = Object.values(activityAggMap).sort((a, b) => (
        b.actionCount - a.actionCount || b.latestTs - a.latestTs
      ))

      const operatorAggMap = {}
      exportLogList.forEach((item) => {
        const key = `${item.adminOpenid || ''}__${item.adminRole || 'superAdmin'}`
        if (!operatorAggMap[key]) {
          operatorAggMap[key] = {
            adminOpenid: item.adminOpenid || '',
            adminRole: item.adminRole || 'superAdmin',
            actionCount: 0,
            highRiskCount: 0,
            reportHandleCount: 0,
            touchedActivities: new Set(),
            latestActionAt: '',
            latestTs: 0,
          }
        }
        const row = operatorAggMap[key]
        row.actionCount += 1
        if (highRiskActionSet.has(item.action)) row.highRiskCount += 1
        if (reportHandleActionSet.has(item.action)) row.reportHandleCount += 1
        const activityId = item.linkedActivityId || (item.targetType === 'activity' ? item.targetId : '')
        if (activityId) row.touchedActivities.add(activityId)
        const ts = new Date(item.createdAt).getTime()
        if (Number.isFinite(ts) && ts > row.latestTs) {
          row.latestTs = ts
          row.latestActionAt = item.createdAt || ''
        }
      })
      const operatorAggList = Object.values(operatorAggMap)
        .map((row) => ({
          ...row,
          touchedActivityCount: row.touchedActivities.size,
        }))
        .sort((a, b) => b.actionCount - a.actionCount || b.latestTs - a.latestTs)

      const actionCounter = {}
      exportLogList.forEach((item) => {
        const action = item.action || 'unknown'
        actionCounter[action] = (actionCounter[action] || 0) + 1
      })
      const actionRows = Object.keys(actionCounter)
        .sort((a, b) => actionCounter[b] - actionCounter[a])
        .map((action) => [action, this.actionText(action), actionCounter[action]])

      append(['搭里管理统计报表（二期-汇总）'])
      append(['导出时间', this.formatExportTime(now)])
      append(['导出角色', this.adminRoleLabel])
      append(['城市范围', this.cityIdLabel])
      append(['筛选上下文', `filter=${this.activeFilter}; keyword=${this.searchKeyword || '-'}; logTime=${exportRangeText}; logView=${this.logViewMode}; logSort=${this.logSort}; operator=${this.logOperator}; role=${this.logRole}`])
      append(['明细字段', selectedFieldText || '-'])
      append(['导出范围操作记录', exportLogList.length])
      append([])

      append(['一、活动维度聚合（按当前筛选日志）'])
      append(['活动ID', '活动标题', '状态', '发布者', '管理动作总数', '高风险动作', '举报处理动作', '推荐相关动作', '累计举报', '待处理举报', '最近动作时间'])
      if (activityAggList.length === 0) {
        append(['-', '暂无', '-', '-', 0, 0, 0, 0, 0, 0, '-'])
      } else {
        activityAggList.forEach((row) => {
          append([
            row.activityId,
            row.title,
            row.status,
            row.publisherNickname,
            row.actionCount,
            row.highRiskCount,
            row.reportHandleCount,
            row.recommendCount,
            row.totalReports,
            row.pendingReports,
            row.latestActionAt ? this.formatExportTime(new Date(row.latestActionAt)) : '',
          ])
        })
      }
      append([])

      append(['二、管理员维度聚合（按当前筛选日志）'])
      append(['管理员OPENID', '管理员角色', '管理动作总数', '高风险动作', '举报处理动作', '触达活动数', '最近动作时间'])
      if (operatorAggList.length === 0) {
        append(['-', '-', 0, 0, 0, 0, '-'])
      } else {
        operatorAggList.forEach((row) => {
          append([
            row.adminOpenid,
            row.adminRole,
            row.actionCount,
            row.highRiskCount,
            row.reportHandleCount,
            row.touchedActivityCount,
            row.latestActionAt ? this.formatExportTime(new Date(row.latestActionAt)) : '',
          ])
        })
      }
      append([])

      append(['三、动作维度聚合（按当前筛选日志）'])
      append(['动作编码', '动作中文', '次数'])
      if (actionRows.length === 0) {
        append(['-', '-', 0])
      } else {
        actionRows.forEach((row) => append(row))
      }

      return lines.join('\n')
    },

    buildDetailCsvV2() {
      const lines = []
      const append = (values = []) => lines.push(this.buildCsvLine(values))
      const now = new Date()
      const {
        exportLogList,
        exportDetailFieldDefs,
        exportRangeText,
        selectedFieldText,
      } = this.getCurrentLogExportContext()

      append(['搭里管理统计报表（二期-明细）'])
      append(['导出时间', this.formatExportTime(now)])
      append(['导出角色', this.adminRoleLabel])
      append(['城市范围', this.cityIdLabel])
      append(['筛选上下文', `filter=${this.activeFilter}; keyword=${this.searchKeyword || '-'}; logTime=${exportRangeText}; logView=${this.logViewMode}; logSort=${this.logSort}; operator=${this.logOperator}; role=${this.logRole}`])
      append(['明细字段', selectedFieldText || '-'])
      append(['记录数量', exportLogList.length])
      append([])

      append(['序号', ...exportDetailFieldDefs.map((item) => item.label)])
      if (exportLogList.length === 0) {
        append(['-', ...exportDetailFieldDefs.map(() => '-')])
      } else {
        exportLogList.forEach((item, index) => {
          append([index + 1, ...exportDetailFieldDefs.map((field) => field.value(item))])
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
      if (this.csvExporting || this.csvExportingV2 || this.trendCsvExporting) return
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

    async exportStatsCsvV2() {
      if (this.csvExportingV2 || this.csvExporting || this.trendCsvExporting) return
      this.csvExportingV2 = true
      try {
        const token = this.formatDateToken(new Date())
        const summaryFileName = `dali_admin_summary_v2_${token}.csv`
        const detailFileName = `dali_admin_detail_v2_${token}.csv`
        const summaryCsv = this.buildSummaryCsvV2()
        const detailCsv = this.buildDetailCsvV2()

        try {
          const summaryPath = await this.saveCsvToFile(summaryCsv, summaryFileName)
          await this.saveCsvToFile(detailCsv, detailFileName)
          try {
            await this.openCsvFile(summaryPath)
          } catch (openErr) {
            console.warn('打开汇总报表失败', openErr)
          }
          uni.showModal({
            title: '二期双表已生成',
            content: `已生成文件：\n1) ${summaryFileName}\n2) ${detailFileName}\n\n可在“最近文件”或右上角菜单中继续查看/转发。`,
            showCancel: false,
          })
          return
        } catch (fileErr) {
          console.warn('双表保存失败，回退剪贴板', fileErr)
        }

        await this.saveCsvToClipboard(`${summaryCsv}\n\n${detailCsv}`)
        uni.showModal({
          title: '已复制二期报表内容',
          content: '当前环境不支持直接写入双文件，已复制“汇总+明细”到剪贴板，可粘贴后分别保存为两个 CSV 文件。',
          showCancel: false,
        })
      } catch (e) {
        console.error('导出二期双表失败', e)
        uni.showToast({ title: '导出失败，请重试', icon: 'none' })
      } finally {
        this.csvExportingV2 = false
      }
    },

    async exportTrendCsv() {
      if (this.trendCsvExporting || this.csvExporting || this.csvExportingV2) return
      this.trendCsvExporting = true
      try {
        const csvText = this.buildTrendCsv()
        const fileName = `dali_admin_trend_${this.formatDateToken(new Date())}.csv`
        try {
          const filePath = await this.saveCsvToFile(csvText, fileName)
          await this.openCsvFile(filePath)
          uni.showToast({ title: '趋势CSV已生成', icon: 'success' })
          return
        } catch (fileErr) {
          console.warn('保存趋势CSV失败，回退剪贴板', fileErr)
        }

        await this.saveCsvToClipboard(csvText)
        uni.showModal({
          title: '已复制趋势CSV内容',
          content: '当前环境不支持直接打开文件，已复制到剪贴板，可粘贴到表格工具保存为 .csv',
          showCancel: false,
        })
      } catch (e) {
        console.error('导出趋势CSV失败', e)
        uni.showToast({ title: '导出失败，请重试', icon: 'none' })
      } finally {
        this.trendCsvExporting = false
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
.date-range-panel {
  display: flex;
  gap: 12rpx;
  margin: -2rpx 0 14rpx;
}
.date-pill {
  padding: 12rpx 18rpx;
  border-radius: 999rpx;
  background: #eef4fb;
  color: #1A3C5E;
  font-size: 22rpx;
  line-height: 1.2;
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
.empty--inline {
  padding: 32rpx 20rpx;
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
.export-main-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.export-tip {
  font-size: 22rpx;
  color: #667085;
}
.action-btn--export-v2 {
  background: #0B6E4F;
  color: #fff;
}
.action-btn--export-trend {
  background: #8A5A00;
  color: #fff;
}
.export-config {
  background: #fff;
  border-radius: 12rpx;
  border: 1rpx solid #e7ecf3;
  padding: 14rpx;
}
.trend-dashboard {
  background: #fff;
  border-radius: 12rpx;
  border: 1rpx solid #e7ecf3;
  padding: 14rpx;
}
.export-config-title {
  font-size: 22rpx;
  color: #344054;
  font-weight: 600;
}
.export-config-tip {
  font-size: 20rpx;
  color: #667085;
}
.export-actions {
  margin-top: 10rpx;
  display: flex;
  gap: 10rpx;
}
.export-actions--trend {
  align-items: center;
  flex-wrap: wrap;
}
.trend-kpi-grid {
  margin-top: 12rpx;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10rpx;
}
.trend-kpi-card {
  background: #f8fafc;
  border-radius: 10rpx;
  padding: 10rpx 12rpx;
}
.trend-kpi-label {
  display: block;
  font-size: 20rpx;
  color: #667085;
}
.trend-kpi-value {
  display: block;
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1A3C5E;
}
.trend-kpi-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #667085;
}
.trend-legend {
  margin-top: 12rpx;
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
}
.trend-legend-item {
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
}
.trend-legend-item--activity {
  color: #0b6e4f;
  background: #e9f7f0;
}
.trend-legend-item--report {
  color: #ad3307;
  background: #fff1eb;
}
.trend-legend-item--action {
  color: #1A3C5E;
  background: #eef4fb;
}
.trend-list {
  margin-top: 10rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.trend-row {
  padding: 10rpx 12rpx;
  border-radius: 10rpx;
  background: #f9fafb;
}
.trend-bar-wrap {
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.trend-bar-track {
  width: 100%;
  height: 10rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  overflow: hidden;
}
.trend-bar-fill {
  height: 100%;
  border-radius: 999rpx;
}
.trend-bar-fill--activity {
  background: #0b6e4f;
}
.trend-bar-fill--report {
  background: #d9480f;
}
.trend-bar-fill--action {
  background: #1A3C5E;
}
.trend-category-panel {
  margin-top: 12rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid #eef2f6;
}
.trend-category-grid {
  margin-top: 10rpx;
  display: grid;
  grid-template-columns: 1fr;
  gap: 10rpx;
}
.trend-category-card {
  background: #f9fafb;
  border-radius: 10rpx;
  padding: 10rpx 12rpx;
}
.trend-mini-bars {
  margin-top: 8rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.trend-mini-row {
  display: grid;
  grid-template-columns: 70rpx 1fr 40rpx;
  align-items: center;
  gap: 8rpx;
}
.trend-mini-label {
  font-size: 20rpx;
  color: #667085;
}
.trend-mini-track {
  width: 100%;
  height: 8rpx;
  border-radius: 999rpx;
  background: #e5e7eb;
  overflow: hidden;
}
.trend-mini-fill {
  height: 100%;
  border-radius: 999rpx;
}
.trend-mini-fill--sport {
  background: #0b6e4f;
}
.trend-mini-fill--music {
  background: #d97706;
}
.trend-mini-fill--reading {
  background: #1A3C5E;
}
.trend-mini-value {
  font-size: 20rpx;
  color: #344054;
  text-align: right;
}
.todo-item {
  margin-top: 12rpx;
  padding: 12rpx;
  border-radius: 10rpx;
  background: #f8fafc;
}
.todo-item--overdue {
  background: #fff1f2;
  box-shadow: 0 0 0 1rpx #fecdd3 inset;
}
.todo-item--urgent {
  background: #fff7ed;
  box-shadow: 0 0 0 1rpx #fed7aa inset;
}
.mini-btn {
  height: 54rpx;
  line-height: 54rpx;
  padding: 0 16rpx;
  margin: 0;
  border-radius: 999rpx;
  font-size: 20rpx;
  background: #1A3C5E;
  color: #fff;
}
.mini-btn::after {
  border: none;
}
.mini-btn--ghost {
  background: #eef4fb;
  color: #1A3C5E;
}
.export-chip-wrap {
  flex-wrap: wrap;
  margin-top: 12rpx;
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
