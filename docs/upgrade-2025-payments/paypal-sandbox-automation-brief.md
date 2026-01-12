# PayPal 沙盒自动化测试任务说明书（交给执行 AI）

## 目标
在 PayPal Sandbox 环境下，为医疗旅游支付流程建立最小可靠自动化覆盖，重点验证：
- 核心支付流程（成功、取消、优惠券）
- Webhook 安全与幂等性
- 证据链字段完整性
- 退款闭环（如可自动化则做 API 验证）

## 范围与优先级
### P0（必须自动化）
- A01 正常购买（一次性会员）
- A02 取消支付
- D01 优惠券流程

### P1（尽量自动化，或半自动）
- B01 Webhook 签名验证（真实事件 + 伪造事件）
- B02 幂等性/重放（同一订单重复 capture）
- B03 证据链字段完整性（DB 或 API 校验）

### P2（可选）
- C01 手动退款后状态闭环（Webhook 或后台接口验证）

## 技术建议
- 推荐：Playwright + API 测试（REST）
- 关键策略：
  - 使用稳定的测试账号（买家 A / 买家 B）
  - 使用固定优惠券码
  - 使用“轮询等待”确认 webhook 已处理
  - 对 DB 校验只做关键字段核对（避免脆弱字段）

## 测试数据约束
- 每次测试创建新的订单，避免污染
- 订单/用户必须可追溯（记录 `order_id`, `capture_id`, `user_id`）
- 证据字段最少包含：
  - `terms_version`, `terms_accepted_at`, `ip`, `user_agent`
  - `invoice_id` 或 `receipt_id`

## 任务拆分建议
1) **E2E 流程测试（Playwright）**
   - 流程：登录/注册 → checkout → PayPal sandbox → 返回成功页
   - 取消流程：在 PayPal 页面点取消，验证回退与订单状态
   - 优惠券流程：输入券码，金额核对

2) **API/安全测试（REST）**
   - Webhook 伪造请求（无有效签名）应返回 400/401
   - 幂等性：同一订单调用 capture 两次，第二次失败且不修改状态

3) **数据校验（DB 或 API）**
   - 校验订单状态机变化
   - 校验证据字段完整性

## 输出产物
- 自动化测试脚本与 README（含运行方式）
- 测试报告（通过/失败）
- 关键日志与截图（失败时必须附）

## 运行注意事项
- 不要使用 Live 环境
- 不要重用订单 ID
- 避免硬编码 session/token，使用登录流程或 API 登录


## 执行步骤模板（建议写入 README）
1) 配置环境变量（Sandbox）
2) 安装依赖与浏览器驱动
3) 运行 E2E 用例（A01/A02/D01）
4) 运行 API 用例（B01/B02/B03）
5) 输出测试报告与截图

## Playwright 示例用例结构（建议目录）
- tests/
  - e2e/
    - paypal-success.spec.ts
    - paypal-cancel.spec.ts
    - paypal-coupon.spec.ts
  - api/
    - paypal-webhook-signature.spec.ts
    - paypal-idempotency.spec.ts
    - paypal-evidence-fields.spec.ts
- playwright.config.ts
- README.md

## 用例关键断言建议
- A01：成功页关键文本 + 订单状态为 `paid`/`paid_pending_profile`
- A02：取消页关键文本 + 订单状态为 `created`
- D01：PayPal 页面显示金额与折扣后金额一致
- B01：伪造 webhook 返回 400/401
- B02：重复 capture 第二次失败
- B03：证据字段完整性校验通过

