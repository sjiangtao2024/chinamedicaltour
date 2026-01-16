# Findings & Decisions

## Requirements
<!-- Captured from user request -->
-

## Research Findings
<!-- Key discoveries during exploration -->
-

## Technical Decisions
<!-- Decisions made with rationale -->
| Decision | Rationale |
|----------|-----------|
|          |           |

## Issues Encountered
<!-- Errors and how they were resolved -->
| Issue | Resolution |
|-------|------------|
|       |            |

## Resources
<!-- URLs, file paths, API references -->
-

## Visual/Browser Findings
<!-- CRITICAL: Update after every 2 view/browser operations -->
<!-- Multimodal content must be captured as text immediately -->
-

---
*Update this file after every 2 view/browser/search operations*
*This prevents visual information from being lost*
## 2026-01-16
- Existing Resend integration at workers/members/src/lib/email.js with sendVerificationEmail (POST https://api.resend.com/emails).
- Auth routes use env.RESEND_API_KEY and env.VERIFY_FROM_EMAIL (fallback env.FROM_EMAIL).
- No current order confirmation email implementation found.
- Order email will use new env vars ORDER_FROM_EMAIL, MAIL_FROM_NAME, MEMBER_PORTAL_URL, SUPPORT_EMAIL; idempotency stored in webhook_events with event_id prefix order_email:.
