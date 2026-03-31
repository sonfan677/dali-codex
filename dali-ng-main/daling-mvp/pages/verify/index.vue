<template>
  <view class="page">
    <view class="content">
      <view class="header">
        <text class="title">实名认证</text>
        <text class="desc">发布活动前需要完成实名认证。你的信息加密存储，不会对外展示。</text>
      </view>

      <view class="channel-switch">
        <text
          class="channel-pill"
          :class="{ 'channel-pill--active': verifyChannel === 'manual' }"
          @tap="verifyChannel = 'manual'"
        >人工审核</text>
        <text
          class="channel-pill"
          :class="{ 'channel-pill--active': verifyChannel === 'official' }"
          @tap="verifyChannel = 'official'"
        >微信官方通道</text>
      </view>

      <view v-if="alreadyVerified" class="verified-box">
        <text class="verified-icon">✅</text>
        <text class="verified-text">你已完成实名认证，可以发布活动了</text>
        <text class="verified-sub">认证来源：{{ verifyProviderLabel }}</text>
      </view>

      <view v-else-if="isPending" class="pending-box">
        <text class="pending-icon">⏳</text>
        <text class="pending-text">{{ pendingText }}</text>
        <button
          v-if="userStore.verifyProvider === 'wechat_official'"
          class="retry-btn"
          :loading="officialSubmitting"
          @tap="retryOfficialVerifyFlow"
        >官方认证失败？点此重试</button>
      </view>

      <view v-else-if="verifyChannel === 'official'" class="official-box">
        <text class="official-title">微信官方实名认证（深度接入第一版）</text>
        <text class="official-desc">
          当前版本已打通“官方通道工单 + 回调落库”链路。点击后会生成官方认证票据，等待官方回调完成认证。
        </text>
        <button class="submit-btn" :loading="officialSubmitting" @tap="startOfficialVerifyFlow">
          发起官方认证
        </button>
      </view>

      <view v-else class="form">
        <view class="field">
          <text class="label">真实姓名</text>
          <input
            class="input"
            v-model="form.realName"
            placeholder="请输入真实姓名"
            maxlength="20"
          />
        </view>
        <view class="field">
          <text class="label">手机号</text>
          <input
            class="input"
            v-model="form.phone"
            type="number"
            placeholder="请输入手机号"
            maxlength="11"
          />
        </view>

        <view class="privacy-note">
          <text>你的姓名和手机号仅用于身份核实，加密存储，不会展示给其他用户。</text>
        </view>

        <button class="submit-btn" @tap="submitManualVerify" :loading="submitting">提交认证</button>
      </view>
    </view>
  </view>
</template>

<script>
import { callCloud } from '@/utils/cloud.js'
import { useUserStore } from '@/stores/user.js'

