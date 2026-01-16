# Findings: PayPal capture & order id persistence

## Target Areas
- PayPal order creation/capture flow in `workers/members/src/routes/paypal.js`
- Order update helpers in `workers/members/src/lib/orders.js`

## Notes
- `updateOrderPayment` always writes `paypal_order_id = updates.paypalOrderId || null`, so webhook updates that omit `paypalOrderId` can erase existing values.
- `/api/paypal/capture` sets `status: "paid"` without checking capture status or amount; webhook path performs amount/currency validation and sets paid vs paid_pending_profile.
- `CHECKOUT.ORDER.APPROVED` webhook sets `paypal_order_id`, but `PAYMENT.CAPTURE.COMPLETED` overwrites it if `paypalOrderId` is omitted.

## Planned Fix
- Preserve paypal_order_id/capture_id via SQL `COALESCE` in `updateOrderPayment`.
- In `/api/paypal/capture`, require capture completion and set status to `awaiting_capture` (webhook remains source of truth for paid).
