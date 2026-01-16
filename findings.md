# Findings & Decisions

## Requirements
- Investigate admin UI routing and preview/admin domain behavior.

## Research Findings
- 

## Technical Decisions
| Decision | Rationale |
|----------|-----------|
|          |           |

## Issues Encountered
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
- 

## Visual/Browser Findings
- 

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*

## Research Findings
- new-cmt App routing only defines /admin/library; other admin routes are not registered in App.tsx.
- new-cmt has multiple admin pages (AdminDashboard/AdminOrders/AdminPayments/AdminCoupons/AdminOrderDetails) that link to /admin/* paths.
- Auth page defines ADMIN_HOST = admin.chinamedicaltour.org and redirects admin logins to /admin.

## Resources
- new-cmt/src/App.tsx
- new-cmt/src/pages/Auth.tsx
- new-cmt/src/pages/admin/AdminDashboard.tsx
- new-cmt/src/pages/admin/AdminOrders.tsx
- new-cmt/src/pages/admin/AdminPayments.tsx
- new-cmt/src/pages/admin/AdminCoupons.tsx

## Research Findings
- Auth login redirects admin host (admin.chinamedicaltour.org) to /admin after login.
- new-cmt App.tsx only registers /admin/library; no /admin, /admin/orders, /admin/payments, or /admin/coupons routes.

## Resources
- new-cmt/src/pages/Auth.tsx
- new-cmt/src/App.tsx

## Research Findings
- Docs state admin UI should live at admin.chinamedicaltour.org and expose /admin, /admin/orders, /admin/payments, /admin/coupons routes in new-cmt.
- ops doc instructs login via https://admin.chinamedicaltour.org/auth and use /admin/coupons.
- Backend allows admin origin in members worker (ALLOWED_ORIGINS includes admin.chinamedicaltour.org).

## Resources
- docs/work/ops/admin-coupons-ops.md
- docs/dev/plans/2025-12-31-admin-platform-design.md
- workers/members/src/lib/request.js
- workers/members/wrangler.jsonc

## Research Findings
- Worktree protocol requires ai identity + module selection, and worktree isolation for new-cmt changes.
- new-cmt routing lives in new-cmt/src/App.tsx; admin pages are under new-cmt/src/pages/admin/.

## Resources
- docs/agent-rules/ai-worktrees-protocol.md
- docs/agent-rules/project-architecture.md

## Research Findings
- Python scripts must use uv + .venv; prefer `uv run` and avoid global installs.
- Planning files must be updated per phase/findings/errors; new docs go under `docs/` with roadmap updates.

## Resources
- docs/agent-rules/python-script-rules.md
- docs/agent-rules/ai-planning-and-documentation.md

## Research Findings
- Roadmap doc lists admin ops doc and payments/terms docs; confirms terms consent doc in docs/work/legal/2026-01-14-terms-consent.md.

## Research Findings
- new-cmt App routes only define `/admin/library`; no `/admin` or other admin paths.
- Auth page redirects admin hostname logins to `/admin`, implying route should exist on admin domain.

## Research Findings
- Admin ops doc expects login at `https://admin.chinamedicaltour.org/auth` and coupons at `/admin/coupons`.
- Admin platform design specifies admin routes under new-cmt served via `admin.chinamedicaltour.org`, including `/admin`, `/admin/orders`, `/admin/payments`, `/admin/coupons`.

## Resources
- docs/work/ops/admin-coupons-ops.md
- docs/dev/plans/2025-12-31-admin-platform-design.md

## Research Findings
- `paymentProfileGate.test.tsx` failed only in full suite on `main` but passes when run alone, indicating a timing/flakiness issue.
- Failure showed "Pay $0 USD" instead of "Pay $800", consistent with `Payment` rendering before `/api/packages` load updates `orderSummary.total`.
- `Payment` sets `orderSummary.total` from `selectedPackage.priceCents`, which defaults to 0 until packages fetch resolves.

## Resources
- new-cmt/src/__tests__/paymentProfileGate.test.tsx
- new-cmt/src/pages/Payment.tsx

## Research Findings
- PayPal webhook (`/api/paypal/webhook`) sets status to `paid_pending_profile` unconditionally on `PAYMENT.CAPTURE.COMPLETED`.
- Orders only upgrade from `paid_pending_profile` to `paid` when `/api/profile` POST completes and profile is complete.
- Profile page always redirects to `/payment` after save, regardless of order status.

## Resources
- workers/members/src/routes/paypal.js
- workers/members/src/routes/profile.js
- new-cmt/src/pages/Profile.tsx

## Resources
- new-cmt/src/App.tsx
- new-cmt/src/pages/Auth.tsx

## Resources
- docs/work/roadmap/roadmap-cs.md
## 2025-01-16
- task_plan.md currently references prior admin routing/payment work; needs reset for service_status feature.
- ai-worktrees-protocol: must use ai-a worktrees; run git worktree list + git branch --no-merged main in root and new-cmt before coding.
- project-architecture: new-cmt is separate repo; admin pages in new-cmt/src/pages/admin; workers/members handles orders.
- python-script-rules: use uv + .venv for Python, uv run only.
- ai-planning: must keep task_plan/findings/progress updated; new docs in docs/.
- roadmap: reference doc index; no specific constraints beyond doc placement.
