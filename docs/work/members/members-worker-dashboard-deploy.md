# Members Worker Dashboard Deploy Guide

This guide documents the Cloudflare Dashboard steps for the `members` worker,
including PayPal Sandbox return/cancel URLs used during preview testing.

## When to Use

- You manage the `members` worker via Cloudflare Dashboard.
- You need to change environment variables without forgetting the steps.

## Update PayPal Return/Cancel URLs (Preview)

Recommended URLs for preview testing:

- Return URL: `https://preview.chinamedicaltour.org/payment?paypal=return`
- Cancel URL: `https://preview.chinamedicaltour.org/payment?paypal=cancel`

## Dashboard Steps

1. Cloudflare Dashboard → **Workers & Pages** → select `members`.
2. Go to **Settings** → **Variables**.
3. Update:
   - `PAYPAL_RETURN_URL`
   - `PAYPAL_CANCEL_URL`
   - `ORDER_BCC_EMAIL` (optional; set to `info@chinamedicaltour.org` to BCC order/refund emails, or leave empty to disable)
4. Save and deploy (click **Save**, then **Deploy** if prompted).

## Verification

1. Visit:
   - `https://members.chinamedicaltour.org/api/profile`
2. Expect:
   - `{"ok":false,"error":"unauthorized"}` (401 when no token).

3. From the payment page console, run:
   ```js
   fetch("https://members.chinamedicaltour.org/api/profile", {
     headers: { Authorization: "Bearer " + sessionStorage.getItem("member_session_token") }
   }).then(r => r.json()).then(console.log)
   ```
4. Expect:
   - `profile_required: false` after profile is completed.
