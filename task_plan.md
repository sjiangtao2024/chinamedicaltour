# Task Plan

## Goal
- Update refund policies and UI/UX for pre-consultation, enforce required dates, and adjust admin refund UI guidance across backend (members) and frontend (new-cmt).

## Phases
- [x] Phase 1: Baseline + scope confirmation
- [x] Phase 2: Backend TDD changes (members worker)
- [x] Phase 3: Frontend updates (new-cmt)
- [ ] Phase 4: Verification, merge, deploy coordination

## Decisions
- Use existing worktrees for `ai-a` in both repos.
- Enforce `checkup_date` required across profile endpoints and UI.
- Pre-consultation is non-refundable after payment; add one free revision note.

## Errors Encountered
| Error | Attempt | Resolution |
| --- | --- | --- |

## Notes
- Follow TDD for backend changes.
- Use frontend-design skill for any UI copy/layout changes.
