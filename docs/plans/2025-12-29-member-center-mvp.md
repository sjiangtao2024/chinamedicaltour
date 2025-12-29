# Member Center MVP (2025-12-29)

## Goal
Provide a clear, lightweight member value surface that connects auth, profile completion, and payment into a single guided flow.

## Scope (MVP)
- New member center page with:
  - Status summary (email verified, profile completed, payment status).
  - Next-step callout.
  - Short benefit/entitlement list.
- Auth flow changes:
  - Login: email + password + Turnstile.
  - Registration: email verification (send/verify code) + profile fields + password + Turnstile.
  - Google OAuth login supported.
- Post-auth redirect to member center.

## Out of Scope (for now)
- Full account management (password change, billing history download).
- Admin CRM features.
- Persistent dashboard analytics.

## Routing
- Frontend routes:
  - `/auth` (login/register)
  - `/auth-callback` (Google login callback)
  - `/member-center` (new MVP page)
- After successful login/registration: redirect to `/member-center`.

## API Integration (existing)
- Base API: `https://members.chinamedicaltour.org`
- Auth:
  - `POST /api/auth/login`
  - `POST /api/auth/start-email`
  - `POST /api/auth/verify-email`
  - `POST /api/auth/set-password`
  - `POST /api/auth/session`
  - `GET /api/auth/google`
  - `POST /api/auth/exchange`
- Profile:
  - `POST /api/profile` (Bearer token)

## Turnstile
- Site key: `0x4AAAAAACI9tc3hGWz8MG8F`
- Token required on email verification endpoints (start/verify) and login.

## Success Criteria
- Auth page no longer shows placeholder; Turnstile is functional.
- New member center page is reachable and populated with basic status and next step.
- Login/registration/Google login redirect to member center.
