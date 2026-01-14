# Terms Consent Tracking (2026-01-14)

## Summary
- Updated Terms of Service page to January 2026 and added a fixed version identifier.
- Aligned payment-related copy with the updated terms.
- Added agreement capture flow on the payment page with a dedicated API request.

## Frontend Changes
- Terms constants: `src/lib/terms.ts`
  - `TERMS_VERSION = 2026-01`
  - `TERMS_LAST_UPDATED = January 2026`
  - `TERMS_DOC_ID = terms-2026-01`
- Terms page displays version and last updated.
- Payment flow now posts a separate agreement record before initiating payment.

## New Agreement API (proposed)
Endpoint:
- `POST /api/agreements`
- `GET /api/agreements?order_id=<order_id>`

Payload:
```json
{
  "order_id": "ord_123",
  "terms_version": "2026-01",
  "terms_doc_id": "terms-2026-01",
  "accepted_at": "2026-01-14T12:34:56.000Z",
  "digital_accepted_at": "2026-01-14T12:34:56.000Z",
  "methods_accepted_at": "2026-01-14T12:34:56.000Z",
  "user_agent": "Mozilla/5.0 ...",
  "time_zone": "America/Los_Angeles"
}
```

Server-side requirements:
- Record IP address on the server (do not trust client).
- Store user_id from auth token.
- Persist as append-only audit log.
- Deduplicate by (order_id, terms_version) or enforce a unique constraint to avoid duplicates.

## Suggested DB Fields
- `id`, `user_id`, `order_id`
- `terms_version`, `terms_doc_id`
- `accepted_at`, `digital_accepted_at`, `methods_accepted_at`
- `user_agent`, `ip_address`, `time_zone`
- `created_at`

## Verification Checklist
- Payment page shows the Terms version (e.g., `v2026-01`).
- All agreement checkboxes must be accepted before payment.
- `POST /api/agreements` succeeds after order creation.
- `agreement_acceptances` contains a new record with order + terms version.
- Order details page displays the terms version and acceptance timestamp.
- PayPal redirect works after agreements are recorded.
