<template>
  <scroll-view scroll-y class="page">
    <view class="content">

      <!-- 页头 -->
      <text class="title">搭里用户协议</text>
      <text class="date">最后更新：2026年3月</text>
      <text class="intro">请在使用搭里小程序前仔细阅读本协议。使用本产品即表示你已阅读并同意以下条款。</text>

      <!-- 一 -->
      <text class="section-title">一、服务说明</text>
      <text class="item-body">搭里是一款基于地理位置的线下活动发现与报名小程序，帮助用户发现并参与附近正在发生的活动，支持活动发布、报名参与、成团机制等功能。</text>

      <!-- 二 -->
      <text class="section-title">二、用户注册与认证</text>
      <view class="numbered-group">
        <view class="numbered-item">
          <text class="number">1.</text>
          <text class="numbered-text">用户需通过微信授权登录后方可使用本产品。</text>
        </view>
        <view class="numbered-item">
          <text class="number">2.</text>
          <text class="numbered-text">发布活动前需完成身份验证，提供真实手机号码。</text>
        </view>
        <view class="numbered-item">
          <text class="number">3.</text>
          <text class="numbered-text">用户须保证所填信息真实有效，不得冒用他人信息。</text>
        </view>
      </view>

      <!-- 三 -->
      <text class="section-title">三、用户行为规范</text>
      <text class="item-body">用户在使用本产品时，不得发布以下内容：</text>
      <view class="bullet-group">
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">涉及违法违规的活动信息</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">虚假、误导性活动内容</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">侵犯他人权益的内容</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">任何形式的付费、收费活动</text>
        </view>
      </view>

      <!-- 四 -->
      <text class="section-title">四、免责声明</text>
      <text class="item-body">本产品仅提供活动信息展示和报名功能，不对活动内容的真实性、安全性负责。用户参与活动须自行评估风险。</text>

      <!-- 五 -->
      <text class="section-title">五、协议变更</text>
      <text class="item-body">本产品有权随时修改本协议，修改后将在小程序内公告。继续使用即视为同意新协议。</text>

      <!-- 六 -->
      <text class="section-title">六、联系我们</text>
      <text class="item-body">如有问题，请通过小程序内的反馈功能联系我们，我们将在7个工作日内回复。</text>

    </view>
  </scroll-view>
</template>

<style>
.page {
  background: #ffffff;
}
.content {
  padding: 48rpx 36rpx 100rpx;
}

/* 页头 */
.title {
  display: block;
  font-size: 38rpx;
  font-weight: bold;
  color: #1A3C5E;
  margin-bottom: 12rpx;
}
.date {
  display: block;
  font-size: 24rpx;
  color: #aaa;
  margin-bottom: 28rpx;
}
.intro {
  display: block;
  font-size: 26rpx;
  color: #888;
  line-height: 1.8;
  padding-bottom: 32rpx;
  border-bottom: 1rpx solid #eeeeee;
}

/* 章节标题 */
.section-title {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #1A3C5E;
  margin-top: 52rpx;
  margin-bottom: 20rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid #1A3C5E;
}

/* 正文段落 */
.item-body {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.9;
}

/* 编号列表 */
.numbered-group {
  margin-top: 4rpx;
}
.numbered-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16rpx;
}
.number {
  font-size: 26rpx;
  color: #1A3C5E;
  font-weight: bold;
  margin-right: 12rpx;
  flex-shrink: 0;
}
.numbered-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.9;
  flex: 1;
}

/* 圆点列表 */
.bullet-group {
  margin-top: 16rpx;
}
.bullet-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16rpx;
}
.bullet {
  font-size: 28rpx;
  color: #1A3C5E;
  margin-right: 12rpx;
  margin-top: 2rpx;
  flex-shrink: 0;
}
.bullet-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.9;
  flex: 1;
}
</style>
