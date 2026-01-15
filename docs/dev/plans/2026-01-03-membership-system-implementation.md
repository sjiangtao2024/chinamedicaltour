# Membership System Implementation Plan (members alignment)

## Context
This document aligns the membership business model with the existing online system (`workers/members`). The current system supports registration, login, orders, coupons, PayPal payments, and profile collection. Membership lifecycle support (purchase, renew, upgrade, downgrade, refund) is not yet modeled.

## Goals
- Add membership lifecycle without rewriting the existing auth/payment flow.
- Separate membership purchases from normal package/deposit orders.
- Support annual memberships only (12 months), manual renewal.
- Upgrade immediately with proration, downgrade next-cycle, refund with audit trail.

## Non-Goals
- Redesigning the checkout flow or replacing PayPal.
- Building a full admin UI (can be added later).

## Current System Snapshot (Relevant)
- D1 tables: `users`, `auth_identities`, `orders`, `user_profiles`, `coupons`.
- Orders model: `item_type`, `item_id`, `amount_original`, `discount_amount`, `amount_paid`, `currency`, `status`.
- Payments: PayPal create/capture/webhook.

## Proposed Data Model Additions
### 1) memberships
Stores the customer’s current membership state.
- `user_id` (PK)
- `tier` (Guest/Silver/Gold/Diamond)
- `status` (active, expired, canceled)
- `start_at`, `end_at`
- `remaining_consults`
- `consult_doctor_level`
- `created_at`, `updated_at`

### 2) membership_orders
Tracks each membership purchase and refund lifecycle.
- `id` (PK)
- `user_id`
- `tier`
- `amount_original`, `discount_amount`, `amount_paid`, `currency`
- `paypal_order_id`, `paypal_capture_id`
- `status` (created, paid, refunded, canceled)
- `type` (new, renew, upgrade, downgrade_credit)
- `idempotency_key`
- `created_at`, `updated_at`

### 3) membership_events (optional)
Audit trail for upgrades, downgrades, refunds, and consult usage.

## Membership Pricing Configuration
Define a `membership_tiers` config (JSON or code):
- `annual_fee`, `service_fee_rate`, `hard_cost_discount`
- `free_consult_count`, `consult_doctor_level`
- `benefits` (green channel, concierge level, itinerary policy)

## API Additions (Minimal Set)
- `POST /api/membership/orders` create a membership order
- `POST /api/membership/capture` finalize payment and activate membership
- `GET /api/membership/status` current tier/expiry/benefits
- `POST /api/membership/upgrade` compute proration and charge difference
- `POST /api/membership/downgrade` mark next-cycle downgrade
- `POST /api/membership/refund` refund and adjust membership state

All routes should require auth and follow idempotency rules similar to `/api/orders`.

## Lifecycle Rules
- **Annual only**: 12 months validity.
- **Upgrade**: immediate effect + prorated difference charged.
- **Downgrade**: effective next cycle, no immediate refund.
- **Refund**: create a `membership_orders` refund record, set membership to canceled or expired based on policy.

### Proration (Upgrade)
- Remaining value = (remaining_days / total_days) * current_tier_fee
- Upgrade charge = new_tier_fee - remaining_value
- Minimum charge floor to avoid negative or zero charge edge cases.

## Benefits & Usage
- `remaining_consults` decremented in a transaction when a consult is used.
- If consult usage is part of order creation, lock the membership row to avoid concurrent double-spend.
- If benefit is exhausted, normal pricing applies.

## Migration Strategy
- Default all existing users to Guest (no DB change required until first membership purchase).
- No migration of existing `orders`.
- First membership purchase creates `memberships` row.

## Risk & Controls
- **Double charging**: idempotency key required for membership orders.
- **Refund disputes**: keep `membership_orders` and `membership_events` for audit.
- **Concurrency**: enforce transactional update for consult usage.

## Integration Touchpoints
- Checkout: new membership purchase page or option that routes to membership order endpoints.
- Profile: no change; membership purchase can still require profile completion if desired.

## Open Questions
- Refund policy: full vs prorated refund.
- Whether certain services should be excluded from discounts.
- Whether membership includes soft-cost discounts or only waivers/benefits.

