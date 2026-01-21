# Findings & Decisions

## Active Task: Smart-CS Knowledge + Order Support

### Requirements
- Generate documentation first, then implement in steps.
- Goals: update terms/policy knowledge coverage; enable order query/refund/FAQ.
- Avoid out-of-scope answers for these topics.

### Research Findings
- `workers/smart-cs` uses RAG from Vectorize; when no chunks are returned, it falls back to system prompt (no hard refusal).
- System prompt allows general knowledge and only soft refusal if RAG is missing for business facts.
- `workers/ops` provides an admin UI and API to upload markdown knowledge and rebuild the vector index.
- `workers/smart-cs/knowledge/knowledge.md` currently has services, visa, payments, and general FAQ, but no explicit terms/policy or order/refund flows.
- `docs/work/legal/terms-update-checklist.md` documents the official terms update flow (front-end terms constants + D1 `service_products.terms_version` alignment), useful for policy scope and versioning references.
- `docs/dev/upgrade-2025-payments/members-api.md` lists members worker endpoints, including `/api/orders/:id` and `/api/orders/:id/refund-request` (JWT required).
- `workers/members/src/routes/orders.js` contains order and refund-request routes, confirming members worker handles these APIs.
- `docs/work/smart-cs/` already contains `longcat-api-guide.md` and `smart-cs-features-and-guide.md`, but no terms/policy + order support scope document.
- Smart CS frontend entry is `new-cmt/src/components/chat/SmartChatPanel.tsx`, posting to `VITE_SMART_CS_API_URL` or default `https://api.chinamedicaltour.org/api/chat` with no Authorization header.
- Member JWT is stored in `sessionStorage` under `member_session_token` (e.g., `new-cmt/src/pages/Auth.tsx`) and used for members API calls elsewhere.
- `new-cmt/src/pages/Auth.tsx` uses `https://members.chinamedicaltour.org` as API base, indicating direct calls to members domain are standard.
- Members worker only serves API routes; `workers/members/src/index.js` returns JSON 404 for non-matching paths (no root UI), so visiting `https://members.chinamedicaltour.org/` in a browser yields a 404 response even if the worker is deployed.
- Smart CS now uses a read-only order lookup flow: extracts order ID from user text, calls members API, and returns a summary plus Member Center link for actions.
- Refund policy summary for customer-facing templates is documented in `docs/work/payments/COMPLIANCE_AND_PAYMENT_GUIDE.md` (deposit non-refundable after appointment confirmed; full payment 80% refund if cancelled 7 days prior; no refund within 24 hours).

### Technical Decisions
| Decision | Rationale |
|----------|-----------|
|          |           |

### Resources
- `workers/smart-cs/src/index.js`
- `workers/smart-cs/src/lib/knowledge-base.js`
- `workers/smart-cs/src/lib/rag-runtime.js`
- `workers/smart-cs/knowledge/knowledge.md`
- `workers/ops/src/index.js`

### Visual/Browser Findings
- N/A

---

## Requirements
- Optimize SEO for new-cmt with English focus.
- Use canonical domain: https://chinamedicaltour.org.
- Indexable pages: /, /health-screening, /specialized-care, /tcm-wellness, /concierge-services, /stories, /about, /contact.
- Secondary indexable: /how-to-pay, /savings-calculator.
- Noindex: /auth, /payment, /privacy, /terms.

## Research Findings
- Routes are defined in `new-cmt/src/App.tsx` for English and language-prefixed paths.
- There is no existing head management library (no react-helmet).
- `public/robots.txt` exists but has no sitemap reference.
- `index.html` contains default meta tags.
- Added react-helmet-async with a centralized Seo component in this implementation batch.

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
| Add react-helmet-async + Seo component | Centralized page metadata management |
| Add JSON-LD for Organization/Service/FAQ | Rich result eligibility |
| Add sitemap.xml + update robots.txt | Ensure crawl coverage |
| Use favicon as default OG image | Existing asset, avoids new design work |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
| HelmetDispatcher init error in tests | Wrapped affected tests with HelmetProvider |

## Resources
- `new-cmt/src/App.tsx`
- `new-cmt/public/robots.txt`
- `new-cmt/index.html`
- `docs/plans/2026-01-19-new-cmt-seo-implementation-plan.md`

## Visual/Browser Findings
- N/A

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*

---

## Active Task: Admin Dashboard Stats (Members + Smart-CS)

### Requirements
- Admin UI should show member registration count and basic member info from members D1.
- Admin UI should show smart-cs daily summary (daily customers, summary text, and purchase intent signals).
- Smart-cs daily summary source likely exists via prior interface/logs; needs confirmation.

### Research Findings
- `workers/smart-cs/src/index.js` exposes admin endpoints:
  - `GET /admin/exports` (HTML form) and `GET /admin/export.csv` (CSV) guarded by `ADMIN_TOKEN`.
  - Export query reads `chat_logs` fields: `request_id`, `user_text`, `assistant_summary`, `rating`, `page_url`, `page_context`, `created_at`.
- `workers/smart-cs/migrations/0002_add_chat_log_fields.sql` added `assistant_summary`, `rating`, `page_url`, `page_context` to `chat_logs`.
- `docs/work/ops/ops-knowledge-guide.zh.md` documents how to export smart-cs logs from D1 via wrangler and lists the same chat log fields.
- Admin dashboard page is `new-cmt/src/pages/admin/AdminDashboard.tsx` (currently only navigation cards).
- Members admin API currently supports orders/payments/coupons only; no member listing/count endpoint found in `workers/members/src/routes/admin.js`.
- Smart-cs `chat_logs` schema does not store user identifiers; “daily customers” will need a proxy metric (e.g., daily chat count) or a schema change.

### Decisions
| Decision | Rationale |
|----------|-----------|
| Members data from D1 via members worker | User confirmed availability and best practice expectation |

### Open Questions
- Which fields count as “basic info” for members (name/email/phone/status/created_at)?
- What is the “daily” boundary and timezone for smart-cs summaries?
- Where is the smart-cs daily summary API/log implemented?
