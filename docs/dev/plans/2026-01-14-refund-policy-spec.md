# 退款策略规范（基于开发者文档）- 2026-01-14

## 目标
将《退款逻辑开发者文档》中的规则落地为：
- 可执行的后端退款计算逻辑
- 可核对的数据库字段
- 可解释的前端/后台交互

## 适用范围
- 支付方式：PayPal/Stripe（需扣除通道费）
- 退款类型：INTELLECTUAL / STANDARD / CUSTOM / THIRD_PARTY
- 支持部分退款（后台可手动输入）

---

## 1. 核心策略概览

### 1.1 服务类型
- **INTELLECTUAL**（智力交付类，仅限预咨询/报告）
- **STANDARD**（标准化套餐，如体检/理疗）
- **CUSTOM**（定制化治疗/管家服务，如手术/陪诊）
- **THIRD_PARTY**（第三方透传，如酒店/医院代付）

### 1.2 时间与时区
- 所有时间计算需统一使用 **UTC 或北京时间**（后端明确转换），避免用户时区造成偏差。

---

## 2. 数据结构要求（关键字段）

### 2.1 ServiceProduct（服务产品定义）
- `refund_policy_type`：枚举 { INTELLECTUAL, STANDARD, CUSTOM, THIRD_PARTY }

### 2.2 Order / OrderItem（订单实例）
- `service_start_date`：服务/行程开始时间（退款时间窗基准）
- `delivery_status`：PENDING / IN_PROGRESS / DELIVERED
- `delivered_at`：交付时间戳（智力交付判定）
- `payment_gateway_fee`：支付通道费（需从支付 API 获取）
- `is_deposit`：是否定金
- `check_in_date`：酒店入住日期（第三方或酒店相关订单）

---

## 3. 退款计算规则

### 3.1 INTELLECTUAL（智力交付类，仅预咨询）
- 预咨询一旦付款即开始服务 → **不可退**
- 允许 **3 次免费修改**（首次报告不满意时提出）

### 3.2 STANDARD（标准化套餐）
- 基于 `service_start_date` 与取消时间差（hours）
- 退款基数：`amount_paid - payment_gateway_fee`

| 时间差 | 退款比例 |
|---|---|
| > 7 天 | 90% |
| 3–7 天 | 50% |
| < 48 小时 | 0% |
| 48 小时 – 3 天 | 50%（灰区，可人工审核） |

### 3.3 CUSTOM（定制化服务）
- 基于 `service_start_date` 与取消时间差（days）
- 退款基数：`amount_paid - payment_gateway_fee`

| 时间差 | 退款比例 |
|---|---|
| ≥ 30 天 | 80% |
| 15–29 天 | 50% |
| 0–14 天 | 0% |

### 3.4 THIRD_PARTY（透传费用）
- **强制人工审核**
- 状态标记为 `REQUIRES_MANUAL_REVIEW`
- 需人工确认酒店/医院可退款后再处理

---

## 4. 前端与交互规范

### 4.1 付款前强制勾选
- 文案：
  > I have read and agree to the Refund Policy. I acknowledge that transaction fees are non-refundable and Consulting Reports are final upon delivery.
- 必须勾选才能提交订单
- 记录字段：`terms_agreed_at`、`terms_version`

### 4.2 智力产品交付留痕
- 管理员发送报告后：
  - 更新 `delivery_status = DELIVERED`、`delivered_at = NOW()`
  - 记录日志

---

## 5. 支付网关对接

### 5.1 扣除通道费
- 退款金额 = 原金额 - 支付手续费 - 取消惩罚
- 手续费需通过 PayPal/Stripe API 获取，不允许估算

### 5.2 争议处理（P2）
- 监听 `dispute.created`
- 自动冻结账号、通知管理员、生成证据包（包含 delivered_at 与 terms_agreed_at）

---

## 6. 后台人工补偿（P2）
- Admin 后台提供 “Issue Partial Refund” 按钮
- 限制：退款金额不得超过 `amount_paid`
- 必填原因分类（如 Service Quality Compensation）

---

## 7. 开发优先级

- **P0**：字段更新（delivered_at、refund_policy_type、terms_agreed_at/terms_version）、付款前勾选、INTELLECTUAL 交付锁定
- **P1**：STANDARD / CUSTOM 时间窗计算、通道费扣除
- **P2**：争议证据包、用户端取消/预估退款

---

## 8. 待确认事项
- 当前系统 Order / OrderItem 是否存在（若没有，需要设计拆分）
- ServiceProduct 是否存在（如无，需要新增映射或配置表）
- 支付手续费获取方式（PayPal/Stripe API 接口细节）
