# 官方实名 3.1 生产收口手册

> 适用项目：`daling-mvp`  
> 适用函数：`officialVerifyCallback`、`getAdminDashboard`

## 1. 3.1 本次能力

1. 回调安全增强：签名校验 + IP 白名单（可开关）
2. 防重放：基于 `nonce` 的短窗口拦截
3. 告警升级：高危失败即时告警 + 连续失败阈值告警
4. 审计看板升级：新增即时告警、重放拦截、签名失败等指标

## 2. 环境变量清单（`officialVerifyCallback`）

以下变量都在：云开发控制台 -> 云函数 -> `officialVerifyCallback` -> 配置 -> 高级配置 -> 环境变量

### 2.1 基础必填

1. `OFFICIAL_VERIFY_CALLBACK_TOKEN`  
   - 用途：回调口令校验  
   - 示例：`DALI_CB_TOKEN_PROD_20260401_X9K2M7`
2. `OFFICIAL_VERIFY_SIGN_SECRET`  
   - 用途：HMAC-SHA256 签名密钥  
   - 示例：`DALI_SIGN_SECRET_PROD_20260401_aB3dE5...`（建议 32+ 位）
3. `OFFICIAL_VERIFY_SIGNATURE_REQUIRED`  
   - 用途：是否强制签名  
   - 建议：`true`
4. `OFFICIAL_VERIFY_SIGN_TTL_SECONDS`  
   - 用途：签名时间戳有效期（秒）  
   - 建议：`300`

### 2.2 3.1 新增（建议开启）

1. `OFFICIAL_VERIFY_REPLAY_GUARD_ENABLED`  
   - 用途：是否开启防重放  
   - 建议：`true`
2. `OFFICIAL_VERIFY_REPLAY_GUARD_WINDOW_SECONDS`  
   - 用途：nonce 重放窗口（秒）  
   - 建议：`600`
3. `OFFICIAL_VERIFY_IMMEDIATE_ALERT_ENABLED`  
   - 用途：是否开启高危即时告警  
   - 建议：`true`
4. `OFFICIAL_VERIFY_IMMEDIATE_ALERT_WINDOW_MINUTES`  
   - 用途：即时告警去重窗口（分钟）  
   - 建议：`15`
5. `OFFICIAL_VERIFY_IMMEDIATE_ALERT_STATUSES`  
   - 用途：触发即时告警的失败状态白名单（英文逗号分隔）  
   - 建议：`FAILED_UNAUTHORIZED,FAILED_IP_DENIED,FAILED_SIGNATURE_MISMATCH,FAILED_SIGNATURE_EXPIRED,FAILED_REPLAY_ATTACK`

### 2.3 白名单（生产建议开启）

1. `OFFICIAL_VERIFY_IP_WHITELIST_ENABLED`  
   - 建议：`true`
2. `OFFICIAL_VERIFY_IP_WHITELIST`  
   - 示例：`1.2.3.4,1.2.3.5,10.20.*`  
   - 说明：多个值用英文逗号，支持前缀通配 `*`

### 2.4 阈值告警（延续 3.0）

1. `OFFICIAL_VERIFY_FAIL_ALERT_THRESHOLD`  
   - 连续失败多少次触发阈值告警  
   - 建议：`3`
2. `OFFICIAL_VERIFY_FAIL_ALERT_WINDOW_MINUTES`  
   - 连续失败统计窗口（分钟）  
   - 建议：`30`

## 3. 逐步点击配置（超详细）

1. 打开微信云开发控制台，确认环境是你的生产环境。  
2. 左侧点击 `云函数`。  
3. 点击 `officialVerifyCallback`。  
4. 点击右上角 `配置`。  
5. 下拉到 `高级配置` -> `环境变量`。  
6. 一行一行填写上面的变量。  
7. 点击右下角 `确定`。  
8. 如果看到 “函数 Updating，无法修改”，等待 30~90 秒后刷新再操作。  
9. 配置完成后，再进入函数详情页确认变量已保存。

## 4. 回调签名生成（本地命令）

> 用于控制台“测试云函数”时生成合法签名

```bash
python3 - <<'PY'
import time,hmac,hashlib,json
secret="请填 OFFICIAL_VERIFY_SIGN_SECRET"
event={
  "token":"请填 OFFICIAL_VERIFY_CALLBACK_TOKEN",
  "ticket":"ovf_demo_success_001",
  "openid":"oN_1h3RMPKILX_I6aJpMmzSMb-ks",
  "result":"approved",
  "traceId":"trace_official_3_1_001",
  "callbackId":"cb_official_3_1_001"
}
event["timestamp"]=str(int(time.time()))
event["nonce"]="n_official_3_1_001"
payload="|".join([event["timestamp"],event["nonce"],event["ticket"],event["openid"],event["result"],event["traceId"],event["callbackId"]])
event["signature"]=hmac.new(secret.encode(),payload.encode(),hashlib.sha256).hexdigest()
print(json.dumps(event,ensure_ascii=False,indent=2))
PY
```

## 5. 真机/控制台验收脚本（3.1）

1. 用上面命令生成“成功回调”JSON。  
2. 控制台测试 `officialVerifyCallback`，预期返回 `success: true`。  
3. 原样再测一次，预期幂等成功（不重复落库）。  
4. 把 `signature` 手动改错一位，预期返回 `SIGNATURE_MISMATCH`。  
5. 用同一个 `nonce`，但换一个新的 `callbackId` 重新签名后再调，预期返回 `FAILED_REPLAY_ATTACK`。  
6. 打开小程序管理后台 -> 待办中心 -> 官方实名审计看板：  
   - 看到“24h即时告警”计数变化  
   - 看到“重放拦截/签名失败”指标变化  
   - 最近告警列表有 `[即时]` 或 `[阈值]` 标记  

## 6. 回滚开关（紧急）

若线上短时异常，需要快速恢复通路，可临时调整：

1. `OFFICIAL_VERIFY_REPLAY_GUARD_ENABLED=false`（仅关闭防重放）
2. `OFFICIAL_VERIFY_IMMEDIATE_ALERT_ENABLED=false`（仅关闭即时告警）
3. `OFFICIAL_VERIFY_IP_WHITELIST_ENABLED=false`（仅关闭白名单）

> 不建议关闭签名校验。  
> 若确实需要临时关闭，优先短时操作并立刻恢复：`OFFICIAL_VERIFY_SIGNATURE_REQUIRED=false`。
