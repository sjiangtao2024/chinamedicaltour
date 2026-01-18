# Task Plan

## Goal
- Make INTELLECTUAL non-refundable only for pre-consultation orders.
- Keep other packages refundable per existing policy.
- Update pre-consultation copy to "3 free revisions" and sync order page.

## Phases
- [x] Phase 1: Tests (TDD) for refund policy behavior
- [x] Phase 2: Backend implementation
- [x] Phase 3: Frontend copy updates
- [ ] Phase 4: Verify + merge/push

## Decisions
- INTELLECTUAL policy applies non-refundable only when `item_id === "pre-consultation"`.
- Other INTELLECTUAL (if any) should follow STANDARD schedule.

## Errors Encountered
| Error | Attempt | Resolution |
| --- | --- | --- |

## Notes
- Use TDD before backend logic change.
- Use frontend-design skill for UI copy changes.
