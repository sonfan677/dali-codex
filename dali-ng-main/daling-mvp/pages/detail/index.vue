<template>
  <view class="page" v-if="activity">

    <!-- 封面图（有则展示） -->
    <image
      v-if="activity.coverImage"
      class="cover"
      :src="activity.coverImage"
      mode="aspectFill"
    />

    <view class="content">

      <!-- 标签 -->
      <view class="tags">
        <text v-if="activity.isRecommended" class="tag tag--recommend">官方推荐</text>
        <text v-if="activity.isVerified"    class="tag tag--verified">已核验发布</text>
        <text class="tag tag--category">{{ categoryLabel }}</text>
        <text class="tag tag--trust">{{ trustStars }} {{ trustIdentity }}</text>
        <text
          v-for="tag in trustTags"
          :key="`detail-risk-${activity._id}-${tag}`"
          class="tag tag--risk"
        >{{ tag }}</text>
      </view>

      <!-- 标题 -->
      <text class="title">{{ activity.title }}</text>

      <!-- 基本信息 -->
      <view class="info-row">
        <text class="info-label">时间</text>
        <text class="info-value">{{ formatTime(activity.startTime) }} – {{ formatTime(activity.endTime) }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">地点</text>
        <text class="info-value">{{ activity.location && activity.location.address }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">人数</text>
        <text class="info-value">
          已有 {{ activity.currentParticipants }} 人参与
          <text v-if="activity.maxParticipants < 999">· 最多 {{ activity.maxParticipants }} 人</text>
        </text>
      </view>
      <view class="info-row">
        <text class="info-label">费用</text>
        <text class="info-value">{{ pricingText }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">报名</text>
        <text class="info-value">{{ joinPolicyText }}</text>
      </view>

      <!-- 描述 -->
      <view v-if="activity.description || userVisibleTagsForDisplay.length" class="desc-box">
        <view v-if="userVisibleTagsForDisplay.length" class="desc-visible-tags">
          <text class="desc-visible-tags-title">用户可见标签</text>
          <view class="desc-visible-tag-list">
            <text
              v-for="tag in userVisibleTagsForDisplay"
              :key="`detail-visible-tag-${activity._id}-${tag}`"
              class="desc-visible-tag"
            >{{ tag }}</text>
          </view>
        </view>
        <text v-if="activity.description" class="desc-text">{{ activity.description }}</text>
      </view>

      <!-- 联系方式 -->
      <view class="contact-block">
        <view class="contact-header">
          <text class="contact-title">联系方式 / 入群方式</text>
          <text class="contact-sub">报名成功后可见</text>
        </view>
        <view v-if="hasVisibleContact" class="contact-content">
          <view v-if="visibleContactPhone" class="contact-row">
            <text class="contact-label">电话</text>
            <text class="contact-value">{{ visibleContactPhone }}</text>
          </view>
          <view v-if="visibleContactWechat" class="contact-row">
            <text class="contact-label">微信</text>
            <text class="contact-value">{{ visibleContactWechat }}</text>
          </view>
          <view v-if="visibleContactQrcode" class="contact-qrcode-wrap">
            <text class="contact-label">微信二维码</text>
            <image class="contact-qrcode" :src="visibleContactQrcode" mode="aspectFit" />
          </view>
        </view>
        <view v-else class="contact-locked">
          <text>{{ contactLockedTip }}</text>
        </view>
      </view>

      <!-- 管理员可见：处理痕迹 -->
      <view v-if="isAdminView && adminInsight" class="admin-trace">
        <view class="admin-trace-header">
          <text class="admin-trace-title">管理员视图</text>
          <text class="admin-trace-sub">仅管理员可见</text>
        </view>
        <view class="admin-trace-summary">
          <text class="admin-trace-item">累计举报：{{ adminInsight.totalReports || 0 }}</text>
          <text class="admin-trace-item">待处理：{{ adminInsight.pendingReports || 0 }}</text>
          <text class="admin-trace-item">已处理：{{ adminInsight.handledReports || 0 }}</text>
          <text class="admin-trace-item">已忽略：{{ adminInsight.ignoredReports || 0 }}</text>
        </view>
        <view v-if="adminOpsTagSections.length" class="admin-ops-block">
          <text class="admin-log-title">后台标签（结构化自动）</text>
          <view
            v-for="section in adminOpsTagSections"
            :key="`admin-ops-${section.key}`"
            class="admin-ops-row"
          >
            <text class="admin-ops-label">{{ section.label }}</text>
            <view class="admin-ops-tag-list">
              <text
                v-for="tag in section.tags"
                :key="`admin-ops-${section.key}-${tag}`"
                class="admin-ops-tag"
              >{{ tag }}</text>
            </view>
          </view>
          <text v-if="adminInsight?.opsTagSummary?.generatedAtMs" class="admin-trace-text">
            打标时间：{{ formatCommentTime(adminInsight.opsTagSummary.generatedAtMs) }}
          </text>
        </view>
        <text v-if="adminInsight.latestReportReason" class="admin-trace-text">
          最近举报：{{ adminInsight.latestReportReason }}
        </text>
        <text v-if="adminInsight.latestReportAt" class="admin-trace-text">
          举报时间：{{ formatCommentTime(adminInsight.latestReportAt) }}
        </text>
        <text v-if="adminInsight.latestHandleNote" class="admin-trace-text">
          最近处理说明：{{ adminInsight.latestHandleNote }}
        </text>
        <text v-if="adminInsight.latestHandledAt" class="admin-trace-text">
          最近处理时间：{{ formatCommentTime(adminInsight.latestHandledAt) }}
        </text>

        <view v-if="adminActionHistory.length > 0" class="admin-log-list">
          <text class="admin-log-title">最近管理动作</text>
          <view
            v-for="item in adminActionHistory"
            :key="`admin-log-${item._id}`"
            class="admin-log-item"
          >
            <text class="admin-log-action">{{ adminActionText(item.action) }}</text>
            <text class="admin-log-meta">{{ formatCommentTime(item.createdAt) }} · {{ item.adminRole || 'admin' }}</text>
            <text v-if="item.reason" class="admin-log-reason">原因：{{ item.reason }}</text>
          </view>
        </view>
      </view>

      <!-- 发布者 -->
      <view class="publisher">
        <image
          class="pub-avatar"
          :src="activity.publisherAvatar || '/static/default-avatar.png'"
          mode="aspectFill"
        />
        <view class="pub-info">
          <text class="pub-name">{{ activity.publisherNickname || '匿名用户' }}</text>
          <text class="pub-label">{{ trustIdentity }}</text>
          <text class="pub-trust">{{ trustStars }}</text>
        </view>
      </view>

      <!-- 成团进度 -->
      <view v-if="activity.isGroupFormation" class="formation-block">
        <view class="formation-header">
          <text class="formation-title">成团进度</text>
          <text class="formation-status">{{ formationStatusText }}</text>
        </view>
        <view class="formation-bar">
          <view class="formation-fill" :style="{ width: formationProgress + '%' }" />
        </view>
        <text class="formation-desc">{{ formationDesc }}</text>
        <view v-if="canExtendFormationWindow" class="formation-actions">
          <button
            class="formation-extend-btn"
            :loading="extendingWindow"
            @tap="promptExtendFormationWindow"
          >延长成团窗口</button>
          <text class="formation-extend-tip">剩余可延长 {{ remainWindowExtensions }} 次</text>
        </view>
      </view>

      <!-- 发布者可见：参与者列表 -->
      <view v-if="isPublisher" class="participants-block">
        <view class="participants-header">
          <text class="participants-title">参与者列表</text>
          <text class="participants-count">{{ participantCountText }}</text>
        </view>

        <view class="participants-tools">
          <input
            v-model="participantKeyword"
            class="participants-search"
            placeholder="搜索昵称"
            maxlength="20"
          />
          <button class="participants-tool-btn" @tap="toggleParticipantSort">
            {{ participantSortLabel }}
          </button>
          <button class="participants-tool-btn participants-tool-btn--export" @tap="exportParticipantNicknames">
            导出昵称
          </button>
        </view>

        <view v-if="participantList.length === 0" class="participants-empty">
          <text>暂无报名用户</text>
        </view>
        <view v-else-if="participantFilteredList.length === 0" class="participants-empty">
          <text>未找到匹配昵称</text>
        </view>
        <view
          v-for="item in participantFilteredList"
          :key="`part-${item._id}`"
          class="participant-item"
        >
          <image
            class="participant-avatar"
            :src="item.avatar || '/static/default-avatar.png'"
            mode="aspectFill"
          />
          <view class="participant-info">
            <text class="participant-name">{{ item.nickname || '匿名用户' }}</text>
            <text class="participant-time">报名时间：{{ formatJoinedAt(item.joinedAt) }}</text>
            <text class="participant-status" :class="participationStatusClass(item.participationStatus)">
              状态：{{ participationStatusText(item.participationStatus) }}
            </text>
            <text class="participant-attendance" :class="attendanceStatusClass(item.attendanceStatus)">
              出勤：{{ attendanceStatusText(item.attendanceStatus) }}
            </text>
            <text v-if="item.attendanceMarkedAt" class="participant-time">
              标记时间：{{ formatJoinedAt(item.attendanceMarkedAt) }}
            </text>
          </view>
          <view v-if="canMarkAttendance && item.participationStatus === 'joined'" class="participant-actions">
            <button
              class="participant-mark-btn participant-mark-btn--ok"
              size="mini"
              :loading="isAttendanceUpdating(item.openid, 'attended')"
              @tap="markParticipantAttendance(item, 'attended')"
            >到场</button>
            <button
              class="participant-mark-btn participant-mark-btn--no"
              size="mini"
              :loading="isAttendanceUpdating(item.openid, 'no_show')"
              @tap="markParticipantAttendance(item, 'no_show')"
            >爽约</button>
          </view>
        </view>
      </view>

      <!-- 留言区 -->
      <view class="comment-block">
        <view class="comment-header">
          <text class="comment-title">活动留言</text>
          <text class="comment-count">{{ commentList.length }} 条</text>
        </view>

        <view v-if="commentsLoading" class="comment-empty">
          <text>留言加载中...</text>
        </view>
        <view v-else-if="commentThreads.length === 0" class="comment-empty">
          <text>还没有留言，来写第一条吧</text>
        </view>

        <view
          v-for="item in commentThreads"
          :key="`comment-${item._id}`"
          class="comment-item"
        >
          <view class="comment-main">
            <image
              class="comment-avatar"
              :src="item.authorAvatar || '/static/default-avatar.png'"
              mode="aspectFill"
            />
            <view class="comment-body">
              <view class="comment-meta">
                <text class="comment-name">{{ item.authorNickname || '匿名用户' }}</text>
                <text class="comment-role">{{ roleLabel(item.authorRole) }}</text>
                <text class="comment-time">{{ formatCommentTime(item.createdAt) }}</text>
              </view>
              <text class="comment-content">{{ item.content }}</text>
              <text
                v-if="isPublisher"
                class="comment-reply"
                @tap="chooseReplyTarget(item)"
              >回复</text>
            </view>
          </view>

          <view
            v-for="reply in item.replies"
            :key="`reply-${reply._id}`"
            class="reply-item"
          >
            <image
              class="comment-avatar comment-avatar--small"
              :src="reply.authorAvatar || '/static/default-avatar.png'"
              mode="aspectFill"
            />
            <view class="comment-body">
              <view class="comment-meta">
                <text class="comment-name">{{ reply.authorNickname || '匿名用户' }}</text>
                <text class="comment-role">{{ roleLabel(reply.authorRole) }}</text>
                <text class="comment-time">{{ formatCommentTime(reply.createdAt) }}</text>
              </view>
              <text class="comment-content">{{ reply.content }}</text>
            </view>
          </view>
        </view>

        <view v-if="canPostComment" class="comment-editor">
          <view v-if="isPublisher && replyTarget" class="reply-target">
            <text class="reply-target-text">回复：{{ replyTarget.authorNickname || '匿名用户' }}</text>
            <text class="reply-target-cancel" @tap="clearReplyTarget">取消</text>
          </view>
          <view class="editor-row">
            <input
              v-model="commentInput"
              class="comment-input"
              :placeholder="commentInputPlaceholder"
              maxlength="200"
            />
            <button
              class="comment-send"
              :loading="commentSubmitting"
              @tap="submitComment"
            >发送</button>
          </view>
        </view>
        <view v-else class="comment-permission-tip">
          <text>{{ commentPermissionTip }}</text>
        </view>
      </view>

    </view>

    <!-- 底部操作栏 -->
    <view class="bottom-bar">
      <button class="share-btn" open-type="share">分享</button>
      <text class="report-btn" @tap="report">举报</text>

      <!-- 我是发布者 -->
      <view v-if="isPublisher" class="publisher-actions">
        <button
          class="btn btn--edit"
          @tap="goEdit"
          :disabled="!canEdit"
        >编辑活动</button>
        <button
          class="btn btn--cancel"
          @tap="cancelActivity"
          :disabled="!canCancel"
        >取消活动</button>
      </view>

      <!-- 已报名且可取消 -->
      <button
        v-else-if="joinStatus !== 'none' && canQuitJoin"
        class="btn btn--quit"
        @tap="quitJoin"
        :loading="quitting"
      >{{ quitJoinBtnText }}</button>

      <!-- 已报名但不可取消 -->
      <button v-else-if="joinStatus === 'joined'" class="btn btn--joined" disabled>
        已报名 ✓
      </button>
      <button v-else-if="joinStatus === 'pending_approval'" class="btn btn--joined" disabled>
        待审核
      </button>
      <button v-else-if="joinStatus === 'waitlist'" class="btn btn--joined" disabled>
        候补中
      </button>

      <!-- 可以报名 -->
      <button
        v-else-if="canJoin"
        class="btn btn--join"
        @tap="join"
        :loading="joining"
      >{{ joinBtnText }}</button>

      <!-- 不可报名 -->
      <button v-else class="btn btn--disabled" disabled>
        {{ disabledReason }}
      </button>
    </view>

    <view v-if="showJoinProfileDialog" class="phone-bind-mask" @tap="closeJoinProfileDialog">
      <view class="phone-bind-dialog" @tap.stop>
        <text class="phone-bind-title">报名前先完善资料</text>
        <text class="phone-bind-desc">请先设置头像和用户名，方便活动中识别你的身份。</text>
        <view class="profile-editor">
          <button class="profile-avatar-btn" open-type="chooseAvatar" @chooseavatar="onJoinChooseAvatar">
            <image v-if="joinProfileDraftAvatar" class="profile-avatar-img" :src="joinProfileDraftAvatar" mode="aspectFill" />
            <text v-else class="profile-avatar-tip">设置头像</text>
          </button>
          <input
            v-model="joinProfileDraftNickname"
            class="profile-nickname-input"
            maxlength="20"
            placeholder="请输入用户名"
          />
        </view>
        <view class="profile-extra">
          <view class="profile-extra-field">
            <text class="profile-extra-label">社交偏好</text>
            <picker
              mode="selector"
              :range="socialPreferencePickerRange"
              :value="joinProfileDraftSocialPreferenceIndex"
              @change="onJoinSocialPreferenceChange"
            >
              <view class="picker-row">
                <text class="picker-value">{{ socialPreferencePickerRange[joinProfileDraftSocialPreferenceIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>
          <view class="profile-extra-field">
            <text class="profile-extra-label">居住身份</text>
            <picker
              mode="selector"
              :range="residencyTypePickerRange"
              :value="joinProfileDraftResidencyTypeIndex"
              @change="onJoinResidencyTypeChange"
            >
              <view class="picker-row">
                <text class="picker-value">{{ residencyTypePickerRange[joinProfileDraftResidencyTypeIndex] }}</text>
                <text class="arrow">›</text>
              </view>
            </picker>
          </view>
          <view class="profile-extra-field">
            <text class="profile-extra-label">身份标签（最多3个）</text>
            <view class="profile-tag-list">
              <text
                v-for="tag in identityTagOptions"
                :key="`join-profile-tag-${tag.id}`"
                class="profile-tag-item"
                :class="{ 'profile-tag-item--active': joinProfileDraftIdentityTags.includes(tag.id) }"
                @tap="toggleJoinIdentityTag(tag.id)"
              >{{ tag.label }}</text>
            </view>
          </view>
        </view>
        <button class="phone-bind-confirm" @tap="saveJoinProfileAndContinue">保存并继续报名</button>
        <text class="phone-bind-cancel" @tap="closeJoinProfileDialog">稍后再说</text>
      </view>
    </view>

    <view v-if="showJoinPhoneBindDialog" class="phone-bind-mask" @tap="closeJoinPhoneBindDialog">
      <view class="phone-bind-dialog" @tap.stop>
        <text class="phone-bind-title">报名前先绑定手机号</text>
        <text class="phone-bind-desc">
          用于账号安全与活动风控，不会向其他用户公开你的手机号。部分设备/账号会触发微信短信二次校验，属于微信安全策略。
        </text>
        <button
          class="phone-bind-confirm"
          open-type="getPhoneNumber"
          @getphonenumber="onJoinGetPhoneNumber"
        >一键绑定并继续报名</button>
        <text class="phone-bind-cancel" @tap="closeJoinPhoneBindDialog">暂不绑定</text>
      </view>
    </view>

  </view>

  <!-- 加载中 -->
  <view v-else class="loading-page">
    <text class="loading-text">加载中...</text>
  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'
import { getTimeStatus, formationTimeLeft } from '@/utils/distance.js'
import {
  getCategoryLabel,
  getSceneLabel,
  USER_IDENTITY_TAG_OPTIONS,
  USER_RESIDENCY_TYPE_OPTIONS,
  USER_SOCIAL_PREFERENCE_OPTIONS,
  normalizeIdentityTags,
  normalizeResidencyType,
  normalizeSocialPreference,
} from '@/utils/activityMeta.js'

export default {
  data() {
    return {
      activity: null,
      hasJoined: false,
      joinStatus: 'none',
      joining: false,
      quitting: false,
      extendingWindow: false,
      serverTime: Date.now(),
      currentOpenid: '',
      canSeeContact: false,
      isAdminView: false,
      adminInsight: null,
      participantList: [],
      participantKeyword: '',
      participantSort: 'newest',
      attendanceUpdatingMap: {},
      commentList: [],
      commentsLoading: false,
      commentInput: '',
      commentSubmitting: false,
      replyTarget: null,
      canCommentAsParticipant: false,
      canReplyAsPublisher: false,
      showJoinProfileDialog: false,
      showJoinPhoneBindDialog: false,
      joinProfileDraftNickname: '',
      joinProfileDraftAvatar: '',
      socialPreferenceOptions: USER_SOCIAL_PREFERENCE_OPTIONS,
      residencyTypeOptions: USER_RESIDENCY_TYPE_OPTIONS,
      identityTagOptions: USER_IDENTITY_TAG_OPTIONS,
      joinProfileDraftSocialPreference: 'unknown',
      joinProfileDraftResidencyType: 'unknown',
      joinProfileDraftIdentityTags: [],
      pendingJoinAfterPhoneBind: false,
      pendingJoinAfterProfile: false,
    }
  },

  onLoad(options) {
    this.activityId = options.id
    this.currentOpenid = getApp().globalData?.openid || ''
    this.loadDetail()
  },

  onShow() {
    if (this.activityId && this.activity) {
      this.loadDetail()
    }
  },

  onShareAppMessage() {
    return this.buildSharePayload()
  },

  onShareTimeline() {
    const payload = this.buildSharePayload()
    const query = payload.path.includes('?') ? payload.path.split('?')[1] : ''
    return {
      title: payload.title,
      query,
    }
  },

  computed: {
    isPublisher() {
      return this.currentOpenid && this.activity?.publisherId === this.currentOpenid
    },

    timeStatus() {
      if (!this.activity) return { status: 'upcoming_soon', text: '' }
      return getTimeStatus(this.activity.startTime, this.activity.endTime, new Date(this.serverTime))
    },

    canJoin() {
      if (!this.activity) return false
      if (this.joinStatus !== 'none') return false
      return this.activity.status === 'OPEN' && this.timeStatus.status !== 'ended'
    },

    canCancel() {
      if (!this.activity) return false
      return !['ENDED', 'CANCELLED'].includes(this.activity.status)
    },

    canEdit() {
      if (!this.canCancel) return false
      const startedSet = new Set(['ongoing', 'ending_soon', 'ended'])
      return !startedSet.has(this.timeStatus.status)
    },

    canQuitJoin() {
      if (!this.activity || this.joinStatus === 'none' || this.isPublisher) return false
      if (['ENDED', 'CANCELLED'].includes(this.activity.status)) return false
      return this.timeStatus.status !== 'ended'
    },

    joinBtnText() {
      if (this.activity?.joinPolicy?.requireApproval) {
        return '提交报名申请'
      }
      if (
        this.activity?.isGroupFormation &&
        ['FORMING', 'PENDING_ORGANIZER'].includes(this.activity?.formationStatus)
      ) {
        const shortage = (this.activity.minParticipants || 0) - (this.activity.currentParticipants || 0)
        if (shortage > 0) return `参与成团（还差${shortage}人）`
      }
      return '我要参与'
    },

    quitJoinBtnText() {
      if (this.joinStatus === 'pending_approval') return '取消申请'
      if (this.joinStatus === 'waitlist') return '取消候补'
      return '取消报名'
    },

    disabledReason() {
      if (!this.activity) return ''
      const map = {
        PUBLISH_PENDING: '活动审核中',
        PUBLISH_REJECTED: '活动审核未通过',
        FULL: '已满员',
        ENDED: '已结束',
        CANCELLED: '已取消',
      }
      return map[this.activity.status] || '不可报名'
    },

    formationProgress() {
      if (!this.activity?.isGroupFormation) return 0
      const cur = this.activity.currentParticipants || 0
      const min = this.activity.minParticipants || 1
      return Math.min(100, Math.round((cur / min) * 100))
    },

    formationStatusText() {
      const s = this.activity?.formationStatus
      if (s === 'CONFIRMED') return '✅ 已成团'
      if (s === 'PENDING_ORGANIZER') return '待发布者决策'
      if (s === 'FAILED')    return '招募已结束'
      return '成团中'
    },

    formationDesc() {
      if (!this.activity?.isGroupFormation) return ''
      const {
        currentParticipants,
        minParticipants,
        formationDeadline,
        formationStatus,
        organizerDecisionDeadline,
      } = this.activity
      if (formationStatus === 'CONFIRMED') return `共 ${currentParticipants} 人，已成团！`
      if (formationStatus === 'FAILED')    return '未达到成团人数'

      if (formationStatus === 'PENDING_ORGANIZER') {
        const shortage = Math.max(0, (minParticipants || 0) - (currentParticipants || 0))
        const decisionTimeText = organizerDecisionDeadline
          ? this.formatTime(organizerDecisionDeadline)
          : '24小时内'
        if (shortage <= 0) return `已达到成团人数，等待发布者确认（最晚 ${decisionTimeText}）`
        return `未达成团（还差 ${shortage} 人）· 请发布者在 ${decisionTimeText} 前决定是否延长窗口`
      }

      const shortage = (minParticipants || 0) - (currentParticipants || 0)
      const timeLeft = formationDeadline
        ? formationTimeLeft(new Date(formationDeadline), new Date(this.serverTime))
        : ''
      if (shortage <= 0) return `已达成团人数！${timeLeft}`
      return `还差 ${shortage} 人 · ${timeLeft}`
    },

    formationWindowOptions() {
      const fromActivity = Array.isArray(this.activity?.formationWindowOptions)
        ? this.activity.formationWindowOptions
          .map((v) => Number(v))
          .filter((v) => Number.isFinite(v) && v > 0)
        : []
      const fallback = [15, 30, 60]
      const merged = [...new Set([...fromActivity, ...fallback])]
      return merged.sort((a, b) => a - b)
    },

    remainWindowExtensions() {
      const rawMaxCount = Number(this.activity?.maxWindowExtensions)
      const maxCount = Number.isFinite(rawMaxCount) && rawMaxCount > 0 ? rawMaxCount : 3
      const usedCount = Number(this.activity?.extendWindowCount || 0)
      const remain = maxCount - usedCount
      return remain > 0 ? remain : 0
    },

    canExtendFormationWindow() {
      if (!this.isPublisher || !this.activity?.isGroupFormation) return false
      if (this.activity?.formationStatus !== 'PENDING_ORGANIZER') return false
      if (this.remainWindowExtensions <= 0) return false
      if (['ENDED', 'CANCELLED'].includes(this.activity?.status)) return false
      return true
    },

    canMarkAttendance() {
      if (!this.isPublisher || !this.activity) return false
      if (['CANCELLED'].includes(this.activity.status)) return false
      const endMs = new Date(this.activity.endTime).getTime()
      if (!Number.isFinite(endMs)) return false
      return endMs <= Number(this.serverTime || Date.now())
    },

    trustProfile() {
      return this.activity?.trustProfile || {}
    },

    trustStars() {
      if (this.trustProfile.starText) return this.trustProfile.starText
      const stars = Number(this.trustProfile.displayStars || 3)
      return `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`
    },

    trustIdentity() {
      return this.trustProfile.identityLabel || (this.activity?.isVerified ? '已认证' : '新入驻')
    },

    trustTags() {
      return Array.isArray(this.trustProfile.riskTags) ? this.trustProfile.riskTags.slice(0, 3) : []
    },

    categoryLabel() {
      if (this.activity?.typeName) return this.activity.typeName
      if (this.activity?.sceneName) return this.activity.sceneName
      if (this.activity?.sceneId) return getSceneLabel(this.activity.sceneId)
      if (this.activity?.categoryLabel) return this.activity.categoryLabel
      return getCategoryLabel(this.activity?.categoryId || 'other')
    },

    userVisibleTagsForDisplay() {
      const list = Array.isArray(this.activity?.userVisibleTags) ? this.activity.userVisibleTags : []
      const normalized = list
        .map((item) => String(item || '').trim())
        .filter(Boolean)
      return [...new Set(normalized)].slice(0, 12)
    },

    pricingText() {
      if (!this.activity) return '免费'
      const chargeType = String(this.activity?.pricing?.chargeType || this.activity?.chargeType || 'free')
      const feeAmount = Number(this.activity?.pricing?.feeAmount ?? this.activity?.feeAmount ?? 0) || 0
      if (chargeType === 'paid') return `付费（¥${feeAmount}）`
      if (chargeType === 'aa') return 'AA'
      return '免费'
    },

    joinPolicyText() {
      if (!this.activity) return '直接报名'
      const allowWaitlist = !!(this.activity?.joinPolicy?.allowWaitlist ?? this.activity?.allowWaitlist)
      const requireApproval = !!(this.activity?.joinPolicy?.requireApproval ?? this.activity?.requireApproval)
      const fragments = []
      fragments.push(requireApproval ? '需发起人审核' : '直接报名')
      fragments.push(allowWaitlist ? '可候补' : '不可候补')
      return fragments.join(' · ')
    },

    visibleContactPhone() {
      return this.canSeeContact ? String(this.activity?.contactInfo?.phone || '').trim() : ''
    },

    visibleContactWechat() {
      return this.canSeeContact ? String(this.activity?.contactInfo?.wechat || '').trim() : ''
    },

    visibleContactQrcode() {
      return this.canSeeContact ? String(this.activity?.contactInfo?.wechatQrcodeFileId || '').trim() : ''
    },

    hasVisibleContact() {
      return !!(this.visibleContactPhone || this.visibleContactWechat || this.visibleContactQrcode)
    },

    contactLockedTip() {
      if (this.canSeeContact) return '发起人暂未填写联系方式'
      if (this.joinStatus === 'pending_approval') return '你的报名申请待审核，通过后可查看联系方式'
      if (this.joinStatus === 'waitlist') return '你当前在候补中，报名成功后可查看联系方式'
      return '报名成功后可见联系方式/入群方式'
    },

    participantFilteredList() {
      const keyword = String(this.participantKeyword || '').trim().toLowerCase()
      const list = Array.isArray(this.participantList) ? [...this.participantList] : []
      const matched = keyword
        ? list.filter((item) => String(item.nickname || '匿名用户').toLowerCase().includes(keyword))
        : list

      const joinedMs = (item) => {
        const ms = new Date(item?.joinedAt).getTime()
        return Number.isFinite(ms) ? ms : 0
      }

      matched.sort((a, b) => {
        const delta = joinedMs(a) - joinedMs(b)
        if (delta === 0) return String(a?._id || '').localeCompare(String(b?._id || ''))
        return this.participantSort === 'oldest' ? delta : -delta
      })
      return matched
    },

    participantSortLabel() {
      return this.participantSort === 'oldest' ? '按最早报名' : '按最新报名'
    },

    participantCountText() {
      const total = this.participantList.length
      const visible = this.participantFilteredList.length
      if (visible === total) return `共 ${total} 人`
      return `已筛选 ${visible}/${total} 人`
    },

    adminActionHistory() {
      return Array.isArray(this.adminInsight?.actionHistory) ? this.adminInsight.actionHistory : []
    },

    adminOpsTagSections() {
      const summary = this.adminInsight?.opsTagSummary || {}
      const triggerFlags = summary.riskTriggerFlags || {}
      const triggerTags = [
        triggerFlags.isOutdoor ? '是否户外=是' : '',
        triggerFlags.isAlcohol ? '是否酒精=是' : '',
        triggerFlags.isChildren ? '是否儿童=是' : '',
        triggerFlags.isPet ? '是否宠物=是' : '',
        triggerFlags.isApprovalRequired ? '是否审核制=是' : '',
      ].filter(Boolean)
      const defs = [
        { key: 'coreTags', label: '核心标签', tags: Array.isArray(summary.coreTags) ? summary.coreTags : [] },
        { key: 'activityGoal', label: '活动目标', tags: Array.isArray(summary.activityGoal) ? summary.activityGoal : [] },
        { key: 'chargingMode', label: '收费模式', tags: Array.isArray(summary.chargingMode) ? summary.chargingMode : [] },
        { key: 'riskBase', label: '风险等级', tags: Array.isArray(summary.riskBase) ? summary.riskBase : [] },
        { key: 'riskTriggerFlags', label: '布尔风险触发器', tags: triggerTags },
        { key: 'keywordRuleHits', label: '关键词命中', tags: Array.isArray(summary.keywordRuleHits) ? summary.keywordRuleHits : [] },
        { key: 'regionLayer', label: '地域层级', tags: Array.isArray(summary.regionLayer) ? summary.regionLayer : [] },
        { key: 'distribution', label: '分发属性', tags: Array.isArray(summary.distribution) ? summary.distribution : [] },
      ]
      return defs
        .map((item) => ({
          ...item,
          tags: [...new Set((item.tags || []).map((tag) => String(tag || '').trim()).filter(Boolean))].slice(0, 6),
        }))
        .filter((item) => item.tags.length > 0)
    },

    commentThreads() {
      const all = Array.isArray(this.commentList) ? this.commentList : []
      const roots = all
        .filter((item) => !item.parentId)
        .map((item) => ({ ...item, replies: [] }))
      const rootMap = roots.reduce((acc, item) => {
        acc[item._id] = item
        return acc
      }, {})

      all.filter((item) => !!item.parentId).forEach((reply) => {
        const parent = rootMap[reply.parentId]
        if (parent) parent.replies.push(reply)
      })
      return roots
    },

    canPostComment() {
      if (this.isPublisher) return this.canReplyAsPublisher
      return this.canCommentAsParticipant
    },

    commentInputPlaceholder() {
      if (this.isPublisher) {
        if (this.replyTarget) {
          return `回复 ${this.replyTarget.authorNickname || '匿名用户'}`
        }
        return '请先点击留言右侧“回复”'
      }
      return '写下你的活动留言（最多200字）'
    },

    commentPermissionTip() {
      if (this.isPublisher) return '发布者可回复留言'
      if (this.joinStatus === 'pending_approval') return '报名审核通过后可留言互动'
      if (this.joinStatus === 'waitlist') return '候补转为报名成功后可留言互动'
      if (!this.hasJoined) return '报名后可留言互动'
      return '当前不可留言'
    },

    socialPreferencePickerRange() {
      return this.socialPreferenceOptions.map((item) => item.label)
    },

    joinProfileDraftSocialPreferenceIndex() {
      const idx = this.socialPreferenceOptions.findIndex((item) => item.id === this.joinProfileDraftSocialPreference)
      return idx >= 0 ? idx : 0
    },

    residencyTypePickerRange() {
      return this.residencyTypeOptions.map((item) => item.label)
    },

    joinProfileDraftResidencyTypeIndex() {
      const idx = this.residencyTypeOptions.findIndex((item) => item.id === this.joinProfileDraftResidencyType)
      return idx >= 0 ? idx : 0
    },
  },

  methods: {
    async loadDetail() {
      try {
        const res = await callCloud('getActivityDetail', { activityId: this.activityId })
        if (!res || !res.success) {
          const code = String(res?.error || '').trim()
          const msgMap = {
            ACTIVITY_UNAVAILABLE: '活动审核中或暂不可查看',
            ACTIVITY_NOT_FOUND: '活动不存在',
          }
          const err = new Error(res?.message || msgMap[code] || '活动不存在')
          err.code = code
          throw err
        }
        this.activity = res.activity
        this.joinStatus = String(res.joinStatus || (res.hasJoined ? 'joined' : 'none'))
        this.hasJoined = this.joinStatus === 'joined'
        this.serverTime = res.serverTime || Date.now()
        this.currentOpenid = res.currentOpenid || this.currentOpenid
        this.canSeeContact = !!res.canSeeContact
        this.isAdminView = !!res.isAdmin
        this.adminInsight = res.adminInsight || null
        this.participantList = Array.isArray(res.participantList) ? res.participantList : []
        this.participantKeyword = ''
        this.participantSort = 'newest'
        await this.loadComments()
      } catch(e) {
        const code = String(e?.code || '').trim()
        const title = code === 'ACTIVITY_UNAVAILABLE' ? '活动审核中或暂不可查看' : '活动不存在'
        uni.showToast({ title, icon: 'none' })
        setTimeout(() => uni.navigateBack(), 1500)
      }
    },

    async loadComments() {
      this.commentsLoading = true
      try {
        const res = await callCloud('getActivityComments', { activityId: this.activityId })
        if (!res?.success) throw new Error(res?.message || '加载留言失败')
        this.commentList = Array.isArray(res.commentList) ? res.commentList : []
        this.canCommentAsParticipant = !!res.canCommentAsParticipant
        this.canReplyAsPublisher = !!res.canReplyAsPublisher
      } catch (e) {
        console.error('加载留言失败', e)
        this.commentList = []
        this.canCommentAsParticipant = false
        this.canReplyAsPublisher = false
      } finally {
        this.commentsLoading = false
      }
    },

    toggleParticipantSort() {
      this.participantSort = this.participantSort === 'newest' ? 'oldest' : 'newest'
    },

    attendanceStatusText(status) {
      const map = {
        attended: '已到场',
        no_show: '爽约',
      }
      return map[String(status || '')] || '未标记'
    },

    attendanceStatusClass(status) {
      const map = {
        attended: 'participant-attendance--ok',
        no_show: 'participant-attendance--no',
      }
      return map[String(status || '')] || 'participant-attendance--none'
    },

    participationStatusText(status) {
      const map = {
        joined: '已报名',
        pending_approval: '待审核',
        waitlist: '候补中',
      }
      return map[String(status || '')] || '已报名'
    },

    participationStatusClass(status) {
      const map = {
        joined: 'participant-status--joined',
        pending_approval: 'participant-status--pending',
        waitlist: 'participant-status--waitlist',
      }
      return map[String(status || '')] || 'participant-status--joined'
    },

    isAttendanceUpdating(openid, status) {
      const key = `${openid || ''}_${status || ''}`
      return !!this.attendanceUpdatingMap[key]
    },

    async markParticipantAttendance(item, status) {
      if (!this.canMarkAttendance || !item?.openid) return
      const key = `${item.openid}_${status}`
      if (this.attendanceUpdatingMap[key]) return

      this.attendanceUpdatingMap = {
        ...this.attendanceUpdatingMap,
        [key]: true,
      }
      try {
        const res = await callCloud('markAttendance', {
          activityId: this.activityId,
          participantOpenid: item.openid,
          attendanceStatus: status,
          note: `发布者手动标记：${status === 'attended' ? '到场' : '爽约'}`,
        })
        if (!res?.success) {
          uni.showToast({ title: res?.message || '标记失败', icon: 'none' })
          return
        }
        item.attendanceStatus = status
        item.attendanceMarkedAt = Date.now()
        item.attendanceMarkedBy = this.currentOpenid
        uni.showToast({ title: status === 'attended' ? '已标记到场' : '已标记爽约', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '标记失败，请稍后重试', icon: 'none' })
      } finally {
        this.attendanceUpdatingMap = {
          ...this.attendanceUpdatingMap,
          [key]: false,
        }
      }
    },

    exportParticipantNicknames() {
      if (!this.isPublisher) return
      const exportList = this.participantFilteredList
      if (!exportList.length) {
        uni.showToast({ title: '当前没有可导出的昵称', icon: 'none' })
        return
      }
      const lines = exportList.map((item, idx) => `${idx + 1}. ${item.nickname || '匿名用户'}`)
      const title = this.activity?.title || '活动'
      const payload = [`${title}｜参与者昵称清单（${exportList.length}人）`, ...lines].join('\n')

      this.copyText(payload)
        .then(() => {
          uni.showToast({ title: '昵称清单已复制', icon: 'success' })
        })
        .catch((err) => {
          const errMsg = String(err?.errMsg || err?.message || '')
          console.error('复制失败', err)
          if (
            errMsg.includes('api scope is not declared in the privacy agreement') ||
            errMsg.includes('privacy agreement')
          ) {
            uni.showModal({
              title: '需补充隐私接口声明',
              content: '当前小程序未声明剪贴板接口（setClipboardData）。请在小程序后台“隐私保护指引”中添加并发布后重试。',
              showCancel: false,
            })
            return
          }
          uni.showModal({
            title: '复制失败',
            content: '请点击“导出昵称”再试一次；如果仍失败，请把控制台报错截图发我，我来继续排查。',
            showCancel: false,
          })
        })
    },

    copyText(text) {
      return new Promise((resolve, reject) => {
        const data = String(text || '')
        if (!data) {
          reject(new Error('EMPTY_TEXT'))
          return
        }

        // #ifdef MP-WEIXIN
        if (typeof wx !== 'undefined' && typeof wx.setClipboardData === 'function') {
          wx.setClipboardData({
            data,
            success: () => resolve(true),
            fail: (wxErr) => {
              console.warn('wx.setClipboardData fail:', wxErr)
              if (typeof uni !== 'undefined' && typeof uni.setClipboardData === 'function') {
                uni.setClipboardData({
                  data,
                  success: () => resolve(true),
                  fail: (uniErr) => reject(uniErr || wxErr || new Error('COPY_FAILED')),
                })
                return
              }
              reject(wxErr || new Error('COPY_FAILED'))
            },
          })
          return
        }
        // #endif

        if (typeof uni !== 'undefined' && typeof uni.setClipboardData === 'function') {
          uni.setClipboardData({
            data,
            success: () => resolve(true),
            fail: (err) => reject(err || new Error('COPY_FAILED')),
          })
          return
        }

        reject(new Error('CLIPBOARD_API_UNSUPPORTED'))
      })
    },

    promptExtendFormationWindow() {
      if (!this.canExtendFormationWindow || this.extendingWindow) return
      const options = this.formationWindowOptions
      if (!options.length) {
        uni.showToast({ title: '当前暂无可选窗口', icon: 'none' })
        return
      }

      uni.showActionSheet({
        itemList: options.map((m) => `延长 ${m} 分钟`),
        success: async (res) => {
          const selected = options[res.tapIndex]
          if (!Number.isFinite(selected)) return
          await this.extendFormationWindow(selected)
        },
      })
    },

    async extendFormationWindow(minutes) {
      if (!this.canExtendFormationWindow) return
      this.extendingWindow = true
      try {
        const res = await callCloud('extendFormationWindow', {
          activityId: this.activityId,
          extensionMinutes: minutes,
        })
        if (res?.success) {
          await this.loadDetail()
          uni.showToast({ title: `已延长 ${minutes} 分钟`, icon: 'success' })
          return
        }

        const msgMap = {
          INVALID_STATUS: '当前状态不可延长',
          WINDOW_EXTENSION_LIMIT: '延长次数已用完',
          INVALID_WINDOW: '所选窗口不可用',
          NOT_GROUP_FORMATION: '仅成团活动可延长',
          UNAUTHORIZED: '仅发布者可操作',
        }
        uni.showToast({ title: msgMap[res?.error] || res?.message || '操作失败', icon: 'none' })
      } catch (e) {
        uni.showToast({ title: '延长失败，请稍后重试', icon: 'none' })
      } finally {
        this.extendingWindow = false
      }
    },

    chooseReplyTarget(commentItem) {
      if (!this.isPublisher) return
      this.replyTarget = commentItem
      this.commentInput = ''
    },

    clearReplyTarget() {
      this.replyTarget = null
    },

    async submitComment() {
      const text = String(this.commentInput || '').trim()
      if (!text) {
        uni.showToast({ title: '请输入留言内容', icon: 'none' })
        return
      }
      if (!this.canPostComment) {
        uni.showToast({ title: this.commentPermissionTip, icon: 'none' })
        return
      }
      if (this.isPublisher && !this.replyTarget) {
        uni.showToast({ title: '请先选择要回复的留言', icon: 'none' })
        return
      }

      this.commentSubmitting = true
      try {
        const res = await callCloud('addActivityComment', {
          activityId: this.activityId,
          content: text,
          parentId: this.isPublisher ? this.replyTarget?._id : null,
        })
        if (res?.success) {
          uni.showToast({ title: this.isPublisher ? '回复已发送' : '留言成功', icon: 'success' })
          this.commentInput = ''
          this.replyTarget = null
          await this.loadComments()
        } else {
          const map = {
            NOT_PARTICIPANT: '仅参与者可留言',
            REPLY_PARENT_REQUIRED: '请先选择要回复的留言',
            PARTICIPANT_CANNOT_REPLY: '仅发布者可回复留言',
            CONTENT_TOO_LONG: '留言最多200字',
          }
          uni.showToast({ title: map[res?.error] || res?.message || '发送失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '发送失败，请重试', icon: 'none' })
      } finally {
        this.commentSubmitting = false
      }
    },
    // 请求订阅消息授权
    requestSubscribe() {
      return new Promise((resolve) => {
        const gd = getApp().globalData || {}
        if (gd?.subscriptions?.nearbyActivity) {
          resolve({ ok: true, accepted: true, fromStoredPreference: true })
          return
        }

        // #ifdef MP-WEIXIN
        if (typeof wx === 'undefined' || typeof wx.requestSubscribeMessage !== 'function') {
          resolve({ ok: false, reason: 'UNSUPPORTED' })
          return
        }

        const TMPL_START   = 'zgiN-rGOY7w4igxoQA5cwB6DqO9jsFlPkXQund_ZBiM'
        const TMPL_CANCEL  = '3wPqnwBSWK5LnfA-BIDxFeXkSkD01D5meepLNQw6lVY'
        const TMPL_FORMING = 'LC4Z3cL8VoDl679__aRVVvuh4VRCys70b5ZQc0edI0o'
        const primaryIds = [TMPL_START, TMPL_CANCEL, TMPL_FORMING].filter(Boolean)
        const fallbackIds = [TMPL_START].filter(Boolean)

        const callSubscribe = (tmplIds, onSuccess, onFail) => {
          wx.requestSubscribeMessage({
            tmplIds,
            success: onSuccess,
            fail: onFail,
          })
        }

        callSubscribe(
          primaryIds,
          (res) => {
            const statusList = Object.keys(res || {})
              .filter((k) => k !== 'errMsg')
              .map((k) => String(res[k] || ''))
            const accepted = statusList.includes('accept')
            const rejected = statusList.includes('reject')
            const banned   = statusList.includes('ban')

            console.log('[订阅消息] 授权结果:', JSON.stringify(res))
            resolve({
              ok: true,
              accepted,
              rejected,
              banned,
              raw: res,
            })
          },
          (err) => {
            const errMsg = String(err?.errMsg || '')
            console.log('[订阅消息] 首次授权失败:', JSON.stringify(err))

            // 常见场景：某个模板ID在当前AppID下不存在，导致整组请求失败
            if (errMsg.includes('No template data return') && fallbackIds.length) {
              callSubscribe(
                fallbackIds,
                (res2) => {
                  const statusList = Object.keys(res2 || {})
                    .filter((k) => k !== 'errMsg')
                    .map((k) => String(res2[k] || ''))
                  const accepted = statusList.includes('accept')
                  const rejected = statusList.includes('reject')
                  const banned   = statusList.includes('ban')
                  resolve({
                    ok: true,
                    accepted,
                    rejected,
                    banned,
                    degraded: true,
                    raw: res2,
                  })
                },
                (err2) => {
                  console.log('[订阅消息] 降级授权失败:', JSON.stringify(err2))
                  resolve({
                    ok: false,
                    reason: 'FAIL',
                    errMsg: String(err2?.errMsg || ''),
                    raw: err2,
                  })
                }
              )
              return
            }

            resolve({
              ok: false,
              reason: 'FAIL',
              errMsg,
              raw: err,
            })
          }
        )
        // #endif

        // 非微信环境直接通过
        // #ifndef MP-WEIXIN
        resolve({ ok: false, reason: 'NON_MP' })
        // #endif
      })
    },
    initJoinProfileDraft() {
      const gd = getApp().globalData || {}
      this.joinProfileDraftNickname = String(gd.nickname || '').trim()
      this.joinProfileDraftAvatar = String(gd.avatarUrl || '').trim()
      this.joinProfileDraftSocialPreference = normalizeSocialPreference(gd.socialPreference || 'unknown')
      this.joinProfileDraftResidencyType = normalizeResidencyType(gd.residencyType || 'unknown')
      this.joinProfileDraftIdentityTags = normalizeIdentityTags(gd.identityTags || [], 3)
    },
    closeJoinProfileDialog() {
      this.showJoinProfileDialog = false
      this.pendingJoinAfterProfile = false
    },
    onJoinChooseAvatar(e) {
      this.joinProfileDraftAvatar = String(e?.detail?.avatarUrl || '').trim()
    },
    onJoinSocialPreferenceChange(e) {
      const idx = Number(e?.detail?.value || 0)
      const option = this.socialPreferenceOptions[idx] || this.socialPreferenceOptions[0]
      this.joinProfileDraftSocialPreference = normalizeSocialPreference(option?.id || 'unknown')
    },
    onJoinResidencyTypeChange(e) {
      const idx = Number(e?.detail?.value || 0)
      const option = this.residencyTypeOptions[idx] || this.residencyTypeOptions[0]
      this.joinProfileDraftResidencyType = normalizeResidencyType(option?.id || 'unknown')
    },
    toggleJoinIdentityTag(tagId = '') {
      const safe = String(tagId || '').trim()
      if (!safe) return
      const current = Array.isArray(this.joinProfileDraftIdentityTags) ? [...this.joinProfileDraftIdentityTags] : []
      const exists = current.includes(safe)
      const next = exists
        ? current.filter((item) => item !== safe)
        : [...current, safe]
      this.joinProfileDraftIdentityTags = normalizeIdentityTags(next, 3)
    },
    async saveJoinProfileAndContinue() {
      const nickname = String(this.joinProfileDraftNickname || '').trim()
      const avatarUrl = String(this.joinProfileDraftAvatar || '').trim()
      const socialPreference = normalizeSocialPreference(this.joinProfileDraftSocialPreference)
      const residencyType = normalizeResidencyType(this.joinProfileDraftResidencyType)
      const identityTags = normalizeIdentityTags(this.joinProfileDraftIdentityTags, 3)
      if (!avatarUrl) {
        uni.showToast({ title: '请先设置头像', icon: 'none' })
        return
      }
      if (!nickname) {
        uni.showToast({ title: '请先填写用户名', icon: 'none' })
        return
      }
      if (socialPreference === 'unknown') {
        uni.showToast({ title: '请先选择社交偏好', icon: 'none' })
        return
      }
      if (residencyType === 'unknown') {
        uni.showToast({ title: '请先选择居住身份', icon: 'none' })
        return
      }
      try {
        const res = await callCloud('login', {
          nickname,
          avatarUrl,
          socialPreference,
          residencyType,
          identityTags,
        })
        if (!res?.success) {
          uni.showToast({ title: '保存资料失败，请重试', icon: 'none' })
          return
        }
        const gd = getApp().globalData || {}
        gd.nickname = nickname
        gd.avatarUrl = avatarUrl
        gd.socialPreference = socialPreference
        gd.residencyType = residencyType
        gd.identityTags = identityTags
        this.showJoinProfileDialog = false
        uni.showToast({ title: '资料已完善', icon: 'success' })
        if (this.pendingJoinAfterProfile) {
          this.pendingJoinAfterProfile = false
          setTimeout(() => this.join(), 250)
        }
      } catch (err) {
        console.error('报名前完善资料失败', err)
        uni.showToast({ title: '保存失败，请稍后重试', icon: 'none' })
      }
    },
    closeJoinPhoneBindDialog() {
      this.showJoinPhoneBindDialog = false
      this.pendingJoinAfterPhoneBind = false
    },
    async onJoinGetPhoneNumber(e) {
      const code = e?.detail?.code || ''
      if (!code) {
        uni.showToast({ title: '你取消了手机号授权', icon: 'none' })
        return
      }
      try {
        const res = await callCloud('bindPhoneNumber', { code })
        if (!res?.success) {
          uni.showToast({ title: res?.message || '绑定失败，请重试', icon: 'none' })
          return
        }
        const gd = getApp().globalData || {}
        gd.phoneVerified = true
        gd.mobileBindStatus = 'bound'
        gd.mobileBoundAt = res.mobileBoundAt || new Date().toISOString()
        this.showJoinPhoneBindDialog = false
        uni.showToast({ title: '手机号绑定成功', icon: 'success' })
        if (this.pendingJoinAfterPhoneBind) {
          this.pendingJoinAfterPhoneBind = false
          setTimeout(() => this.join(), 250)
        }
      } catch (err) {
        console.error('报名前绑定手机号失败', err)
        uni.showToast({ title: '绑定失败，请稍后再试', icon: 'none' })
      }
    },
    async join() {
      const gd = getApp().globalData || {}
      const isLoggedIn = !!gd.isLoggedIn
      if (!isLoggedIn) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      const nickname = String(gd.nickname || '').trim()
      const avatarUrl = String(gd.avatarUrl || '').trim()
      if (!nickname || !avatarUrl) {
        this.pendingJoinAfterProfile = true
        this.initJoinProfileDraft()
        this.showJoinProfileDialog = true
        return
      }
      const phoneVerified = !!gd.phoneVerified
      if (!phoneVerified) {
        this.pendingJoinAfterPhoneBind = true
        this.showJoinPhoneBindDialog = true
        return
      }
    
      // 请求订阅授权（不影响报名主流程）
      const subRes = await this.requestSubscribe()
      if (subRes?.ok && subRes.accepted) {
        callCloud('updateSubscriptionState', {
          action: 'accepted',
          scene: 'detail_join',
        }).then((syncRes) => {
          const gd = getApp().globalData || {}
          gd.subscriptions = syncRes?.subscriptions || gd.subscriptions || {}
          gd.shouldPromptNearbySubscription = !!syncRes?.shouldPromptNearbySubscription
        }).catch(() => {})
        const title = subRes.degraded ? '已开启核心通知（其余模板待核对）' : '已开启活动通知'
        uni.showToast({ title, icon: 'none', duration: 1500 })
      } else if (subRes?.ok && (subRes.rejected || subRes.banned)) {
        callCloud('updateSubscriptionState', {
          action: 'rejected',
          scene: 'detail_join',
        }).catch(() => {})
        uni.showModal({
          title: '未开启订阅消息',
          content: '你可在设置中开启“订阅消息”，以便接收活动提醒',
          confirmText: '去设置',
          success: (r) => {
            if (r.confirm && typeof wx !== 'undefined' && wx.openSetting) {
              wx.openSetting({ withSubscriptions: true })
            }
          }
        })
      } else if (!subRes?.ok) {
        callCloud('updateSubscriptionState', {
          action: 'prompted',
          scene: 'detail_join',
        }).catch(() => {})
        const detail = subRes?.errMsg || ''
        if (detail.includes('can only be invoked by user TAP gesture')) {
          console.warn('[订阅消息] 非用户手势触发，跳过弹窗提示，不影响报名')
        } else {
          uni.showModal({
            title: '订阅授权未弹出',
            content: detail
              ? `不影响报名\n原因：${detail}`
              : '不影响报名\n可能是微信侧限制或设置关闭',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm && typeof wx !== 'undefined' && wx.openSetting) {
                wx.openSetting({ withSubscriptions: true })
              }
            }
          })
        }
      }
    
      this.joining = true
      try {
        const res = await callCloud('joinActivity', { activityId: this.activityId })
        if (res.success) {
          this.joinStatus = String(res.joinStatus || 'joined')
          this.hasJoined = this.joinStatus === 'joined'
          if (this.joinStatus === 'joined') {
            this.activity.currentParticipants += 1
            if (res.isFull) this.activity.status = 'FULL'
            if (res.formationStatus) this.activity.formationStatus = res.formationStatus
          }
          await this.loadDetail()
          const joinMsgMap = {
            joined: '报名成功！',
            pending_approval: '已提交申请，待发起人审核',
            waitlist: '活动已满，已加入候补',
          }
          uni.showToast({ title: joinMsgMap[this.joinStatus] || '操作成功', icon: 'success' })
        } else {
          const msgs = {
            ALREADY_JOINED: '你已经报名了',
            FULL:           '活动已满员',
            ENDED:          '活动已结束',
            NOT_OPEN:       '活动暂不接受报名',
            PUBLISH_REVIEW_PENDING: '活动审核中，暂不可报名',
            PUBLISH_REVIEW_REJECTED: '活动未通过审核，暂不可报名',
            OWN_ACTIVITY:   '不能报名自己的活动',
          }
          uni.showToast({ title: msgs[res.error] || '报名失败', icon: 'none' })
        }
      } catch(e) {
        uni.showToast({ title: '操作失败，请重试', icon: 'none' })
      } finally {
        this.joining = false
      }
    },

    async quitJoin() {
      if (!this.canQuitJoin) return
      uni.showModal({
        title: '确认取消报名？',
        content: '取消后可再次报名（若活动仍在招募中）',
        confirmText: '确认取消',
        cancelText: '再想想',
        success: async (res) => {
          if (!res.confirm) return
          this.quitting = true
          try {
            const result = await callCloud('quitActivity', { activityId: this.activityId })
            if (result?.success) {
              const cancelledJoinStatus = String(result?.cancelledJoinStatus || this.joinStatus || 'joined')
              this.hasJoined = false
              this.joinStatus = 'none'
              this.activity.currentParticipants = Math.max(
                0,
                Number(result.currentParticipants ?? this.activity.currentParticipants - 1)
              )
              if (result.activityStatus) this.activity.status = result.activityStatus
              if (result.formationStatus) this.activity.formationStatus = result.formationStatus
              this.canSeeContact = this.isPublisher || this.isAdminView
              this.replyTarget = null
              await this.loadComments()
              const cancelMsgMap = {
                pending_approval: '已取消报名申请',
                waitlist: '已取消候补',
                joined: '已取消报名',
              }
              uni.showToast({ title: cancelMsgMap[cancelledJoinStatus] || '已取消报名', icon: 'success' })
            } else {
              const msgMap = {
                NOT_JOINED: '你当前未报名该活动',
                NOT_ALLOWED: '活动已结束或已取消',
                PUBLISHER_CANNOT_QUIT: '发布者不可取消报名',
              }
              uni.showToast({ title: msgMap[result?.error] || result?.message || '取消失败', icon: 'none' })
            }
          } catch (e) {
            uni.showToast({ title: '操作失败，请重试', icon: 'none' })
          } finally {
            this.quitting = false
          }
        }
      })
    },

    goEdit() {
      if (!this.isPublisher) {
        uni.showToast({ title: '仅发布者可编辑', icon: 'none' })
        return
      }
      if (!this.canEdit) {
        uni.showToast({ title: '当前活动不可编辑', icon: 'none' })
        return
      }
      uni.navigateTo({ url: `/pages/activity-edit/index?id=${this.activityId}` })
    },

    async cancelActivity() {
      const count = this.activity?.currentParticipants || 0
      uni.showModal({
        title: '确认取消活动？',
        content: count > 0 ? `已有 ${count} 人报名，取消后他们将看到活动状态变更` : '确认取消这个活动吗？',
        cancelText: '我再想想',
        confirmText: '确认取消',
        success: async (res) => {
          if (!res.confirm) return
          try {
            const result = await callCloud('cancelActivity', { activityId: this.activityId })
            if (result.success) {
              this.activity.status = 'CANCELLED'
              uni.showToast({ title: '活动已取消', icon: 'success' })
            }
          } catch(e) {
            uni.showToast({ title: '操作失败', icon: 'none' })
          }
        }
      })
    },

    report() {
      uni.showModal({
        title: '举报此活动',
        editable: true,
        placeholderText: '请简要描述举报原因',
        success: async (res) => {
          if (res.confirm && res.content) {
            try {
              const ret = await callCloud('submitReport', {
                targetId: this.activityId,
                targetType: 'activity',
                reason: res.content,
              })
              if (ret?.success) {
                uni.showToast({ title: ret.message || '举报已提交，感谢反馈', icon: 'success' })
              } else {
                uni.showToast({ title: ret?.message || '提交失败，请重试', icon: 'none' })
              }
            } catch(e) {
              uni.showToast({ title: '提交失败，请重试', icon: 'none' })
            }
          }
        }
      })
    },

    buildSharePayload() {
      const title = this.activity?.title
        ? `【搭里】${this.activity.title}`
        : '搭里活动'
      const path = `/pages/detail/index?id=${this.activityId || ''}`
      return { title, path }
    },

    roleLabel(role) {
      return role === 'publisher' ? '发布者' : '参与者'
    },

    adminActionText(action) {
      const map = {
        recommend: '设为推荐',
        unrecommend: '取消推荐',
        hide: '手动下架',
      }
      return map[action] || action
    },

    formatTime(t) {
      if (!t) return ''
      const d = new Date(t)
      const mo = d.getMonth() + 1
      const day = d.getDate()
      const h  = d.getHours().toString().padStart(2, '0')
      const m  = d.getMinutes().toString().padStart(2, '0')
      return `${mo}/${day} ${h}:${m}`
    },

    formatJoinedAt(t) {
      if (!t) return '--'
      const d = new Date(t)
      if (Number.isNaN(d.getTime())) return '--'
      const mo = d.getMonth() + 1
      const day = d.getDate()
      const h = d.getHours().toString().padStart(2, '0')
      const m = d.getMinutes().toString().padStart(2, '0')
      return `${mo}/${day} ${h}:${m}`
    },

    formatCommentTime(t) {
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
.page { min-height: 100vh; background: #f5f5f5; padding-bottom: 160rpx; }
.cover { width: 100%; height: 400rpx; display: block; }
.content { padding: 32rpx; }

.tags { display: flex; gap: 12rpx; margin-bottom: 20rpx; flex-wrap: wrap; }
.tag { font-size: 22rpx; padding: 6rpx 16rpx; border-radius: 8rpx; }
.tag--recommend { background: #FFF3CD; color: #856404; }
.tag--verified  { background: #EEF7EE; color: #1E7145; }
.tag--category  { background: #F0F7FF; color: #1E5EA8; }
.tag--trust     { background: #FFF7E8; color: #8B5E00; }
.tag--risk      { background: #FFF0F0; color: #B03A3A; }

.title {
  font-size: 38rpx; font-weight: bold; color: #1a1a1a;
  display: block; margin-bottom: 32rpx;
}

.info-row {
  display: flex; gap: 20rpx; margin-bottom: 20rpx; align-items: flex-start;
}
.info-label { font-size: 26rpx; color: #999; width: 80rpx; flex-shrink: 0; }
.info-value { font-size: 26rpx; color: #333; flex: 1; line-height: 1.5; }

.desc-box {
  background: white; border-radius: 12rpx;
  padding: 24rpx; margin: 24rpx 0;
}
.desc-text { font-size: 28rpx; color: #555; line-height: 1.7; }
.desc-visible-tags {
  margin-bottom: 12rpx;
}
.desc-visible-tags-title {
  display: block;
  margin-bottom: 8rpx;
  font-size: 22rpx;
  color: #667085;
}
.desc-visible-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.desc-visible-tag {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #155EEF;
  background: #EEF4FF;
}

.contact-block {
  margin: 24rpx 0;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #fff;
}
.contact-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.contact-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.contact-sub {
  font-size: 22rpx;
  color: #98A2B3;
}
.contact-content {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.contact-row {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
}
.contact-label {
  width: 128rpx;
  font-size: 24rpx;
  color: #667085;
  flex-shrink: 0;
}
.contact-value {
  flex: 1;
  font-size: 24rpx;
  color: #1f2937;
  word-break: break-all;
}
.contact-qrcode-wrap {
  margin-top: 8rpx;
}
.contact-qrcode {
  margin-top: 10rpx;
  width: 240rpx;
  height: 240rpx;
  border-radius: 10rpx;
  background: #f4f6f8;
}
.contact-locked {
  padding: 12rpx 14rpx;
  border-radius: 10rpx;
  background: #f7f8fa;
  font-size: 24rpx;
  color: #667085;
}

.admin-trace {
  margin: 24rpx 0;
  padding: 24rpx;
  border-radius: 14rpx;
  background: linear-gradient(180deg, #FFF9EC 0%, #FFFDF6 100%);
  border: 1rpx solid #F1DFC2;
}
.admin-trace-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14rpx;
}
.admin-trace-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #7A4B00;
}
.admin-trace-sub {
  font-size: 22rpx;
  color: #B5842F;
}
.admin-trace-summary {
  display: flex;
  gap: 10rpx;
  flex-wrap: wrap;
  margin-bottom: 12rpx;
}
.admin-trace-item {
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(122, 75, 0, 0.08);
  font-size: 22rpx;
  color: #7A4B00;
}
.admin-trace-text {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #6B7280;
  line-height: 1.6;
}
.admin-log-list {
  margin-top: 18rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid rgba(122, 75, 0, 0.12);
}
.admin-ops-block {
  margin: 8rpx 0 6rpx;
  padding: 14rpx;
  border-radius: 10rpx;
  background: rgba(122, 75, 0, 0.05);
}
.admin-ops-row + .admin-ops-row {
  margin-top: 10rpx;
}
.admin-ops-label {
  display: block;
  font-size: 22rpx;
  color: #7A4B00;
  margin-bottom: 6rpx;
}
.admin-ops-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.admin-ops-tag {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(122, 75, 0, 0.1);
  color: #7A4B00;
  font-size: 20rpx;
}
.admin-log-title {
  display: block;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #7A4B00;
}
.admin-log-item {
  padding: 12rpx 0;
  border-top: 1rpx solid rgba(122, 75, 0, 0.08);
}
.admin-log-item:first-child {
  border-top: none;
}
.admin-log-action {
  display: block;
  font-size: 25rpx;
  color: #333;
  font-weight: 600;
}
.admin-log-meta {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #999;
}
.admin-log-reason {
  display: block;
  margin-top: 4rpx;
  font-size: 23rpx;
  color: #666;
}

.publisher {
  display: flex; align-items: center; gap: 20rpx;
  padding: 24rpx 0; border-top: 1rpx solid #eee; margin-top: 8rpx;
}
.pub-avatar {
  width: 80rpx; height: 80rpx; border-radius: 50%; background: #eee;
}
.pub-info { display: flex; flex-direction: column; gap: 6rpx; }
.pub-name  { font-size: 28rpx; color: #333; }
.pub-label { font-size: 22rpx; color: #1E7145; }
.pub-trust { font-size: 22rpx; color: #8B5E00; }

.formation-block {
  background: #EEF4FB; border-radius: 12rpx;
  padding: 24rpx; margin-top: 24rpx;
}
.formation-header {
  display: flex; justify-content: space-between; margin-bottom: 16rpx;
}
.formation-title { font-size: 26rpx; color: #1A3C5E; font-weight: bold; }
.formation-status { font-size: 26rpx; color: #1E7145; }
.formation-bar {
  height: 12rpx; background: rgba(0,0,0,0.08);
  border-radius: 6rpx; overflow: hidden; margin-bottom: 12rpx;
}
.formation-fill {
  height: 100%; background: #2E75B6; border-radius: 6rpx;
}
.formation-desc { font-size: 24rpx; color: #555; }
.formation-actions {
  margin-top: 14rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex-wrap: wrap;
}
.formation-extend-btn {
  margin: 0;
  height: 62rpx;
  line-height: 62rpx;
  border-radius: 32rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
  color: #1E7145;
  background: #EEF7EE;
  border: none;
}
.formation-extend-btn::after {
  border: none;
}
.formation-extend-tip {
  font-size: 22rpx;
  color: #667085;
}

.participants-block {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}
.participants-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}
.participants-title {
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 700;
}
.participants-count {
  font-size: 24rpx;
  color: #999;
}
.participants-tools {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 10rpx;
}
.participants-search {
  flex: 1;
  height: 64rpx;
  border-radius: 32rpx;
  background: #f4f6f8;
  font-size: 24rpx;
  color: #333;
  padding: 0 20rpx;
}
.participants-tool-btn {
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 32rpx;
  padding: 0 20rpx;
  margin: 0;
  font-size: 22rpx;
  color: #1A3C5E;
  background: #EEF4FB;
  border: none;
}
.participants-tool-btn::after {
  border: none;
}
.participants-tool-btn--export {
  color: #1E7145;
  background: #EEF7EE;
}
.participants-empty {
  font-size: 24rpx;
  color: #999;
  padding: 12rpx 0;
}
.participant-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 14rpx 0;
  border-top: 1rpx solid #f2f2f2;
}
.participant-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: #eee;
  flex-shrink: 0;
}
.participant-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.participant-name {
  font-size: 26rpx;
  color: #333;
}
.participant-time {
  font-size: 22rpx;
  color: #999;
}
.participant-status {
  font-size: 22rpx;
}
.participant-status--joined {
  color: #1E7145;
}
.participant-status--pending {
  color: #B54708;
}
.participant-status--waitlist {
  color: #2E75B6;
}
.participant-attendance {
  font-size: 22rpx;
}
.participant-attendance--ok {
  color: #1E7145;
}
.participant-attendance--no {
  color: #B54708;
}
.participant-attendance--none {
  color: #98A2B3;
}
.participant-actions {
  display: flex;
  gap: 8rpx;
}
.participant-mark-btn {
  min-width: 92rpx;
  height: 52rpx;
  line-height: 52rpx;
  margin: 0;
  font-size: 22rpx;
  border-radius: 26rpx;
  border: none;
}
.participant-mark-btn::after {
  border: none;
}
.participant-mark-btn--ok {
  background: #EEF7EE;
  color: #1E7145;
}
.participant-mark-btn--no {
  background: #FFF4E8;
  color: #B54708;
}

.comment-block {
  margin-top: 24rpx;
  padding: 24rpx;
  border-radius: 12rpx;
  background: #ffffff;
}
.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.comment-title {
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 700;
}
.comment-count {
  font-size: 24rpx;
  color: #999;
}
.comment-empty {
  padding: 16rpx 0;
  font-size: 24rpx;
  color: #999;
}
.comment-item {
  padding: 16rpx 0;
  border-top: 1rpx solid #f3f3f3;
}
.comment-main {
  display: flex;
  gap: 14rpx;
}
.comment-avatar {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  background: #eee;
  flex-shrink: 0;
}
.comment-avatar--small {
  width: 42rpx;
  height: 42rpx;
}
.comment-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.comment-meta {
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}
.comment-name {
  font-size: 25rpx;
  color: #333;
  font-weight: 600;
}
.comment-role {
  font-size: 20rpx;
  color: #1E7145;
  background: #EEF7EE;
  border-radius: 12rpx;
  padding: 2rpx 10rpx;
}
.comment-time {
  font-size: 22rpx;
  color: #999;
}
.comment-content {
  font-size: 26rpx;
  color: #444;
  line-height: 1.55;
}
.comment-reply {
  display: inline-block;
  margin-top: 4rpx;
  font-size: 23rpx;
  color: #2E75B6;
}
.reply-item {
  margin-left: 64rpx;
  margin-top: 10rpx;
  padding: 12rpx;
  border-radius: 10rpx;
  background: #f8fbff;
  display: flex;
  gap: 12rpx;
}
.comment-editor {
  margin-top: 14rpx;
  border-top: 1rpx solid #f3f3f3;
  padding-top: 14rpx;
}
.reply-target {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10rpx;
}
.reply-target-text {
  font-size: 22rpx;
  color: #2E75B6;
}
.reply-target-cancel {
  font-size: 22rpx;
  color: #999;
}
.editor-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.comment-input {
  flex: 1;
  height: 68rpx;
  border-radius: 34rpx;
  background: #f4f6f8;
  padding: 0 20rpx;
  font-size: 26rpx;
  color: #333;
}
.comment-send {
  width: 120rpx;
  height: 68rpx;
  line-height: 68rpx;
  border-radius: 34rpx;
  background: #1A3C5E;
  color: #fff;
  font-size: 25rpx;
  border: none;
  padding: 0;
}
.comment-send::after { border: none; }
.comment-permission-tip {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #999;
}

.phone-bind-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.phone-bind-dialog {
  width: 84%;
  background: #fff;
  border-radius: 18rpx;
  padding: 34rpx 30rpx 28rpx;
}
.phone-bind-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1A1A1A;
}
.phone-bind-desc {
  margin-top: 14rpx;
  display: block;
  font-size: 24rpx;
  color: #667085;
  line-height: 1.6;
}
.phone-bind-confirm {
  margin-top: 26rpx;
  width: 100%;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 12rpx;
  background: #1A3C5E;
  color: #fff;
  font-size: 28rpx;
  border: none;
}
.phone-bind-confirm::after { border: none; }
.phone-bind-cancel {
  margin-top: 18rpx;
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: #98A2B3;
}
.profile-editor {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.profile-avatar-btn {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  border: none;
  background: #eef4fb;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.profile-avatar-btn::after { border: none; }
.profile-avatar-img {
  width: 100%;
  height: 100%;
}
.profile-avatar-tip {
  font-size: 22rpx;
  color: #1A3C5E;
}
.profile-nickname-input {
  flex: 1;
  height: 72rpx;
  border-radius: 10rpx;
  background: #f5f7fa;
  padding: 0 18rpx;
  font-size: 26rpx;
  color: #1a1a1a;
}
.profile-extra {
  margin-top: 16rpx;
  border-radius: 12rpx;
  background: #f8fafc;
  padding: 14rpx 14rpx 8rpx;
}
.profile-extra-field {
  margin-bottom: 10rpx;
}
.profile-extra-label {
  display: block;
  font-size: 22rpx;
  color: #667085;
  margin-bottom: 6rpx;
}
.profile-tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
}
.profile-tag-item {
  padding: 7rpx 14rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
  color: #475467;
  background: #fff;
  border: 1rpx solid #e4e7ec;
}
.profile-tag-item--active {
  color: #1a3c5e;
  border-color: #1a3c5e;
  background: #eaf2fb;
}

.bottom-bar {
  position: fixed; bottom: 0; left: 0; right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: white; box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.08);
  display: flex; align-items: center; gap: 20rpx;
}
.share-btn {
  width: 108rpx;
  height: 60rpx;
  line-height: 60rpx;
  font-size: 24rpx;
  color: #1A3C5E;
  background: #EEF4FB;
  border-radius: 12rpx;
  border: none;
  padding: 0;
  margin: 0;
  flex-shrink: 0;
}
.share-btn::after { border: none; }
.report-btn { font-size: 26rpx; color: #999; padding: 0 16rpx; flex-shrink: 0; }

.publisher-actions {
  flex: 1;
  display: flex;
  gap: 12rpx;
}

.btn {
  flex: 1; height: 88rpx; border-radius: 16rpx;
  font-size: 30rpx; font-weight: bold; border: none;
}
.btn::after { border: none; }
.btn--join     { background: #1A3C5E; color: white; }
.btn--edit     { background: #EEF4FB; color: #1A3C5E; border: 2rpx solid #9AB6D4; }
.btn--quit     { background: #FFF5F5; color: #C00000; border: 2rpx solid #E8A7A7; }
.btn--joined   { background: #f0f0f0; color: #999; }
.btn--cancel   { background: white; color: #C00000; border: 2rpx solid #C00000; }
.btn--disabled { background: #f0f0f0; color: #999; }

.loading-page {
  min-height: 100vh; display: flex;
  align-items: center; justify-content: center;
}
.loading-text { font-size: 28rpx; color: #999; }
</style>
