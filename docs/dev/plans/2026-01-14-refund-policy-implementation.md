# 退款策略与实现文档 - 2026-01-14

## 目标
把退款策略（规则、时限、费用扣减）与当前实现落地统一记录，便于后续维护与扩展。

## 退款策略概览
### 适用类型
- **INTELLECTUAL**：智力交付类（如预咨询/报告）
- **STANDARD**：标准化套餐（体检/理疗等）
- **CUSTOM**：定制化服务（手术/陪诊等）
- **THIRD_PARTY**：第三方透传（酒店/医院代付）

### 计算规则摘要
- **INTELLECTUAL**
  - 已交付（`DELIVERED` 或 `delivered_at` 有值）→ 不可退
  - 处理中（`IN_PROGRESS`）→ 退 50%
  - 已付款未处理 → 退全额 - 通道费
- **STANDARD**（以 `service_start_date` 为基准）
  - > 7 天：退 90%
  - 3–7 天：退 50%
  - 48 小时 – 3 天：退 50%（灰区，建议人工审核）
  - < 48 小时：不可退
- **CUSTOM**（以 `service_start_date` 为基准）
  - ≥ 30 天：退 80%
  - 15–29 天：退 50%
  - 0–14 天：不可退
- **THIRD_PARTY**：强制人工审核，不自动退款

> 退款基数统一为：`amount_paid - payment_gateway_fee`

## 数据模型（D1）
### 新增/扩展字段
**orders**
- `refund_policy_type`
- `terms_version`
- `terms_agreed_at`
- `service_start_date`
- `delivery_status`
- `delivered_at`
- `payment_gateway_fee`
- `is_deposit`
- `check_in_date`
- `amount_refunded`

**service_products**（服务映射表）
- `item_type` / `item_id`（与订单匹配）
- `refund_policy_type`
- `terms_version`

**payment_refunds**（退款记录）
- `order_id` / `user_id`
- `amount` / `currency`
- `gateway_fee` / `gateway_refund_id`
- `status` / `reason` / `created_at`

## 核心接口
### 用户侧
- `GET /api/orders/:id/refund-estimate`
  - 返回 `refundable_amount`、`amount_refunded` 与计算状态
- `GET /api/packages`
  - 套餐唯一真源，包含展示字段与退款策略字段

### 管理员侧
- `POST /api/admin/orders/:id/refund`
  - 发起 PayPal 退款（支持部分退款）
  - 成功后写入 `payment_refunds` 并更新订单 `amount_refunded` 与 `status`

### PayPal Webhook
- `PAYMENT.CAPTURE.REFUNDED`
  - 根据 `gateway_refund_id` 回写 `payment_refunds` 状态与 `orders.amount_refunded`、`orders.status`

## 前端（支付页）
- 强制勾选退款政策（Refund Policy）
- 订单创建时写入：
  - `terms_version`
  - `terms_agreed_at`

## 退款流程（高层）
1. 下单 → 写入 `refund_policy_type` + `terms_*`（快照）
2. 支付完成 → 写入 `payment_gateway_fee`
3. 退款估算 → 使用快照与订单字段计算可退金额
4. 管理员发起退款 → 调用 PayPal 退款 API → 写入 `payment_refunds`
5. Webhook 回写 → 更新退款记录与订单退款状态

## 新增套餐的操作要求
新增套餐时 **必须** 同步到 `service_products`，否则下单会报 `service_product_not_configured`。

推荐流程：
1. 在 `service_products` 插入新套餐映射（`item_type`/`item_id`/`refund_policy_type`/`terms_version`）
2. 确认前端 `packageId` 与后端 `item_id` 一致
3. 若政策变更，更新对应 `terms_version` 并同步前端常量
4. `GET /api/packages` 将自动返回新套餐，无需前端硬编码

## 约束与注意事项
- 退款规则基于订单快照，不随未来政策变化而回溯修改。
- `service_start_date` 缺失时只允许人工处理。
- `THIRD_PARTY` 统一走人工审核。
- `payment_gateway_fee` 以 PayPal/Stripe 实际返回为准，不允许估算。
- `service_products` 是套餐唯一真源，新增/下架请更新此表。

## 变更记录
- 2026-01-14：首次落地退款策略、退款估算与自动退款流程。

## 上线检查清单
1. 部署 members（含 `/api/packages` 与退款逻辑）
2. 部署 new-cmt（支付页读取 `/api/packages`）
3. 验收：
   - `GET https://members.chinamedicaltour.org/api/packages` 返回 12 套餐并含价格/特性
   - `/payment?package=full-body` 页面能展示套餐信息
   - 下单时必须勾选退款政策，订单创建成功
