# PayPal 沙盒测试信息清单

本文件用于集中记录“测试支付功能”所需的 PayPal 沙盒信息，以及需要更新的位置。

## 必需信息（用于系统配置）
- **PAYPAL_CLIENT_ID**：Sandbox App 的 Client ID  
- **PAYPAL_SECRET**：Sandbox App 的 Secret（敏感）  
- **PAYPAL_WEBHOOK_ID**：Sandbox App 的 Webhook ID（敏感）  

## 测试账号（用于模拟付款）
- **Sandbox 商家账号（Business）**：邮箱 + 密码（敏感）
- **Sandbox 买家账号（Personal）**：邮箱 + 密码（敏感）

## 需要更新到哪里
1) **Workers Secrets（必须）**  
   用 `wrangler secret put` 写入：  
   - `PAYPAL_CLIENT_ID`
   - `PAYPAL_SECRET`
   - `PAYPAL_WEBHOOK_ID`

2) **PayPal Webhook 回调 URL（必须）**  
   在 PayPal Sandbox App 的 Webhooks 中配置：  
   - `https://chinamedicaltour.org/api/paypal/webhook`

3) **环境说明（建议）**  
   - 测试阶段只使用 **Sandbox**，上线时再切换 Live 凭证。

## 推荐 Webhook 事件列表
必选（与当前代码匹配）：
- `CHECKOUT.ORDER.APPROVED`
- `PAYMENT.CAPTURE.COMPLETED`

可选（后续退款/风控用）：
- `PAYMENT.CAPTURE.DENIED`
- `PAYMENT.CAPTURE.REFUNDED`
- `PAYMENT.CAPTURE.REVERSED`

## 注意事项
- **PAYPAL_SECRET / PAYPAL_WEBHOOK_ID / 测试账号密码** 属于敏感信息，不要写入仓库或明文配置。
- `PAYPAL_CLIENT_ID` 也建议只在后端使用，并通过 Secrets 管理。
