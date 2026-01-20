# Task Plan: Smart-CS Knowledge + Order Support Guardrails

## Goal
Publish documentation for smart-cs policy/terms knowledge updates and order support (query/refund/FAQ), then implement in controlled steps without out-of-scope answers.

## Current Phase
Phase 1

## Phases

### Phase 1: Requirements & Discovery
- [x] Confirm documentation scope and desired outputs (policies, order flows, guardrails).
- [x] Review smart-cs and ops code paths relevant to RAG, knowledge updates, and order handling.
- [x] Document findings in findings.md.
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Draft documentation (requirements, flows, guardrails, API contracts).
- [ ] Review with user and refine.
- **Status:** in_progress

### Phase 3: Implementation (Doc-Driven)
- [x] Implement policy/terms scope guardrails.
- [x] Implement order query support (read-only) with API integration.
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Add/confirm tests for guardrails and order flows.
- [ ] Document test results in progress.md.
- **Status:** in_progress

### Phase 5: Delivery
- [ ] Deliver docs and incremental implementation steps.
- [ ] Confirm acceptance criteria met.
- **Status:** pending

## Notes
- Terms/policy templates now live in `workers/smart-cs/knowledge/knowledge.md` and should be uploaded via ops to refresh the RAG index.

## Key Questions
1. Where should the documentation live (e.g., `docs/plans/`), and in which language?
2. What order system/API endpoints exist for query/refund, and how is user identity verified?

## Decisions Made
| Decision | Rationale |
|----------|-----------|
|          |           |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
|       | 1       |            |

---

# Task Plan: New-CMT SEO Optimization (EN)

## Goal
Improve English SEO for new-cmt with correct metadata, structured data, sitemap/robots, and noindex rules for non-ranking pages.

## Current Phase
Phase 5

## Phases

### Phase 1: Requirements & Discovery
- [x] Understand user intent (SEO optimization for new-cmt)
- [x] Identify constraints and requirements (EN focus, canonical domain, noindex list)
- [x] Document findings in findings.md
- **Status:** complete

### Phase 2: Planning & Structure
- [x] Define technical approach (SEO component + per-page config)
- [x] Create project structure if needed (SEO helper, schema helpers)
- [x] Document decisions with rationale
- **Status:** complete

### Phase 3: Implementation
- [x] Execute the plan step by step
- [x] Write code to files before executing
- [x] Test incrementally
- **Status:** complete

### Phase 4: Testing & Verification
- [x] Verify all requirements met
- [x] Document test results in progress.md
- [x] Fix any issues found
- **Status:** complete

### Phase 5: Delivery
- [ ] Review all output files
- [ ] Ensure deliverables are complete
- [ ] Deliver to user
- **Status:** in_progress

## Key Questions
1. Canonical domain? (answered: https://chinamedicaltour.org)
2. Which pages should be noindex? (answered: auth/payment/privacy/terms)

## Decisions Made
| Decision | Rationale |
|----------|-----------|
| Focus on EN-only SEO first | Matches user request and reduces scope |
| Canonical base set to https://chinamedicaltour.org | User-provided canonical domain |
| Noindex auth/payment/privacy/terms | Avoid indexing transactional/legal pages |
| SEO component + config map | Ensures consistent metadata and easy updates |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| HelmetDispatcher init failure in tests | 1 | Wrapped affected page tests with HelmetProvider |

## Notes
- Update phase status as you progress: pending → in_progress → complete
- Re-read this plan before major decisions (attention manipulation)
- Log ALL errors - they help avoid repetition
