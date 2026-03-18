<template>
  <scroll-view scroll-y class="page">
    <view class="content">

      <!-- 页头 -->
      <text class="title">搭里隐私保护指引</text>
      <text class="date">最后更新：2026年3月</text>
      <text class="intro">在使用搭里小程序前，请仔细阅读本指引。我们将向你说明会收集哪些信息、如何使用及如何保护这些信息。</text>

      <!-- 一 -->
      <text class="section-title">一、我们收集的信息</text>

      <text class="item-title">1. 位置信息</text>
      <text class="item-body">用于展示你附近正在发生的活动，以及在发布活动时选择活动地点。仅在你主动授权后获取，可随时在微信「设置 → 授权管理」中关闭。</text>

      <text class="item-title">2. 微信头像与昵称</text>
      <text class="item-body">用于展示你作为活动发布者或参与者的身份信息，通过微信授权获取，你可自行修改。</text>

      <text class="item-title">3. 手机号</text>
      <text class="item-body">用于账号注册与身份验证，仅在你主动授权时获取，加密存储，不向其他用户展示。</text>

      <!-- 二 -->
      <text class="section-title">二、信息的使用方式</text>
      <view class="bullet-group">
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">位置信息仅用于活动匹配与地点选择，不持久化存储，不用于其他目的。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">手机号仅用于身份核实，核实完成后由管理员人工审核，不分享给第三方。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">我们不会将你的个人信息用于商业营销，也不会出售给任何第三方。</text>
        </view>
      </view>

      <!-- 三 -->
      <text class="section-title">三、数据存储与保护</text>
      <view class="bullet-group">
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">所有数据存储在微信云开发平台（腾讯云），符合国家数据安全相关标准。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">手机号等敏感信息经加密处理后存储，工作人员无法直接查看明文。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">我们采取合理的技术与管理措施，保护你的个人信息安全。</text>
        </view>
      </view>

      <!-- 四 -->
      <text class="section-title">四、数据保留与删除</text>
      <view class="bullet-group">
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">你可随时通过小程序内的功能申请注销账号，注销后我们将在30天内删除你的个人信息。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">位置信息在每次会话结束后不再保留。</text>
        </view>
      </view>

      <!-- 五 -->
      <text class="section-title">五、未成年人保护</text>
      <text class="item-body">本产品不面向14岁以下未成年人。若发现未成年人使用，请通过反馈功能联系我们处理。</text>

      <!-- 六 -->
      <text class="section-title">六、联系我们</text>
      <text class="item-body">如对本指引有任何疑问，请通过小程序内的反馈功能联系我们，我们将在7个工作日内回复。</text>

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
  padding-bottom: 8rpx;
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

/* 子标题（1. 2. 3. 形式） */
.item-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-top: 24rpx;
  margin-bottom: 10rpx;
}

/* 正文段落 */
.item-body {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.9;
}

/* 圆点列表 */
.bullet-group {
  margin-top: 4rpx;
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
