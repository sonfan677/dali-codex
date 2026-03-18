<template>
  <view v-if="show" class="privacy-mask">
    <view class="privacy-box">
      <text class="privacy-title">用户隐私保护提示</text>
      <text class="privacy-desc">
        在使用本服务前，请阅读
        <text class="privacy-link" @tap="openPrivacy">《隐私保护指引》</text>
        。我们会依据指引收集和使用你的信息。
      </text>
      <view class="privacy-btns">
        <button class="btn-reject" @tap="reject">不同意</button>
        <button
          class="btn-agree"
          open-type="agreePrivacyAuthorization"
          @agreeprivacyauthorization="agree"
        >同意</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return { show: false, resolveFunc: null }
  },
  methods: {
    // 外部调用此方法弹出，返回 Promise
    authorize() {
      return new Promise((resolve) => {
        this.resolveFunc = resolve
        this.show = true
      })
    },
    agree() {
      this.show = false
      this.resolveFunc && this.resolveFunc(true)
    },
    reject() {
      this.show = false
      this.resolveFunc && this.resolveFunc(false)
    },
    openPrivacy() {
      uni.navigateTo({ url: '/pages/privacy/index' })
    }
  }
}
</script>

<style>
.privacy-mask {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  align-items: flex-end;
}
.privacy-box {
  width: 100%;
  background: white;
  border-radius: 24rpx 24rpx 0 0;
  padding: 48rpx 40rpx;
  padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
}
.privacy-title {
  font-size: 34rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 24rpx;
}
.privacy-desc {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  display: block;
  margin-bottom: 40rpx;
}
.privacy-link {
  color: #1A3C5E;
}
.privacy-btns {
  display: flex;
  gap: 24rpx;
}
.btn-reject {
  flex: 1;
  height: 88rpx;
  background: #f5f5f5;
  color: #666;
  border-radius: 12rpx;
  font-size: 30rpx;
  border: none;
}
.btn-agree {
  flex: 1;
  height: 88rpx;
  background: #1A3C5E;
  color: white;
  border-radius: 12rpx;
  font-size: 30rpx;
  border: none;
}
</style>