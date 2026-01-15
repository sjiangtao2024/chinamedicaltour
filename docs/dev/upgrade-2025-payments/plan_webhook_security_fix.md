# Plan: Fix PayPal Webhook Security Vulnerabilities

## Problem Summary
The current PayPal webhook implementation (`workers/members/src/routes/paypal.js`) has two critical security vulnerabilities:
1.  **Missing Idempotency Check**: It does not track processed event IDs, making it vulnerable to replay attacks and processing duplicate events.
2.  **Missing Amount Validation**: It marks orders as "paid" without verifying that the actual paid amount matches the order amount, allowing "penny dropping" fraud.

## Proposed Changes

### 1. Database Schema Migration
Create a new migration file `workers/members/migrations/0002_create_webhook_events.sql` to add a table for tracking processed webhooks.

```sql
CREATE TABLE webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  resource_id TEXT, -- e.g., order_id or custom_id
  status TEXT NOT NULL, -- e.g., 'processed', 'failed', 'ignored'
  created_at TEXT NOT NULL
);
```

### 2. Update `workers/members/src/routes/paypal.js`

#### A. Idempotency Check Implementation
**Before:**
```javascript
// No check
const resource = event.resource || {};
// ... proceed to process
```

**After:**
```javascript
// Check if event already processed
const existingEvent = await db.prepare("SELECT * FROM webhook_events WHERE event_id = ?").bind(event.id).first();
if (existingEvent) {
  // Already processed, return 200 to PayPal so they stop retrying
  return respond(200, { ok: true, ignored: true });
}

// ... process event ...

// After successful processing, record the event
await db.prepare("INSERT INTO webhook_events (event_id, event_type, resource_id, status, created_at) VALUES (?, ?, ?, ?, ?)")
  .bind(event.id, event.event_type, customId || null, "processed", new Date().toISOString())
  .run();
```

#### B. Amount Validation Implementation
**Before:**
```javascript
if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
  await updateOrderPayment(db, customId, {
    paypalCaptureId: resource.id,
    status: "paid_pending_profile",
  });
}
```

**After:**
```javascript
if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
  // 1. Get the local order
  const order = await findOrderById(db, customId);
  if (!order) {
    // Log error, maybe record event as failed
    return respond(404, { ok: false, error: "order_not_found" });
  }

  // 2. Extract amount from Webhook Payload
  // Note: PayPal amount is string "100.00", our DB stores integer cents (10000)
  const paidAmountStr = resource.amount?.value || resource.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value || "0";
  const paidCurrency = resource.amount?.currency_code || resource.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.currency_code || "";

  const paidAmountCents = Math.round(parseFloat(paidAmountStr) * 100);

  // 3. Validate Amount & Currency
  if (paidCurrency !== order.currency) {
     return respond(400, { ok: false, error: "currency_mismatch" });
  }

  // Allow small floating point difference if needed, but for cents integer strict equality is best
  // But strictly: PayPal might send partial capture. We should check if paidAmount >= order.amount_paid
  if (paidAmountCents < order.amount_paid) {
     console.error(`Fraud attempt: Order ${order.id} paid ${paidAmountCents} but expected ${order.amount_paid}`);
     return respond(400, { ok: false, error: "amount_mismatch" });
  }

  // 4. Update status if valid
  await updateOrderPayment(db, customId, {
    paypalCaptureId: resource.id,
    status: "paid_pending_profile",
  });
}
```

## Verification Plan
1.  **Deploy Migration**: Run `wrangler d1 migrations apply members --local` (for local test) or remote.
2.  **Test Replay**: Send the same Webhook payload twice.
    *   Expected: First time 200 OK (Processed). Second time 200 OK (Ignored/Already processed). Database `orders` should not change state twice.
3.  **Test Fraud**: Send a Webhook with modified `amount.value` (e.g., "0.01").
    *   Expected: 400 Error (Amount mismatch). Database `orders` status should REMAIN `created` or `awaiting_payment`.
