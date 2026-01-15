# Task Plan: Investigate admin UI routing for preview/admin domains

## Goal
Fix payment/profile flow so paid orders with completed profiles upgrade correctly and profile save does not mislead users into paying again.

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm environment and reported URLs
- [x] Review routing and admin pages in new-cmt
- [x] Review relevant deployment/docs for admin domain
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Analysis
- [x] Identify expected admin host/path mapping
- [x] Compare preview vs admin domain behavior
- [x] Draft recommended URL(s) and fixes
- **Status:** complete

### Phase 3: Delivery
- [x] Summarize findings and actionable steps
- **Status:** complete

### Phase 1: Investigation
- [x] Trace webhook status update path
- [x] Trace profile save redirect path
- **Status:** complete

### Phase 2: Test Design
- [x] Add webhook test for paid vs paid_pending_profile
- [x] Add profile redirect test for paid orders
- **Status:** complete

### Phase 3: Implementation
- [x] Update PayPal webhook to set paid when profile complete
- [x] Update profile save redirect to avoid repeated payment
- **Status:** complete

### Phase 4: Verification & Merge
- [x] Run targeted tests (workers + new-cmt)
- [ ] Run full test suite (if required)
- [x] Merge and push
- **Status:** complete

## Errors Encountered
| Error | Attempt | Resolution |
| --- | --- | --- |
| `paymentProfileGate.test.tsx` expected "Pay $800" but got "Pay $0 USD" after merge on main | 1 | Added waitFor around pay button assertions in paymentProfileGate tests (worktree) |

## Key Questions
1. Which repo serves admin UI (new-cmt vs separate app)?
2. Is /admin route configured in new-cmt routing?
3. Is admin.chinamedicaltour.org pointing at a different frontend?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use planning files | Multi-step investigation |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |
