# 手工支付测试用例（PayPal Sandbox / Preview）

## 范围
- 支付方式：仅 PayPal Sandbox
- 环境：Preview
- 覆盖：核心流程 + 安全拦截 + 管理对账/退款
- 币种：USD（由前端请求固定）

## 前置条件
- Preview Workers Secrets 已配置：
  - `PAYPAL_CLIENT_ID`
  - `PAYPAL_SECRET`
  - `PAYPAL_WEBHOOK_ID`
- PayPal Sandbox Webhook 已配置：
  - URL：`https://preview.chinamedicaltour.org/api/paypal/webhook`
  - 事件：`CHECKOUT.ORDER.APPROVED`、`PAYMENT.CAPTURE.COMPLETED`
- PayPal Sandbox 测试账号已准备（账号密码不要写入仓库）。
- 入口页面：`https://preview.chinamedicaltour.org/checkout.html`

## 说明
- Preview 环境当前设置 `PAYPAL_RETURN_URL`/`PAYPAL_CANCEL_URL` 为 `/payment?paypal=return|cancel`。
- 前端默认回跳路径为 `/checkout.html?paypal=return|cancel`。
- 若回跳未触发捕获，请记录为配置不一致问题。

## 测试数据
- Checkout 可选套餐：
  - Executive Basic Package — $1,500 (USD)
  - Executive Premium Package — $2,500 (USD)
  - Reservation Deposit — $500 (USD)

## 用例模板
- 用例 ID
- 优先级（P0/P1/P2）
- 前置条件
- 操作步骤
- 预期结果
- 证据（响应、订单号、时间戳、日志）

---

## P0 核心流程

### P0-01 标准支付流程（基础套餐）
**前置条件**
- 已登录会员（sessionStorage 有 JWT）。

**步骤**
1. 打开 `checkout.html`。
2. 选择 “Executive Basic Package - $1,500”。
3. 点击 “Create PayPal order”。
4. 在 PayPal Sandbox 使用买家账号完成付款。
5. 回跳到站点。

**预期结果**
- 前端提示：`Payment captured. We will follow up shortly.`
- `orders.paypal_order_id` 和 `orders.paypal_capture_id` 有值。
- 订单状态为 `paid` 或 webhook 后更新为 `paid_pending_profile`。

**证据**
- 成功提示截图。
- 订单 ID 与 capture ID。

### P0-02 取消支付流程
**前置条件**
- 已登录会员。

**步骤**
1. 从 `checkout.html` 创建 PayPal 订单。
2. 在 PayPal 页面点击取消。
3. 回跳到站点。

**预期结果**
- 前端提示：`Payment canceled. You can try again.`
- 订单状态保持 `created` 或 `awaiting_payment`。
- 无 capture ID。

**证据**
- 取消提示截图。
- 订单状态记录。

### P0-03 定金支付流程
**前置条件**
- 已登录会员。

**步骤**
1. 选择 “Reservation Deposit - $500”。
2. 完成 PayPal 付款。
3. 回跳到站点。

**预期结果**
- 捕获成功。
- 金额为 $500，币种 USD。
- 订单状态为 `paid` 或 `paid_pending_profile`。

**证据**
- 捕获响应（金额/币种）。
- 订单记录。

### P0-04 回跳触发捕获
**前置条件**
- 已登录会员。
- 已创建 PayPal 订单。

**步骤**
1. 完成 PayPal 付款。
2. 确认回跳 URL 带 `?paypal=return`。

**预期结果**
- 前端自动调用 `/api/paypal/capture`。
- 成功提示，sessionStorage 中 last order 被清除。
- 若未触发捕获，记录为配置不一致问题。

**证据**
- `/api/paypal/capture` 的网络请求日志。
- 状态提示截图。

---

## P1 安全与拦截

### P1-01 未登录访问 checkout
**前置条件**
- 清空 sessionStorage（未登录）。

**步骤**
1. 访问 `checkout.html`。

**预期结果**
- 页面提示：`Please sign in first.`
- 无法创建订单。

**证据**
- 提示截图。

### P1-02 未登录调用 `/api/orders`
**前置条件**
- 无 JWT。

**步骤**
1. 调用 `POST /api/orders`，不带 Authorization。

**预期结果**
- 返回 401（或等价鉴权错误）。
- 不创建订单。

**证据**
- 响应状态码与响应体。

### P1-03 未登录调用 `/api/paypal/create`
**前置条件**
- 无 JWT。

**步骤**
1. 调用 `POST /api/paypal/create`，不带 Authorization。

**预期结果**
- 返回 401（或等价鉴权错误）。
- 不创建 PayPal 订单。

**证据**
- 响应状态码与响应体。

### P1-04 重复捕获（幂等性）
**前置条件**
- 该订单已完成 capture。

**步骤**
1. 对同一订单再次调用 `POST /api/paypal/capture`。

**预期结果**
- 返回错误（不允许重复 capture）。
- 订单状态不变。

**证据**
- 响应状态码与响应体。

### P1-05 Webhook 金额/币种不匹配
**前置条件**
- 订单已存在。

**步骤**
1. 向 `/api/paypal/webhook` 发送伪造 payload（金额或币种不匹配）。

**预期结果**
- 返回 `amount_mismatch` 或 `currency_mismatch`。
- 订单不应被标记为已支付。
- `webhook_events` 记录为失败。

**证据**
- 响应状态码与响应体。
- `webhook_events` 记录。

---

## P2 管理与对账

### P2-01 管理员对账接口
**前置条件**
- 管理员 JWT 可用。
- 当日有 PayPal 交易。

**步骤**
1. 调用 `GET /api/admin/payments?from=YYYY-MM-DD&to=YYYY-MM-DD`。

**预期结果**
- 返回 PayPal 交易列表。
- 金额与币种可与订单对齐。

**证据**
- 响应体片段。

### P2-02 管理员订单查询（已支付）
**前置条件**
- 管理员 JWT 可用。

**步骤**
1. 调用 `GET /api/admin/orders?status=paid`。

**预期结果**
- 返回已支付订单，包含 PayPal order/capture ID。

**证据**
- 响应体片段。

### P2-03 PayPal Sandbox 手动退款
**前置条件**
- PayPal Sandbox 中存在已完成交易。

**步骤**
1. 在 PayPal Sandbox 仪表盘对交易发起退款。
2. 观察系统是否记录退款（如已配置 refund webhook）。

**预期结果**
- 若已配置退款 webhook：系统记录退款事件。
- 若未配置：记录为已知限制。

**证据**
- PayPal 退款截图。
- Webhook 记录（如有）。
