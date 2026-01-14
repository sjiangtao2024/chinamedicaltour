# PayPal 退款自动化设计（管理员触发 + Webhook 回写）

## 目标
- 管理员审核后自动调用 PayPal 退款 API。
- 通过 Webhook 回写确保状态与 PayPal 一致。
- 支持部分退款（自动计算 + 管理员微调）。
- 保留完整审计链路与可重试机制。

## 范围
**包含：**
- 退款申请与审批状态机
- PayPal 退款调用与 webhook 回写
- 部分退款金额计算与校验

**不包含：**
- PayPal 争议/拒付处理
- 多次分批退款（仅允许一次部分退款）

## 关键规则（来自条款）
- 定金：预约确认后不可退
- 全款：到达前 ≥7 天退 80%；到达前 ≤24 小时不退
- 计算基准：预约/到达日期（订单内字段，如 `checkup_date`）

---

## 架构与组件
1) **订单域（orders）**  
新增预约确认标记（建议字段 `appointment_confirmed_at` 或状态 `appointment_confirmed`），用于退款规则判断。

2) **退款请求（refund_requests）**  
扩展记录字段，用于金额计算、支付方跟踪与审计：
- `policy_amount_cents` / `approved_amount_cents` / `currency`
- `admin_adjustment_cents` / `admin_note`
- `provider` / `provider_capture_id` / `provider_refund_id`
- `status` / `error` / `error_at` / `refunded_at`

3) **PayPal 退款与 Webhook**  
新增退款 API 调用与 `PAYMENT.CAPTURE.REFUNDED` 事件处理。

---

## 数据流（状态机）
**用户发起**  
`/api/orders/:id/refund-request` → 新建 `refund_requests` (`pending`)  
订单状态：`refund_requested`

**管理员审核**  
管理员查看并计算 `policy_amount_cents`  
允许微调 → `approved_amount_cents`  
审核通过 → `refund_approved`

**触发退款**  
管理员点击“发起退款”：  
调用 PayPal 退款 API  
成功后订单状态 → `refund_pending_webhook`  
记录 `provider_refund_id`

**Webhook 回写**  
接收 `PAYMENT.CAPTURE.REFUNDED`  
校验金额/币种 → 更新 `refund_requests.status = completed`  
订单状态 → `refunded`

---

## 错误处理与幂等
**驳回**  
管理员设置 `rejected` → 订单状态 `refund_rejected`，记录 `admin_note`

**API 失败**  
退款 API 调用失败：保留 `refund_approved`，记录 `error`，允许重试

**幂等性**  
同一 `capture_id` 仅允许一次成功退款  
若已有 `provider_refund_id`，重复触发应直接返回当前状态

**Webhook 超时**  
`refund_pending_webhook` 超过 24 小时未回写 → 标记 `refund_failed` 并提示人工检查/重试

**金额不一致**  
Webhook 金额与 `approved_amount_cents` 不一致 → 标记 `refund_mismatch`

---

## API 设计建议
- `PATCH /api/admin/refund-requests/:id`
  - `status=approved`：仅审核通过
  - `status=refund_initiated`（新增）触发 PayPal 退款调用
  - `status=rejected`：驳回
- Webhook 支持 `PAYMENT.CAPTURE.REFUNDED`

---

## 测试要点
1) 审核通过后自动退款成功  
2) 部分退款金额校验（自动计算 + 管理员调整）  
3) Webhook 回写后状态正确  
4) 退款 API 失败可重试  
5) Webhook 超时后的失败标记  
6) 金额不匹配时拒绝更新并记录
