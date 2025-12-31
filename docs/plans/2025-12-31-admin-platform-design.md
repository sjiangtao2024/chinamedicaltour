# Admin Platform Design (Members)

## Summary
Build an admin management platform as protected routes inside the existing `new-cmt` front-end, served at `admin.chinamedicaltour.org`, backed by members worker APIs under `/api/admin/*`. Admin access is controlled by a new `admin_users` table and role checks in the members worker.

## Architecture
- **Front-end**: `new-cmt` (same deployment as preview). New routes under `/admin`, `/admin/orders`, `/admin/orders/:id`, `/admin/payments`, `/admin/coupons`.
- **Domain**: `admin.chinamedicaltour.org` mapped to `new-cmt` Pages project (additional custom domain).
- **API**: `https://members.chinamedicaltour.org/api/...`.
- **Auth**: reuse existing login; admin role check via `admin_users` table.

## Data Model
- **admin_users** table
  - `id` (uuid)
  - `user_id` (uuid)
  - `role` (text, e.g. `admin`)
  - `created_at` (timestamp)

## Permissions
- Add `GET /api/admin/me` to validate admin access.
- All `/api/admin/*` endpoints require admin check:
  - parse JWT, load `user_id`, verify `admin_users` record.
  - return 403 on missing admin access.

## Features
### Pages
1. `/admin` - dashboard summary
2. `/admin/orders` - order list + filters
3. `/admin/orders/:id` - order details + status update
4. `/admin/payments` - payment reconciliation view
5. `/admin/coupons` - coupon list + creation form

### APIs (members worker)
- `GET /api/admin/me`
- `GET /api/admin/orders` (filters: `status`, `from`, `to`, `user_id`)
- `GET /api/admin/orders/:id`
- `PATCH /api/admin/orders/:id` (update status)
- `GET /api/admin/payments?from&to`:
  - returns system orders + PayPal transactions + reconciliation summary
- `GET /api/admin/coupons`
- `POST /api/admin/coupons` (requires `issuer_name`, `issuer_contact`)

## Reconciliation (PayPal + Orders)
- Match by `paypal_capture_id` or `paypal_order_id`.
- Output categories:
  - `matched`
  - `order_missing_paypal`
  - `paypal_missing_order`

## Coupons (Marketing Attribution)
- Store issuer attribution on coupons:
  - `issuer_name` (marketing partner or influencer)
  - `issuer_contact` (email/phone/social handle, free text)
- Admin UI supports manual code input plus one-click code generation.

## MVP Scope
1. Admin auth (`admin_users` + `/api/admin/me`)
2. Orders list + detail + status update
3. Payments reconciliation view (basic)
4. Coupon creation + list (issuer attribution)

## Deferred
- Advanced role levels (beyond admin)
- Audit logging
- Refund/chargeback workflows

## Deployment Notes
- Add `admin.chinamedicaltour.org` as a custom domain to the `new-cmt` Pages project.
- No changes required to members worker domains; only API routes change.

## Next Steps
- Implement admin APIs in members worker.
- Add admin routes/pages in `new-cmt`.
- Wire permissions and basic UI.
