# Members + Payments Deployment Guide

## Prerequisites
- Cloudflare account with D1 + KV enabled
- Resend API key + verified domain
- PayPal Sandbox app credentials
- Google OAuth client credentials

## 1) Configure Wrangler bindings
Update `workers/members/wrangler.jsonc` with:
- D1 binding: `MEMBERS_DB`
- KV namespace: `MEMBERS_KV`
- Variables: `FROM_EMAIL`, `GOOGLE_REDIRECT_URI`

## 2) Create KV namespace
Run:
```bash
wrangler kv namespace create MEMBERS_KV
```
Then copy the IDs into `wrangler.jsonc`.

## 3) Create or attach D1 database
Run:
```bash
wrangler d1 create members_db
```
Then add to `wrangler.jsonc` as `MEMBERS_DB`.

## 4) Apply migrations
Run:
```bash
wrangler d1 migrations apply MEMBERS_DB --remote
```

## 5) Set secrets
Run:
```bash
wrangler secret put RESEND_API_KEY
wrangler secret put JWT_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put PAYPAL_CLIENT_ID
wrangler secret put PAYPAL_SECRET
wrangler secret put PAYPAL_WEBHOOK_ID
```

## 6) Deploy worker
Run:
```bash
cd workers/members
wrangler deploy
```

## 7) Verify
- `GET /health` returns `{ ok: true }`
- `POST /api/auth/start-email` sends a code
- `POST /api/orders` creates an order
- PayPal sandbox create/capture flows complete
