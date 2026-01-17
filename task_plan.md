# Task Plan: Add Admin Refund Execution Flow

## Goal
Enable admins to execute refunds from the order details page after approval, with refund estimate display and confirmation.

## Current Phase
Completed

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent
- [x] Identify constraints and requirements
- [x] Document findings in findings.md
- **Status:** completed

### Phase 2: Planning & Structure
- [x] Define technical approach
- [x] Identify API/UI changes and data flow
- [x] Document decisions with rationale
- **Status:** completed

### Phase 3: Implementation
- [x] Add admin refund estimate API
- [x] Add UI in admin order details (hidden unless approved)
- [x] Add confirmation dialog + amount input
- [x] Update tests (TDD)
- **Status:** completed

### Phase 4: Testing & Verification
- [x] Run targeted tests for backend and frontend
- [x] Document results in progress.md
- [x] Fix any issues found
- **Status:** completed

### Phase 5: Delivery
- [x] Review touched files
- [x] Summarize changes + next steps
- **Status:** completed

## Key Questions
1. Should refund amount default to refund-estimate and be editable? (Yes; manual edit allowed)
2. Should refund execute only when status is refund_approved? (Yes)

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Add admin refund-estimate endpoint | Frontend needs authoritative refund ratio/amount |
| Show refund button only after approval | Matches admin workflow and reduces risk |
| Require confirmation dialog | Prevent accidental refunds |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| Worktree add failed (branch exists) | 1 | Reused existing branch for worktree |
| Merge main blocked by uncommitted plan files | 1 | Skipped merge and continued in branch |

## Notes
- Keep refund execution separate from approval (workflow choice A).
