# PayPal 退款自动化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在管理员审核后自动调用 PayPal 退款，并通过 Webhook 回写确保状态一致，支持部分退款（自动计算 + 管理员微调）。

**Architecture:** 在 `refund_requests` 扩展退款数据字段，并新增订单预约确认标记；管理员发起退款时调用 PayPal 退款 API 并记录 `provider_refund_id`；Webhook 收到 `PAYMENT.CAPTURE.REFUNDED` 后按 `provider_refund_id` 回写订单与退款状态。

**Tech Stack:** Cloudflare Workers (JavaScript), D1 (SQLite), PayPal REST API, Node test runner (existing tests in `workers/members/tests`).

---

### Task 1: 新增退款自动化所需数据字段与迁移

**Files:**
- Create: `workers/members/migrations/0007_add_refund_automation_fields.sql`
- Modify: `workers/members/tests/schema.test.mjs`

**Step 1: 写失败测试**

```js
import assert from "node:assert/strict";
import fs from "node:fs";

const refundAutoSql = fs.readFileSync(
  "workers/members/migrations/0007_add_refund_automation_fields.sql",
  "utf8"
);
assert.ok(refundAutoSql.includes("ALTER TABLE refund_requests"));
assert.ok(refundAutoSql.includes("provider_refund_id"));
assert.ok(refundAutoSql.includes("approved_amount_cents"));
assert.ok(refundAutoSql.includes("ALTER TABLE orders ADD COLUMN appointment_confirmed_at"));
```

**Step 2: 运行测试确认失败**

Run: `node workers/members/tests/schema.test.mjs`
Expected: FAIL（文件不存在或字段缺失）

**Step 3: 最小实现**

```sql
ALTER TABLE refund_requests ADD COLUMN policy_amount_cents INTEGER;
ALTER TABLE refund_requests ADD COLUMN approved_amount_cents INTEGER;
ALTER TABLE refund_requests ADD COLUMN admin_adjustment_cents INTEGER;
ALTER TABLE refund_requests ADD COLUMN currency TEXT;
ALTER TABLE refund_requests ADD COLUMN provider TEXT;
ALTER TABLE refund_requests ADD COLUMN provider_capture_id TEXT;
ALTER TABLE refund_requests ADD COLUMN provider_refund_id TEXT;
ALTER TABLE refund_requests ADD COLUMN error TEXT;
ALTER TABLE refund_requests ADD COLUMN error_at TEXT;
ALTER TABLE refund_requests ADD COLUMN refunded_at TEXT;

ALTER TABLE orders ADD COLUMN appointment_confirmed_at TEXT;
```

**Step 4: 运行测试确认通过**

Run: `node workers/members/tests/schema.test.mjs`
Expected: PASS

**Step 5: 提交**

```bash
git add workers/members/migrations/0007_add_refund_automation_fields.sql workers/members/tests/schema.test.mjs
git commit -m "feat(refund): add schema fields for automation"
```

---

### Task 2: 增加退款计算逻辑（自动规则 + 管理员微调）

**Files:**
- Create: `workers/members/src/lib/refunds.js`
- Modify: `workers/members/src/routes/admin.js`
- Test: `workers/members/tests/refund-calc.test.mjs`

**状态说明（先记录，不立即实现）**
- 1–7 天区间退款比例仍在讨论中，规则未确定。
- 在退款策略确认前，暂不落地自动计算逻辑；保留设计与测试占位即可。

**策略确认后的落地占位（待补充）**
1) 在文档中追加明确规则（如分段比例或线性递减），并更新条款页面文本。
2) 在 `calculateRefundCents` 中实现新规则，并补充对应测试用例。
3) 在管理端 UI/接口中展示“系统计算金额”与“管理员调整金额”，并记录差异原因。

**Step 1: 写失败测试**

```js
import assert from "node:assert/strict";
import { calculateRefundCents } from "../src/lib/refunds.js";

const now = new Date("2026-01-13T00:00:00Z");
const order = { amount_paid: 150000, item_id: "package-basic" };

// 全款：到达前 >=7 天退 80%
const resultA = calculateRefundCents({
  order,
  checkupDate: "2026-01-30",
  appointmentConfirmedAt: null,
  now,
});
assert.equal(resultA.policyAmountCents, 120000);

// 到达前 <=24 小时：不退
const resultB = calculateRefundCents({
  order,
  checkupDate: "2026-01-13",
  appointmentConfirmedAt: null,
  now,
});
assert.equal(resultB.policyAmountCents, 0);

// 定金预约确认后：不退
const depositOrder = { amount_paid: 50000, item_id: "deposit" };
const resultC = calculateRefundCents({
  order: depositOrder,
  checkupDate: "2026-02-01",
  appointmentConfirmedAt: "2026-01-10T10:00:00Z",
  now,
});
assert.equal(resultC.policyAmountCents, 0);
```

**Step 2: 运行测试确认失败**

Run: `node workers/members/tests/refund-calc.test.mjs`
Expected: FAIL（模块缺失或断言失败）

**Step 3: 最小实现**

```js
export function calculateRefundCents({ order, checkupDate, appointmentConfirmedAt, now = new Date() }) {
  const amount = Number(order?.amount_paid || 0);
  const isDeposit = order?.item_id === "deposit";
  if (isDeposit && appointmentConfirmedAt) {
    return { policyAmountCents: 0, policyRule: "deposit_non_refundable" };
  }

  if (!checkupDate) {
    return { policyAmountCents: 0, policyRule: "missing_checkup_date" };
  }

  const arrival = new Date(checkupDate + "T00:00:00Z");
  const diffMs = arrival.getTime() - now.getTime();
  const diffDays = diffMs / (24 * 60 * 60 * 1000);

  if (diffDays >= 7) {
    return { policyAmountCents: Math.round(amount * 0.8), policyRule: "full_refund_80" };
  }
  if (diffDays <= 1) {
    return { policyAmountCents: 0, policyRule: "no_refund_within_24h" };
  }
  return { policyAmountCents: 0, policyRule: "no_policy_match" };
}
```

**Step 4: 运行测试确认通过**

Run: `node workers/members/tests/refund-calc.test.mjs`
Expected: PASS

**Step 5: 提交**

```bash
git add workers/members/src/lib/refunds.js workers/members/tests/refund-calc.test.mjs
git commit -m "feat(refund): add policy refund calculation"
```

---

### Task 3: 新增 PayPal 退款 API 调用封装

**Files:**
- Modify: `workers/members/src/lib/paypal.js`
- Test: `workers/members/tests/paypal-refund.test.mjs`

**Step 1: 写失败测试**

```js
import assert from "node:assert/strict";
import { buildRefundPayload } from "../src/lib/paypal.js";

const payload = buildRefundPayload({ amount: 120000, currency: "USD", note: "refund" });
assert.equal(payload.amount.value, "1200.00");
assert.equal(payload.amount.currency_code, "USD");
```

**Step 2: 运行测试确认失败**

Run: `node workers/members/tests/paypal-refund.test.mjs`
Expected: FAIL（缺少导出或函数）

**Step 3: 最小实现**

```js
export function buildRefundPayload({ amount, currency, note }) {
  const payload = {};
  if (amount != null) {
    payload.amount = { currency_code: currency, value: toCurrencyValue(amount) };
  }
  if (note) {
    payload.note_to_payer = note;
  }
  return payload;
}

export async function refundPaypalCapture({ clientId, secret, captureId, amount, currency, note }) {
  const token = await getAccessToken({ clientId, secret });
  const payload = buildRefundPayload({ amount, currency, note });
  const res = await fetch(SANDBOX_BASE + "/v2/payments/captures/" + captureId + "/refund", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    body: Object.keys(payload).length ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("paypal_refund_error:" + res.status + ":" + text);
  }
  return res.json();
}
```

**Step 4: 运行测试确认通过**

Run: `node workers/members/tests/paypal-refund.test.mjs`
Expected: PASS

**Step 5: 提交**

```bash
git add workers/members/src/lib/paypal.js workers/members/tests/paypal-refund.test.mjs
git commit -m "feat(paypal): add refund capture API"
```

---

### Task 4: 管理端触发退款（含自动计算 + 可调整）

**Files:**
- Modify: `workers/members/src/routes/admin.js`
- Modify: `workers/members/src/lib/orders.js`
- Test: `workers/members/tests/admin-refund-initiate.test.mjs`

**Step 1: 写失败测试**

```js
import assert from "node:assert/strict";
import { handleAdmin } from "../src/routes/admin.js";

// 伪造 PATCH /api/admin/refund-requests/:id status=initiated
// 期望：调用退款并将订单状态改为 refund_pending_webhook
```

**Step 2: 运行测试确认失败**

Run: `node workers/members/tests/admin-refund-initiate.test.mjs`
Expected: FAIL（不支持 initiated）

**Step 3: 最小实现**

- 在 `admin.js` 允许 `status` 新值：`initiated`
- 读取订单 + 订单资料（含 `checkup_date`）
- 调用 `calculateRefundCents` 得到 `policy_amount_cents`
- 若请求包含 `approved_amount_cents`，用于管理员微调
- 调用 `refundPaypalCapture` 并保存 `provider_refund_id`
- 更新 `refund_requests` 与订单状态：`refund_pending_webhook`

**关键片段示例**

```js
if (status === "initiated") {
  const order = await findOrderById(db, existing.order_id);
  const profile = await findOrderProfileByOrderId(db, order.id);
  const { policyAmountCents } = calculateRefundCents({
    order,
    checkupDate: profile?.checkup_date || null,
    appointmentConfirmedAt: order.appointment_confirmed_at || null,
  });
  const approvedAmount = Number(body?.approved_amount_cents ?? policyAmountCents);
  const refund = await refundPaypalCapture({
    clientId: env.PAYPAL_CLIENT_ID,
    secret: env.PAYPAL_SECRET,
    captureId: order.paypal_capture_id,
    amount: approvedAmount,
    currency: order.currency,
    note: "refund",
  });
  await db
    .prepare("UPDATE refund_requests SET status = ?, approved_amount_cents = ?, policy_amount_cents = ?, currency = ?, provider = ?, provider_capture_id = ?, provider_refund_id = ?, updated_at = ? WHERE id = ?")
    .bind("initiated", approvedAmount, policyAmountCents, order.currency, "paypal", order.paypal_capture_id, refund.id, now, refundId)
    .run();
  await updateOrderStatus(db, order.id, "refund_pending_webhook");
}
```

