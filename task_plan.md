# Task Plan: Coupon package scope selection

## Goal
Allow coupons to apply to selected packages (multi-select), defaulting to all, using package data from database.

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm scope behavior (default all, package-only)
- [x] Identify data source for packages (/api/packages -> service_products)
- [x] Identify existing coupon schema and usage
- **Status:** complete

### Phase 2: Test Design (TDD)
- [x] Add failing backend tests for coupon scope applicability
- [x] Add failing frontend tests for coupon package selection UI
- **Status:** complete

### Phase 3: Implementation
- [x] Parse coupon scope (JSON list) and enforce in resolveCoupon
- [x] Update orders flow to pass item info to resolveCoupon
- [x] Update admin coupons UI to load packages and multi-select
- [x] Persist scope in create coupon payload
- **Status:** complete

### Phase 4: Verification & Merge
- [x] Run targeted workers tests
- [x] Run targeted new-cmt tests
- [ ] Merge + push
- **Status:** in_progress

## Decisions Made
| Decision | Rationale |
| --- | --- |
| Store package scope in coupons.scope as JSON array of item_ids; null = all | Minimal schema change, keeps default all |

## Errors Encountered
| Error | Attempt | Resolution |
| --- | --- | --- |
| | 1 | |
