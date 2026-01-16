# Task Plan: Add service status to paid orders (admin + user)

## Goal
Expose a user-facing service status after payment, editable by admins, with API support and minimal UI updates in admin and user order pages.

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm service status values/labels and where to show (admin list/detail, user list/detail)
- [ ] Identify API endpoints to extend (admin orders patch, user orders list/detail)
- [ ] Identify DB migration needs in workers/members
**Status:** complete

### Phase 2: Test Design (TDD)
- [x] Add failing backend tests for service_status persistence/response
- [x] Add failing frontend tests for service_status rendering and admin update
- **Status:** complete

### Phase 3: Implementation
- [x] Add `service_status` column + migration
- [x] Wire backend update + response fields
- [x] Update admin UI to edit service status
- [x] Update user UI to display service status
- **Status:** complete

### Phase 4: Verification & Merge
- [x] Run targeted workers tests
- [x] Run targeted new-cmt tests
- [ ] Merge + push both repos
- **Status:** in_progress

## Errors Encountered
| Error | Attempt | Resolution |
| --- | --- | --- |
| | 1 | |

## Decisions Made
| Decision | Rationale |
| --- | --- |
| Use planning files | Multi-step feature touching backend + frontend |