**Step 4: 运行测试确认通过**

Run: `node workers/members/tests/admin-refund-initiate.test.mjs`
Expected: PASS

**Step 5: 提交**

```bash
git add workers/members/src/routes/admin.js workers/members/src/lib/orders.js workers/members/tests/admin-refund-initiate.test.mjs
git commit -m "feat(refund): admin initiates PayPal refunds"
```

---

### Task 5: Webhook 回写退款状态

**Files:**
- Modify: `workers/members/src/routes/paypal.js`
- Test: `workers/members/tests/paypal-webhook-refund.test.mjs`

**Step 1: 写失败测试**

```js
import assert from "node:assert/strict";
import { handlePaypal } from "../src/routes/paypal.js";

// 模拟 PAYMENT.CAPTURE.REFUNDED 事件
// 期望：按 provider_refund_id 找到 refund_requests，并把订单状态改为 refunded
```

**Step 2: 运行测试确认失败**

Run: `node workers/members/tests/paypal-webhook-refund.test.mjs`
Expected: FAIL（事件未处理）

**Step 3: 最小实现**

- Webhook 新增 `PAYMENT.CAPTURE.REFUNDED` 分支
- 通过 `resource.id` 匹配 `refund_requests.provider_refund_id`
- 校验金额/币种一致后更新：
  - `refund_requests.status = completed`, `refunded_at = now`
  - 订单状态更新为 `refunded`

**关键片段示例**

```js
if (eventType === "PAYMENT.CAPTURE.REFUNDED") {
  const refundId = resource?.id ? String(resource.id) : "";
  if (!refundId) {
    await recordEvent("failed", customId, "missing_refund_id");
    return respond(400, { ok: false, error: "missing_refund_id" });
  }
  const refundRow = await db
    .prepare("SELECT * FROM refund_requests WHERE provider_refund_id = ?")
    .bind(refundId)
    .first();
  if (!refundRow) {
    await recordEvent("failed", refundId, "refund_not_found");
    return respond(404, { ok: false, error: "refund_not_found" });
  }
  await db
    .prepare("UPDATE refund_requests SET status = ?, refunded_at = ?, updated_at = ? WHERE id = ?")
    .bind("completed", now, now, refundRow.id)
    .run();
  await updateOrderStatus(db, refundRow.order_id, "refunded");
  await recordEvent("processed", refundRow.order_id, null);
  return respond(200, { ok: true });
}
```

**Step 4: 运行测试确认通过**

Run: `node workers/members/tests/paypal-webhook-refund.test.mjs`
Expected: PASS

**Step 5: 提交**

```bash
git add workers/members/src/routes/paypal.js workers/members/tests/paypal-webhook-refund.test.mjs
git commit -m "feat(paypal): handle refund webhook"
```

---

### Task 6: 文档与测试补充

**Files:**
- Modify: `docs/upgrade-2025-payments/manual-payment-test-cases.md`
- Modify: `docs/upgrade-2025-payments/members-api.md`
- Test: `workers/members/tests/refund-request.test.mjs`, `workers/members/tests/admin-refund-requests.test.mjs`

**Step 1: 写失败测试**

- 为退款流程测试增加 `initiated` / `refund_pending_webhook` / `refunded` 状态断言

**Step 2: 运行测试确认失败**

Run: `node workers/members/tests/refund-request.test.mjs`
Expected: FAIL

**Step 3: 最小实现**

- 更新 API 文档，新增 `initiated` 状态与退款自动化说明
- 更新手工测试用例增加退款自动化验证步骤

**Step 4: 运行测试确认通过**

Run: `node workers/members/tests/refund-request.test.mjs`
Expected: PASS

**Step 5: 提交**

```bash
git add docs/upgrade-2025-payments/manual-payment-test-cases.md docs/upgrade-2025-payments/members-api.md workers/members/tests/refund-request.test.mjs workers/members/tests/admin-refund-requests.test.mjs
git commit -m "docs(refund): document automation flow and tests"
```

---

## 验证步骤（全量）

```bash
node workers/members/tests/schema.test.mjs
node workers/members/tests/refund-calc.test.mjs
node workers/members/tests/paypal-refund.test.mjs
node workers/members/tests/admin-refund-initiate.test.mjs
node workers/members/tests/paypal-webhook-refund.test.mjs
node workers/members/tests/refund-request.test.mjs
node workers/members/tests/admin-refund-requests.test.mjs
```

---

## 风险与注意事项
- PayPal 退款是异步回写，存在短暂状态不一致。
- Webhook 未送达时需支持超时标记与人工重试。
- 退款金额必须与政策与管理员调整一致，否则拒绝回写。
