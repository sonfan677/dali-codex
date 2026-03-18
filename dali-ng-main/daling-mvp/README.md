# 搭里（daling-mvp）微信小程序（uni-app Vue3 + TS）

面向「就近活动发现/报名」的微信小程序 MVP。前端使用 uni-app（Vue3），云端基于微信云开发（CloudBase）。本仓库包含小程序源码与云函数源码。

## 快速开始

1. 安装依赖
   - HBuilderX（用于 uni-app 开发与编译）
   - 微信开发者工具（用于预览、真机、云函数部署）
   - Node.js（可选，用于包管理与工具）
2. 在 HBuilderX 打开项目根目录 `daling-mvp`
3. 运行到微信小程序（编译到 `unpackage/dist/dev/mp-weixin/`）
4. 在微信开发者工具导入「根目录项目」
   - 选择项目根目录 `daling-mvp`
   - `project.config.json` 已设置：
     - `miniprogramRoot: "unpackage/dist/dev/mp-weixin/"`
     - `cloudfunctionRoot: "cloudfunctions/"`
   - 该项目用于：预览调试 + 云函数部署（推荐只使用这一个项目）

> 说明：HBuilderX 运行时可能同时弹出一个仅包含前端代码的「MP-WEIXIN 项目」（位于 dist 目录）。建议关闭后，统一在「根目录项目」中进行调试与部署。

### 双项目配置（当前代码已对齐）
- 根目录项目：用于预览/调试/部署云函数
  - `miniprogramRoot: "unpackage/dist/dev/mp-weixin/"`
  - `cloudfunctionRoot: "cloudfunctions/"`
- dist 项目（可选，仅用于查看页面）
  - `unpackage/dist/dev/mp-weixin/project.config.json` 中：
  - `miniprogramRoot: ""`
  - 可保留 `cloudfunctionRoot: "cloudfunctions/"`，但云函数部署务必在「根目录项目」执行
  - 若 HBuilderX 重新编译导致被覆盖为路径字符串，改回 `""` 即可

## 云开发配置

- AppID：在 `manifest.json` 与 `project.config.json` 中保持一致
- 云环境 ID：在 `App.vue` 中 `wx.cloud.init({ env })` 设置为你的环境
- 隐私合规
  - 已开启隐私检查：`__usePrivacyCheck__`
  - 在公众平台后台的「隐私保护指引」声明位置能力（如 `chooseLocation`、`getLocation` 或 `getFuzzyLocation`）
  - `manifest.json` 的 `mp-weixin.requiredPrivateInfos` 已包含：`getFuzzyLocation`、`chooseLocation`

## 目录概览

- `pages/`：页面源码
  - `index` 首页/发现
  - `detail` 活动详情（报名、取消、举报）
  - `publish` 发布活动（地点选择、时间选择、成团开关）
  - `mine` 我的
  - `verify` 实名
  - `admin` 管理
  - `welcome` 首次登录引导
  - `agreement`/`privacy` 协议与隐私
- `utils/cloud.js`：统一云函数调用封装 `callCloud(name, data)`
- `cloudfunctions/`
  - `login`：静默登录与用户档案初始化
  - `joinActivity`：报名（并发安全，事务更新人数与报名记录）
  - `cancelActivity`：发布者取消活动并通知参与者
  - `autoUpdateStatus`：自动更新活动状态（结束/成团结果）并通知
  - `sendNotification`：统一模板消息发送
- `project.config.json`：微信开发者工具项目配置（根目录项目）
- `unpackage/dist/dev/mp-weixin/`：编译产物（如需单独导入，仅用于看页面）

## 数据模型（核心集合）

- `users`
  - `_openid`、`nickname`、`avatarUrl`、`isVerified`、`verifyStatus`、`joinCount`、`publishCount`、`createdAt`、`updatedAt`
- `activities`
  - 基本：`title`、`description`、`publisherId`、`publisherNickname`、`publisherAvatar`
  - 时间：`startTime`、`endTime`
  - 人数：`currentParticipants`、`maxParticipants`
  - 状态：`status`（`OPEN`/`FULL`/`ENDED`/`CANCELLED`）
  - 成团（可选）：`isGroupFormation`、`minParticipants`、`formationDeadline`、`formationStatus`
  - 位置：建议使用 GeoJSON `location: { type: "Point", coordinates: [lng, lat] }`（目前页面采用 `lat/lng/address` 字段）
- `participations`
  - `activityId`、`userId`、`status`（`joined`）、
  - `joinedAt`、`cancelledAt`
- `adminActions`
  - 举报等后台动作记录

