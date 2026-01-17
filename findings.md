# Findings

## Backend Behavior
- `PATCH /api/admin/refund-requests/:id` only updates refund request + order status; it does not trigger PayPal refunds.
- `POST /api/admin/orders/:id/refund` is the only path that executes PayPal refunds and updates `payment_refunds` + order status.
- Refund eligibility/amount is computed via `calculateRefund` in `workers/members/src/lib/refunds.js`.

## Frontend Behavior
- Admin refund UI only supports Approve/Reject in `new-cmt/src/pages/admin/AdminOrders.tsx`.
- Admin order details page has no refund execution UI.

## Root Cause (from user report)
- Approval updates status to `refund_approved` but no refund is executed because there is no UI/logic to call the refund endpoint.
- Added admin refund estimate endpoint at `GET /api/admin/orders/:id/refund-estimate` (returns remaining refundable amount after existing refunds).
- Admin order details page now requires refund execution action post-approval.
