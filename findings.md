# Findings & Decisions

## Requirements
- Debug `terms_version_mismatch` from `POST /api/agreements` during payment setup.
- Identify backend validation and the expected terms version.

## Research Findings
- User reports error: `Payment setup failed: terms_version_mismatch`.
- Failing endpoint: `https://members.chinamedicaltour.org/api/agreements` (HTTP 400).
- Payload includes `terms_version: "2026-01"` and `terms_doc_id: "terms-2026-01"`.
- Error is emitted in `workers/members/src/routes/agreements.js` and also in `workers/members/src/routes/orders.js`.
- Agreements handler is implemented in `workers/members/src/routes/agreements.js` and wired in `workers/members/src/index.js`.
- /api/agreements rejects when order.terms_version exists and differs from body.terms_version.
- /api/orders rejects when service_product.terms_version exists and differs from input.termsVersion.
- Payment page (new-cmt) creates order with payload containing duplicate `terms_version` keys; later value will overwrite earlier in JSON.stringify.
- Payment page sends agreement with `terms_version: TERMS_VERSION` and `terms_doc_id: TERMS_DOC_ID`, so mismatch can occur if order saved with a different terms_version.
- TERMS_VERSION and TERMS_DOC_ID constants are defined in `new-cmt/src/lib/terms.ts` as `2026-01` and `terms-2026-01`.
- Payment page defines `REFUND_POLICY_VERSION = "2026-01-14"` and uses it in the order payload (duplicate key), which can overwrite `TERMS_VERSION`.
- /api/orders derives input.termsVersion from request body and requires it; this value is written to orders.terms_version.
- normalizeOrderInput maps request `terms_version` directly into termsVersion with no separate refund policy field.
- service_products.terms_version is seeded as "2026-01-14" in migrations, indicating backend expects that value for orders.
- Repro evidence: order.terms_version persisted as "2026-01-14" while agreement payload uses "2026-01", triggering /api/agreements mismatch.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Use systematic debugging | Root cause must be identified before proposing fixes |
| Align agreement terms_version to order terms_version | Backend enforces equality between order.terms_version and agreement terms_version |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
- workers/members/src/routes/agreements.js
- workers/members/src/routes/orders.js
- workers/members/src/index.js
- new-cmt/src/pages/Payment.tsx
- new-cmt/src/lib/terms.ts
- workers/members/migrations/0010_add_refund_policy_fields.sql

## Visual/Browser Findings
- 

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
