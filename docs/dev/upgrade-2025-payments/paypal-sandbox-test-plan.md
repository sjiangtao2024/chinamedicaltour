# PayPal 沙盒测试计划（基于证据链的合规流程）

> **状态**: 草稿
> **范围**: 全量合规与安全测试 (Option C)
> **目标**: 在正式部署前，验证支付可靠性、安全证据留存以及后台对账功能。

## 1. 环境与前置条件

开始测试前，请确保 Cloudflare Workers **Preview** 环境已完成以下配置。

### 1.1 Cloudflare Workers 配置
- [ ] **Secrets 已设置**: `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_WEBHOOK_ID` (使用 Sandbox 值)
- [ ] **Vars 已设置**: `PAYPAL_RETURN_URL`, `PAYPAL_CANCEL_URL` 指向 `https://preview.chinamedicaltour.org/...`
- [ ] **数据库**: D1 迁移已执行（`orders`, `users` 等表已存在）

### 1.2 PayPal 沙盒设置
- [ ] **企业账号 (Business Account)**: 已在 [PayPal 开发者仪表盘](https://developer.paypal.com/dashboard/accounts) 创建。
- [ ] **个人账号 (Personal Accounts)**: 创建至少 2 个测试账号：
    - **买家 A**: 默认设置（余额充足）。
    - **买家 B**: 余额充足，但可用于手动测试“拒绝”场景。
- [ ] **Webhook 已配置**:
    - URL: `https://preview.chinamedicaltour.org/api/paypal/webhook`
    - 事件: `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`

---

## 2. 测试用例

### A 阶段：核心支付流程（用户视角）

| ID | 场景 | 步骤 | 预期结果 | 通过/失败 |
| :--- | :--- | :--- | :--- | :--- |
| **A01** | **标准流程：新会员注册** | 1. 访问 `/register` -> 创建账号。<br>2. 访问 `/profile` -> 填写资料。<br>3. 访问 `/checkout` -> 选择“白银套餐”。<br>4. 使用 **买家 A** 支付。<br>5. 返回商户网站。 | - 跳转至成功页面。<br>- DB `orders`: 状态变更为 `paid_pending_profile` (或 `paid`)。<br>- DB `users`: 状态已更新。<br>- 邮件: 收到支付凭证。 | |
| **A02** | **取消支付** | 1. 在 PayPal 结账页面，点击“取消”链接。<br>2. 返回商户网站。 | - 跳转回 `/checkout` 或取消页面。<br>- DB `orders`: 状态保持 `created` (未支付)。<br>- 不发送邮件。 | |
| **A03** | **使用优惠券** | 1. 输入有效的优惠券代码。<br>2. 验证折扣金额。<br>3. 前往 PayPal 支付。 | - PayPal 显示金额与折后总额一致。<br>- DB `orders`: 记录了 `coupon_id`，且 `amount_paid` 正确。 | |
| **A04** | **访客/老用户流程** | 1. 登录已有账号。<br>2. 尝试购买“定金”。<br>3. 完成支付。 | - 订单正确关联到现有的 `user_id`。<br>- 如果提供了新字段，Profile 应更新。 | |

### B 阶段：安全与合规（证据链）

| ID | 场景 | 步骤 | 预期结果 | 通过/失败 |
| :--- | :--- | :--- | :--- | :--- |
| **B01** | **Webhook 签名验证** | 1. 触发一笔真实支付。<br>2. **验证**: 检查 Worker 日志中的 "Webhook signature verification"。<br>3. **攻击模拟**: 使用 Postman 向 `/api/paypal/webhook` 发送伪造 payload（不带有效头）。 | - 真实事件: 返回 200 OK。<br>- 伪造事件: 返回 400/401 错误 (验证失败)。 | |
| **B02** | **防重复支付 (幂等性)** | 1. 创建订单。<br>2. **攻击模拟**: 尝试对同一个 Order ID 调用两次 `/api/paypal/capture` (重放攻击)。 | - 第一次调用: 成功。<br>- 第二次调用: 返回错误 (订单已捕获/状态无效)。 | |
| **B03** | **证据日志留存** | 1. 完成一笔支付。<br>2. 检查 DB `orders` 和 `user_profiles`。 | - **必需**: 必须记录 IP 地址、时间戳、条款同意版本（或可通过日志关联）。<br>- 这是“基于证据的反欺诈”所必需的。 | |

### C 阶段：管理与对账

| ID | 场景 | 步骤 | 预期结果 | 通过/失败 |
| :--- | :--- | :--- | :--- | :--- |
| **C01** | **管理员对账报表** | 1. 调用 `/api/admin/payments?date=YYYY-MM-DD`。 | - JSON 响应列出 PayPal 交易记录 vs DB 订单。<br>- 状态应一致。 | |
| **C02** | **退款处理 (手动)** | 1. 在 PayPal 沙盒仪表盘手动退款一笔交易。<br>2. 等待 Webhook (如已配置) 或手动检查。 | - 系统理想情况下应记录退款日志 (如果启用了 `PAYMENT.CAPTURE.REFUNDED` webhook)。 | |

---

## 3. 上线检查清单 (切换到生产环境)

所有测试通过后，请按以下步骤上线：

1.  **PayPal 仪表盘**:
    - [ ] 将开关从 "Sandbox" 切换到 "Live"。
    - [ ] 创建 **Live** App 凭证 (Client ID & Secret)。
    - [ ] 配置 **Live** Webhook URL (`https://chinamedicaltour.org/api/paypal/webhook`)。

2.  **Cloudflare Workers (生产环境)**:
    - [ ] 运行 `wrangler secret put PAYPAL_CLIENT_ID` (输入 Live ID)。
    - [ ] 运行 `wrangler secret put PAYPAL_SECRET` (输入 Live Secret)。
    - [ ] 运行 `wrangler secret put PAYPAL_WEBHOOK_ID` (输入 Live Webhook ID)。
    - [ ] 更新代码/配置以使用 `https://api-m.paypal.com` (移除任何硬编码的 Sandbox URL)。

3.  **最终验证**:
    - [ ] 使用个人信用卡（非商家卡）进行**一笔真实交易**（$1.00 或最小金额）。
    - [ ] 验证收据并立即执行全额退款。

---

## 4. 故障排查指南

- **错误: "INVALID_RESOURCE_ID"**: 通常意味着 Order ID 错误，或者混用了 Sandbox/Live 凭证。
- **Webhook 400/Verification Failed**: 检查 `PAYPAL_WEBHOOK_ID` 是否与当前环境匹配（Sandbox 和 Live 的 ID 是不同的）。
- **订单卡在 "Awaiting Payment"**: Webhook 可能失败。请检查 Worker 日志。
