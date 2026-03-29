<template>
  <scroll-view scroll-y class="page">
    <view class="content">

      <!-- 页头 -->
      <text class="title">搭里隐私保护指引</text>
      <text class="date">最后更新：2026年3月</text>
      <text class="intro">在使用搭里小程序前，请仔细阅读本指引。我们将向你说明会收集哪些信息、如何使用这些信息，以及你可以如何管理相关授权。</text>

      <!-- 一 -->
      <text class="section-title">一、我们收集的信息</text>

      <text class="item-title">1. 用户信息（昵称、头像）</text>
      <text class="item-body">用于创建和维护你的账号资料，并在活动发布、报名、留言互动、参与者列表、举报处理和管理员审核等场景中识别用户身份，便于活动交流与平台管理。</text>

      <text class="item-title">2. 位置信息</text>
      <text class="item-body">用于获取你当前的大致位置，展示附近正在发生的活动，并按距离进行排序和筛选，帮助你更高效地发现同城活动。仅在你主动授权后获取，不用于持续追踪。</text>

      <text class="item-title">3. 选择的位置信息</text>
      <text class="item-body">用于你在发布活动或编辑活动时选择活动地点，并在活动详情页展示活动地址信息，帮助其他用户判断活动位置和参与距离。</text>

      <text class="item-title">4. 手机号</text>
      <text class="item-body">用于提交实名认证申请、进行身份核验和人工审核。手机号仅用于平台安全管理与发布者真实性确认，不向其他用户公开展示。</text>

      <text class="item-title">5. 剪贴板</text>
      <text class="item-body">用于发布者导出活动参与者昵称清单并复制到系统剪贴板，方便活动通知、名单整理和运营管理。</text>

      <!-- 二 -->
      <text class="section-title">二、信息的使用方式</text>
      <view class="bullet-group">
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">位置信息仅用于附近活动展示、距离排序筛选和地点选择，不用于持续追踪你的行程轨迹。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">手机号仅用于实名认证和身份核实，核实流程由平台管理员进行人工审核，不向其他用户展示，不用于营销推广。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">昵称、头像等用户信息用于账号展示与活动互动，不会超出本产品提供的活动服务范围使用。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">剪贴板能力仅在你主动点击导出昵称等功能时调用，不会在后台静默读取你的剪贴板内容。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">我们不会将你的个人信息出售给任何第三方，也不会将其用于与你无关的商业营销。</text>
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
          <text class="bullet-text">手机号等敏感信息经加密处理后存储，平台仅在必要的审核和安全管理场景中使用。</text>
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
          <text class="bullet-text">你可通过微信授权设置管理位置等权限，也可在不使用相关功能时拒绝授权。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">你可随时通过小程序内的功能申请注销账号，注销后我们将在合理期限内删除或匿名化处理相关个人信息。</text>
        </view>
        <view class="bullet-item">
          <text class="bullet">·</text>
          <text class="bullet-text">位置信息主要用于当前会话中的活动发现与地点选择，关闭授权后将不再继续获取。</text>
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
