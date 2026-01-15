# PayPal Webhook Security Fix - Test Checklist

## A. 预检
- [ ] 确认已部署最新代码（含 `workers/members/src/routes/paypal.js` 修改）
- [ ] 迁移已应用：`webhook_events` 表存在
- [ ] 确认灰度域名与 PayPal webhook URL 对应

## B. 正常支付链路
- [ ] 创建订单（记录 `order_id`、`amount_paid`、`currency`）
- [ ] 调 `/api/paypal/create` 获取 `paypal_order_id`
- [ ] 在 PayPal 沙箱完成付款
- [ ] 确认 `orders.status = paid_pending_profile`
- [ ] 确认 `webhook_events` 新增一条 `status=processed`

## C. 幂等重放
- [ ] 取一次真实 webhook payload（从 PayPal 控制台或日志）
- [ ] 第一次 POST 到 `/api/paypal/webhook` → 期望 `200 ok`
- [ ] 第二次用同 payload 再 POST → 期望 `200 ok` 且 `ignored: true`
- [ ] 确认订单状态无二次变化
- [ ] `webhook_events` 仍只有一次 `processed`

## D. 金额篡改
- [ ] 复制同 payload，将 `amount.value` 改为 `0.01`
- [ ] POST 到 `/api/paypal/webhook`
- [ ] 期望 `400 amount_mismatch`
- [ ] 订单状态不变化
- [ ] `webhook_events` 新增 `status=failed`，`error=amount_mismatch`

## E. 币种篡改
- [ ] 复制 payload，将 `currency_code` 改为不一致（如 `EUR`）
- [ ] POST 到 `/api/paypal/webhook`
- [ ] 期望 `400 currency_mismatch`
- [ ] 订单状态不变化
- [ ] `webhook_events` 新增 `status=failed`，`error=currency_mismatch`

## F. 自检 SQL（可选）
- [ ] `SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 5;`
- [ ] `SELECT id, status, amount_paid, currency, paypal_capture_id FROM orders WHERE id = '<order_id>';`
