# Task Plan: Enforce paid only after capture + store PayPal order id

## Goal
Ensure orders are marked paid only after PayPal capture is verified, and always store paypal_order_id for auditability.

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [x] Review current PayPal capture flow and where status is set to paid
- [x] Identify where paypal_order_id is dropped or not saved
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Define minimal changes for capture verification and order id persistence
- [x] Identify tests to add/update (TDD)
- [x] Record decisions
- **Status:** complete

### Phase 3: Implementation
- [x] Add failing tests for paid only after capture
- [x] Add failing tests for storing paypal_order_id
- [x] Implement minimal code to pass
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Run focused tests
- [x] Log results in progress.md
- [x] Fix regressions
- **Status:** complete

### Phase 5: Delivery
- [ ] Summarize changes with file references
- [ ] Suggest next steps (deploy members worker)
- **Status:** pending

## Key Questions
1. Where is paid status set (capture vs approve vs webhook)?
2. Which handler should be responsible for storing paypal_order_id?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use webhook as source of truth for paid (option B) | Prevents any local mislabeling; aligns with PSP best practice |
| Preserve existing paypal_order_id unless explicitly provided | Avoids accidental nulling during webhook updates |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |
