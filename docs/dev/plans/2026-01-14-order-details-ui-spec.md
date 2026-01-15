# 订单详情页展示规范（时间/Intake/状态/按钮）- 2026-01-14

## 目标
为订单详情页补齐以下能力：
1) 订单时间展示（含时区与切换）
2) Intake 信息展示（默认脱敏、可单字段解锁）
3) 取消/退款按钮与状态绑定
4) 状态说明（ⓘ 提示）
5) 智能客服入口（占位）

## 数据来源（字段取数路径）

### 订单基础信息
- 订单列表/详情接口：`GET /api/orders`、`GET /api/orders/:id`
- 关键字段（orders 表）：
  - `id`
  - `created_at`（订单创建时间）
  - `status`
  - `amount_paid`
  - `currency`
  - `paypal_order_id`
  - `paypal_capture_id`

### Intake 信息
- 订单资料接口：`POST /api/orders/:id/profile`（当前为写入）
- 建议新增读取接口：`GET /api/orders/:id/profile`
- 关键字段（order_profiles 表）：
  - `name`, `gender`, `birth_date`, `checkup_date`
  - `contact_info`, `emergency_contact`, `companions`, `email`

### 时区与显示
- 用户时区：浏览器 `Intl.DateTimeFormat().resolvedOptions().timeZone`
- 业务默认时区：`Asia/Shanghai`
- UTC：`UTC`

---

## UI 文案与展示规则

### A. 时间显示（Order Summary）
**展示格式（默认用户本地时区）：**
- `Created at: 2026-01-13 10:32 (GMT-5, Local)`

**可切换：**
- `View in China Time (GMT+8)`
- `View in UTC`

**说明（tooltip）：**
- “Order time is recorded at creation. Appointment date is shown separately.”

**后台管理建议：**
- 同时显示 Local + UTC（便于对账）

### B. Intake 展示（默认折叠 + 脱敏）
**模块名称：** Intake Information

**脱敏规则（默认展示）：**
- Email：`a***@domain.com`
- Phone/Contact：`+1 **** 6789`
- Emergency Contact：`****` + 末尾 2–4 位
- Birth Date：可默认仅显示年份（如 `1992`）

**解锁方式：**
- 每个字段右侧 `Show` 按钮单独解锁
- 解锁后提示：`Sensitive info. Please view in private.`

### C. 状态说明（ⓘ）
**交互：**
- 状态右侧 `ⓘ` 图标
- 点击弹出简短说明 + 下一步提示

**示例文案：**
- `paid_pending_profile`："Payment received. Please complete your intake."  / “Complete intake now.”
- `refund_pending_webhook`："Refund is processing. We'll notify you when completed."

### D. 取消/退款按钮规则
**原则：** 只有特定状态允许操作，其他状态隐藏或禁用。

| 状态 | 显示按钮 | 说明 |
|---|---|---|
| `created` | Pay now / Cancel order | 未支付可取消 |
| `awaiting_payment` | Pay now / Cancel order | 等待支付 |
| `awaiting_capture` | 无 | 支付处理中 |
| `paid` | Request refund | 已支付只允许退款 |
| `paid_pending_profile` | Request refund / Complete intake | 建议优先补充资料 |
| `profile_completed` | Request refund | 已进入服务流程 |
| `refund_requested` | 无（显示处理提示） | 防止重复申请 |
| `refund_approved` | 无（显示处理提示） | 等待退款执行 |
| `refund_pending_webhook` | 无（显示处理提示） | 等待回写 |
| `refunded` | 无 | 已退款 |
| `refund_rejected` | Contact support | 客服处理 |
| `cancelled` | Create new order | 已取消 |
| `payment_expired` | Create new order | 已过期 |

### E. 智能客服联动（占位）
- 在订单状态卡片右侧固定入口：`Chat with Support`
- 后续扩展：状态变化弹窗提醒

---

## 前后端改动建议（文档级）

### 后端
- 新增读取 Intake：`GET /api/orders/:id/profile`
- 订单详情接口返回 `created_at`（若现有未返回）
- 返回字段需包含 `status`、`amount_paid`、`currency`

### 前端
- 订单详情页新增：
  - 时间显示 + 时区切换
  - Intake 信息卡片（折叠 + 脱敏 + 单字段解锁）
  - 状态 `ⓘ` 弹层解释
  - 按钮显示规则
  - 智能客服入口占位

---

## 附：状态文案建议（简短版）
- `created`: “Order created. Please proceed to payment.”
- `awaiting_payment`: “Awaiting payment confirmation.”
- `awaiting_capture`: “Payment authorized. Capturing now.”
- `paid`: “Payment received.”
- `paid_pending_profile`: “Payment received. Intake required.”
- `profile_completed`: “Intake completed. We’ll review.”
- `refund_requested`: “Refund requested. We’re reviewing.”
- `refund_approved`: “Refund approved. Processing.”
- `refund_pending_webhook`: “Refund processing. We’ll notify you.”
- `refunded`: “Refund completed.”
- `refund_rejected`: “Refund rejected. Contact support.”
- `cancelled`: “Order cancelled.”
- `payment_expired`: “Payment expired.”
