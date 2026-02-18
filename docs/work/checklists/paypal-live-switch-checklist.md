# PayPal Live 切换 Checklist

适用范围：`workers/members`（后端支付网关）+ `new-cmt`（前端回跳页）。

## 1. PayPal 生产账号准备

- [ ] 在 PayPal Developer 创建/确认 **Live App**（不是 Sandbox App）。
- [ ] 记录 Live `Client ID`。
- [ ] 记录 Live `Secret`。
- [ ] 在 Live App 中配置 Webhook，URL 填：`https://members.chinamedicaltour.org/api/paypal/webhook`。
- [ ] 勾选需要的 webhook event（至少包含支付完成与退款相关事件）。
- [ ] 记录 Live `Webhook ID`。

## 2. Cloudflare Workers Secrets（生产）

在 `workers/members` 目录执行：

- [ ] `wrangler secret put PAYPAL_CLIENT_ID`
- [ ] `wrangler secret put PAYPAL_SECRET`
- [ ] `wrangler secret put PAYPAL_WEBHOOK_ID`

输入时确认全部为 **Live 凭据**，不是 Sandbox。

## 3. 环境变量与回调地址

已在代码中设置：

- [x] `PAYPAL_ENV=live`
- [x] `PAYPAL_RETURN_URL=https://chinamedicaltour.org/payment?paypal=return`
- [x] `PAYPAL_CANCEL_URL=https://chinamedicaltour.org/payment?paypal=cancel`

对应文件：`workers/members/wrangler.jsonc`

## 4. 部署

- [ ] 在 `workers/members` 执行：`wrangler deploy`
- [ ] 部署后确认路由仍绑定 `members.chinamedicaltour.org`。

## 5. 生产验证（小额真实支付）

- [ ] 前端下单（`pre-consultation`）并跳转 PayPal。
- [ ] 在 PayPal 完成真实支付，回跳 `.../payment?paypal=return`。
- [ ] 会员订单状态变为已支付（或支付后待补资料的业务状态）。
- [ ] 后台 `/admin/payments` 可看到交易并可对账。
- [ ] PayPal 后台可看到该笔交易。

## 6. 退款链路验证（建议）

- [ ] 用一笔可退款测试单做部分或全额退款。
- [ ] 确认系统写入退款记录，订单 `amount_refunded` 正常变化。
- [ ] 确认 PayPal 后台退款状态一致。

## 7. 回滚预案（如需）

- [ ] 将 `PAYPAL_ENV` 改回 `sandbox`（仅紧急临时回滚时使用）。
- [ ] 将 `PAYPAL_RETURN_URL` / `PAYPAL_CANCEL_URL` 改回预览地址（仅沙盒回滚时）。
- [ ] 重新部署 `wrangler deploy`。

