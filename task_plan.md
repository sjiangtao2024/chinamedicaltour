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