> 索引建议：`participations(activityId + userId)`、`activities(status)`、`activities(formationStatus)` 等复合索引按实际查询添加。

## 关键流程

- 启动与登录
  - `App.vue` 在 `onLaunch` 中初始化云开发并调用 `login` 云函数
  - 登录成功后将 `openid`、`isVerified` 等写入 `globalData`（建议逐步收敛至 Pinia）
- 发布活动（`pages/publish`）
  - 选择地点（微信 `chooseLocation`）→ 选择开始时间与时长 → 提交
  - 通过 `callCloud('publishActivity', ...)`（如有）创建活动
  - 开启成团时，录入 `minParticipants` 与 `formationDeadline`
- 活动详情（`pages/detail`）
  - 加载活动详情
  - 报名：`callCloud('joinActivity', { activityId })`，云端使用事务防超额，成功后更新人数与报名记录，并异步触发通知
  - 取消：发布者调用 `cancelActivity`，异步通知已报名用户
  - 举报：写入 `adminActions`
- 通知发送（`sendNotification`）
  - 使用 `cloud.openapi.subscribeMessage.send` 发送模板消息
  - 模板 ID 通过云环境变量 `TMPL_START/TMPL_CANCEL/TMPL_FORMING` 注入
  - 前端需要通过 `wx.requestSubscribeMessage` 订阅相同模板

## 开发与部署

1. 编译与预览
   - HBuilderX 运行到「微信小程序」
   - 在**根目录项目**中预览与调试（推荐）：`miniprogramRoot` 指向 `unpackage/dist/dev/mp-weixin/`
2. 云函数部署
   - 在微信开发者工具左侧「云函数」树，右键目标函数 → 「上传并部署：云端安装依赖（不上传 node_modules）」
   - 在云开发控制台确认函数已上线
3. 真机调试
   - DevTools 编译后即可真机调试（扫码）

> 注意：如果你导入的是 dist 项目（仅前端代码），不会看到「云函数」目录，也无法右键上传；请使用「根目录项目」进行部署。

## 常见问题（Troubleshooting）

- 右键没有「上传并部署」
  - 导入错了项目。请导入根目录 `daling-mvp`，确保 `cloudfunctionRoot` 存在
- “模拟器启动失败：未找到 app.json”
  - dist 项目的 `project.config.json` 应将 `miniprogramRoot` 设为 `""`；根目录项目应设为 `unpackage/dist/dev/mp-weixin/`
- `chooseLocation:fail api scope is not declared in the privacy agreement`
  - 在公众平台后台「隐私保护指引」声明位置能力；调用前走 `wx.getPrivacySetting`/`wx.requirePrivacyAuthorize`
- JSON 模式“Key或Value不能为空”
  - 检查中文标点、尾逗号、隐藏字符；或使用默认模式逐项填写；日期用 EJSON：`{ "$date": "ISO8601" }`
- 报名按钮无反应
  - 前端订阅消息模板常量需与云函数一致（参考下文「模板消息」）

## 模板消息配置

- 云函数 `sendNotification` 读取以下环境变量：
  - `TMPL_START`：活动开始/报名成功通知
  - `TMPL_CANCEL`：活动取消通知
  - `TMPL_FORMING`：成团结果通知
- 前端订阅：在详情页中调用 `wx.requestSubscribeMessage({ tmplIds: [...] })`，模板 ID 与以上保持一致
  - 建议将模板 ID 统一放置在配置中心（或环境变量），避免出现未声明常量导致的前端异常

## 代码风格与建议

- 状态管理：逐步将 `getApp().globalData` 收敛至 Pinia store，统一读取与更新
- 工具函数：时间格式化、错误码文案映射、隐私授权封装为 `utils/*`
- 地理数据：推荐统一使用 GeoJSON `Point`，便于附近/范围查询
- 事务一致性：报名成功后以云函数返回值或「重新拉取详情」更新 UI，避免前端本地+1 造成漂移

## 品牌与文案

- 品牌名统一为「搭里」，页面标题与默认昵称（如“搭里用户”）已更新
- 若需要替换协议/隐私页中的更多品牌相关文案，请在对应页面中统一替换

## 版本与环境

- 微信开发者工具 Lib：3.14.x（以项目配置为准）
- 小程序基础库：随 DevTools/真机
- 云环境：使用 `cloud.DYNAMIC_CURRENT_ENV`

---

如需进一步的「持续集成脚本」或「自动修正 dist 配置」方案，可后续补充到本 README。当前建议开发与部署统一在「根目录项目」进行，以保证云函数与前端的一致性与稳定性。
