# Task Plan: Debug terms_version_mismatch on /api/agreements

## Goal
Identify root cause of `terms_version_mismatch` from /api/agreements during payment setup and provide fix/next steps.

## Current Phase
Phase 1

## Phases

### Phase 1: Root Cause Investigation
- [x] Collect exact repro steps and payload/response
- [x] Locate server-side validation logic for agreements/terms
- [x] Trace data flow for terms_version/terms_doc_id from UI to API
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Pattern Analysis
- [x] Find working path or expected terms version source
- [x] Compare preview vs prod config and routes
- [x] Document differences
- **Status:** complete

### Phase 3: Hypothesis & Minimal Test
- [x] Form a single root-cause hypothesis
- [x] Propose smallest verification step (no code change yet)
- **Status:** complete

### Phase 4: Implementation
- [x] If needed, create failing test or targeted change
- [x] Verify fix
- **Status:** complete

### Phase 5: Delivery
- [x] Summarize root cause and next steps
- **Status:** complete

## Key Questions
1. Where is terms_version validated on the server?
2. What is the canonical terms version for preview?
3. Is UI sending a version/ID that backend rejects (mismatch or stale)?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Use systematic debugging | Prevent guesses; require root-cause evidence |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| npm install timed out (worktree setup) | 1 | Re-ran with longer timeout |
| npm test timed out (vitest watch mode) | 1 | Noted; need to re-run with run/--watch=false |
| npx vitest run failed (2 failing tests) | 1 | Pending user decision |

## Notes
- Update phase status as you progress: pending → in_progress → complete
- Re-read this plan before major decisions
- Log ALL errors to avoid repetition
