# Task Plan: Send order confirmation email after payment

## Goal
Send an order confirmation email via Resend after payment capture, with configurable sender name/address and no-reply notice.

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm email sender name/address and no-reply note
- [x] Identify existing Resend integration and env vars
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Define trigger point and idempotency strategy
- [x] Decide env vars and template structure
- [ ] Document decisions with rationale
- [x] Document decisions with rationale
- **Status:** complete

### Phase 3: Implementation
- [x] Add failing tests for order email send
- [x] Implement order email sender and webhook trigger
- [x] Add idempotency guard
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Run targeted workers tests
- [x] Document test results in progress.md
- [x] Fix any issues found
- **Status:** complete

### Phase 5: Delivery
- [ ] Review all output files
- [ ] Ensure deliverables are complete
- [ ] Deliver to user
- **Status:** pending

## Key Questions
1. Where should idempotency be stored for order emails?
2. Should we use ORDER_FROM_EMAIL and MAIL_FROM_NAME env vars?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Store order-email idempotency in webhook_events with event_id `order_email:<orderId>` | Reuse existing table, avoid new schema for simple dedupe |
| Add env vars ORDER_FROM_EMAIL, MAIL_FROM_NAME, MEMBER_PORTAL_URL, SUPPORT_EMAIL | Keep branding and links configurable |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

## Notes
- Update phase status as you progress: pending → in_progress → complete
- Re-read this plan before major decisions (attention manipulation)
- Log ALL errors - they help avoid repetition