export default {
  setup() {
    const userStore = useUserStore()
    return { userStore }
  },

  data() {
    return {
      submitting: false,
      officialSubmitting: false,
      verifyChannel: 'manual',
      form: { realName: '', phone: '' },
    }
  },

  computed: {
    alreadyVerified() {
      return this.userStore.verifyStatus === 'approved' || this.userStore.isVerified
    },
    isPending() {
      return this.userStore.verifyStatus === 'pending'
    },
    verifyProviderLabel() {
      return this.userStore.verifyProvider === 'wechat_official' ? '微信官方' : '人工审核'
    },
    pendingText() {
      if (this.userStore.verifyProvider === 'wechat_official') {
        return '官方认证流程已发起，等待微信官方回调结果'
      }
      return '认证申请已提交，我们将在24小时内完成审核'
    },
  },

  methods: {
    async submitManualVerify() {
      if (!this.form.realName.trim()) {
        uni.showToast({ title: '请填写真实姓名', icon: 'none' })
        return
      }
      if (!/^1[3-9]\d{9}$/.test(this.form.phone)) {
        uni.showToast({ title: '请填写正确的手机号', icon: 'none' })
        return
      }

      this.submitting = true
      try {
        const res = await callCloud('submitVerify', {
          realName: this.form.realName.trim(),
          phone: this.form.phone,
          verifyProvider: 'manual',
        })

        if (res.success) {
          this.userStore.verifyStatus = 'pending'
          this.userStore.verifyProvider = 'manual'
          uni.showToast({ title: '提交成功！等待审核', icon: 'success' })
        } else {
          uni.showToast({ title: res.message || '提交失败', icon: 'none' })
        }
      } catch (e) {
        uni.showToast({ title: '提交失败，请重试', icon: 'none' })
      } finally {
        this.submitting = false
      }
    },

    async startOfficialVerifyFlow() {
      this.officialSubmitting = true
      try {
        const res = await callCloud('startOfficialVerify', {})
        if (!res?.success) {
          uni.showToast({ title: res?.message || '发起失败', icon: 'none' })
          return
        }

        this.userStore.verifyStatus = 'pending'
        this.userStore.verifyProvider = 'wechat_official'
        this.userStore.officialVerifyStatus = res.officialVerifyStatus || 'pending_callback'
        uni.showModal({
          title: '已发起官方认证',
          content: res.officialEntryUrl
            ? `票据已生成（${res.ticket}）。后续可通过官方入口完成认证。`
            : `票据已生成（${res.ticket}），等待官方回调完成认证。`,
          showCancel: false,
        })
      } catch (e) {
        uni.showToast({ title: '发起失败，请稍后重试', icon: 'none' })
      } finally {
        this.officialSubmitting = false
      }
    },

    async retryOfficialVerifyFlow() {
      this.officialSubmitting = true
      try {
        const res = await callCloud('startOfficialVerify', { forceRetry: true })
        if (!res?.success) {
          uni.showToast({ title: res?.message || '重试失败', icon: 'none' })
          return
        }
        this.userStore.verifyStatus = 'pending'
        this.userStore.verifyProvider = 'wechat_official'
        this.userStore.officialVerifyStatus = res.officialVerifyStatus || 'pending_callback'
        uni.showToast({ title: '已重新发起官方认证', icon: 'success' })
      } catch (e) {
        uni.showToast({ title: '重试失败，请稍后再试', icon: 'none' })
      } finally {
        this.officialSubmitting = false
      }
    },
  },
}
</script>

<style>
.page { min-height: 100vh; background: #f5f5f5; }
.content { padding: 48rpx 32rpx; }

.header { margin-bottom: 28rpx; }
.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #1A3C5E;
  display: block;
  margin-bottom: 20rpx;
}
.desc { font-size: 28rpx; color: #666; line-height: 1.6; }

.channel-switch {
  display: flex;
  gap: 16rpx;
  margin-bottom: 28rpx;
}
.channel-pill {
  flex: 1;
  text-align: center;
  padding: 16rpx 20rpx;
  border-radius: 999rpx;
  background: #E9EFF8;
  color: #35506D;
  font-size: 26rpx;
}
.channel-pill--active {
  background: #1A3C5E;
  color: #fff;
}

.verified-box,
.pending-box,
.official-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 40rpx;
  background: #fff;
  border-radius: 16rpx;
  gap: 20rpx;
}
.verified-icon,
.pending-icon { font-size: 80rpx; }
.verified-text { font-size: 30rpx; color: #1E7145; text-align: center; }
.verified-sub { font-size: 24rpx; color: #3C5D7F; }
.pending-text { font-size: 28rpx; color: #666; text-align: center; line-height: 1.6; }

.official-title { font-size: 30rpx; color: #1A3C5E; font-weight: 600; }
.official-desc {
  font-size: 26rpx;
  color: #5b6f86;
  line-height: 1.6;
  text-align: center;
}

.form { display: flex; flex-direction: column; gap: 16rpx; }
.field {
  background: #fff;
  border-radius: 12rpx;
  padding: 32rpx;
}
.label {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}
.input {
  font-size: 32rpx;
  color: #333;
  width: 100%;
}
.privacy-note {
  padding: 24rpx;
  background: #EEF4FB;
  border-radius: 12rpx;
  font-size: 24rpx;
  color: #555;
  line-height: 1.6;
}
.submit-btn {
  width: 100%;
  height: 96rpx;
  background: #1A3C5E;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
  margin-top: 16rpx;
}

.retry-btn {
  margin-top: 8rpx;
  width: 100%;
  height: 84rpx;
  line-height: 84rpx;
  border-radius: 14rpx;
  background: #EEF4FB;
  color: #1A3C5E;
  font-size: 28rpx;
  border: none;
}
.retry-btn::after {
  border: none;
}
</style>
