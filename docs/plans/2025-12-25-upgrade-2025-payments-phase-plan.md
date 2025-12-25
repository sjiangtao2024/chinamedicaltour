# Upgrade 2025 Payments Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build registration/login with password, profile-before-payment, PayPal checkout, and smart-cs lead sync with minimal anti-abuse controls.

**Architecture:** Extend `workers/members` for auth/session/profile/order/paypal and sync profiles to `workers/smart-cs` via a token-protected webhook. Use D1 for persistent entities, KV for verification codes and rate limits. Static Pages call `/api/...` on the same domain with JWT auth.

**Tech Stack:** Cloudflare Workers (nodejs_compat), D1, KV, Resend, PayPal Sandbox, Google OAuth, Turnstile (optional after threshold), vanilla JS + static HTML.

---

## Phase 1: Data Layer (D1 schemas)

### Task 1.1: Add `user_profiles` table in members

**Files:**
- Create: `workers/members/migrations/0002_add_user_profiles.sql`
- Modify: `workers/members/tests/schema.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(
  "workers/members/migrations/0002_add_user_profiles.sql",
  "utf8"
);
assert.ok(sql.includes("CREATE TABLE user_profiles"));
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/schema.test.mjs`  
Expected: FAIL with "ENOENT" or assertion failure.

**Step 3: Write minimal implementation**

```sql
CREATE TABLE user_profiles (
  user_id TEXT PRIMARY KEY,
  name TEXT,
  gender TEXT,
  birth_date TEXT,
  contact_info TEXT,
  companions TEXT,
  emergency_contact TEXT,
  email TEXT,
  checkup_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/schema.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/migrations/0002_add_user_profiles.sql workers/members/tests/schema.test.mjs
git commit -m "feat(members): add user_profiles schema"
```

### Task 1.2: Add `member_leads` table in smart-cs

**Files:**
- Create: `workers/smart-cs/migrations/0003_create_member_leads.sql`
- Create: `workers/smart-cs/tests/member-leads-schema.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(
  "workers/smart-cs/migrations/0003_create_member_leads.sql",
  "utf8"
);
assert.ok(sql.includes("CREATE TABLE member_leads"));
```

**Step 2: Run test to verify it fails**

Run: `node workers/smart-cs/tests/member-leads-schema.test.mjs`  
Expected: FAIL with "ENOENT" or assertion failure.

**Step 3: Write minimal implementation**

```sql
CREATE TABLE member_leads (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  name TEXT,
  contact_info TEXT,
  checkup_date TEXT,
  companions TEXT,
  emergency_contact TEXT,
  source TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX member_leads_email_idx ON member_leads(email);
```

**Step 4: Run test to verify it passes**

Run: `node workers/smart-cs/tests/member-leads-schema.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/smart-cs/migrations/0003_create_member_leads.sql workers/smart-cs/tests/member-leads-schema.test.mjs
git commit -m "feat(smart-cs): add member_leads schema"
```

---

## Phase 2: Auth (email verification + password)

### Task 2.1: Add password hashing utilities

**Files:**
- Create: `workers/members/src/lib/password.js`
- Create: `workers/members/tests/password.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../src/lib/password.js";

const hash = await hashPassword("s3cr3t");
assert.ok(hash.includes("$"));
assert.ok(await verifyPassword("s3cr3t", hash));
assert.equal(await verifyPassword("wrong", hash), false);
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/password.test.mjs`  
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

```js
const ITERATIONS = 120000;
const KEYLEN = 32;

function base64(bytes) {
  return Buffer.from(bytes).toString("base64");
}

export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    KEYLEN * 8
  );
  return [
    "pbkdf2",
    ITERATIONS,
    base64(salt),
    base64(new Uint8Array(bits)),
  ].join("$");
}

export async function verifyPassword(password, stored) {
  const [label, iterStr, saltB64, hashB64] = stored.split("$");
  if (label !== "pbkdf2") return false;
  const iterations = Number(iterStr);
  const salt = Uint8Array.from(Buffer.from(saltB64, "base64"));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    KEYLEN * 8
  );
  const computed = base64(new Uint8Array(bits));
  return computed === hashB64;
}
```

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/password.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src/lib/password.js workers/members/tests/password.test.mjs
git commit -m "feat(members): add password hashing utilities"
```

### Task 2.2: Add verification rate-limit helpers

**Files:**
- Modify: `workers/members/src/lib/verification.js`
- Modify: `workers/members/tests/verification.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import {
  buildVerificationKey,
  buildSendRateKey,
  buildDailyRateKey,
  buildIpRateKey,
} from "../src/lib/verification.js";

assert.equal(buildVerificationKey("test@example.com"), "verify:test@example.com");
assert.equal(buildSendRateKey("test@example.com"), "verify:send:test@example.com");
assert.equal(buildDailyRateKey("test@example.com"), "verify:daily:test@example.com");
assert.equal(buildIpRateKey("1.2.3.4"), "verify:ip:1.2.3.4");
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/verification.test.mjs`  
Expected: FAIL with "buildSendRateKey is not a function".

**Step 3: Write minimal implementation**

```js
export function buildSendRateKey(email) {
  return `verify:send:${email}`;
}

export function buildDailyRateKey(email) {
  return `verify:daily:${email}`;
}

export function buildIpRateKey(ip) {
  return `verify:ip:${ip}`;
}
```

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/verification.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src/lib/verification.js workers/members/tests/verification.test.mjs
git commit -m "feat(members): add verification rate-limit keys"
```

### Task 2.3: Enforce minimal anti-abuse on email sends

**Files:**
- Modify: `workers/members/src/index.js`
- Modify: `workers/members/tests/verification.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { buildSendRateKey } from "../src/lib/verification.js";

assert.equal(buildSendRateKey("a@b.com"), "verify:send:a@b.com");
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/verification.test.mjs`  
Expected: FAIL until Task 2.2 is done.

**Step 3: Write minimal implementation**

In `workers/members/src/index.js` within `POST /api/auth/start-email`:
- Require `MEMBERS_KV` binding.
- Check send interval key (`verify:send:<email>`) and return 429 if present.
- Increment daily key (`verify:daily:<email>`) and ip key (`verify:ip:<ip>`), enforcing limits (e.g. 5/day email, 20/day ip).
- Only require Turnstile when thresholds are exceeded (optional path).
- Always return 200 with `{ ok: true }` for valid payloads to avoid user enumeration.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/verification.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src/index.js workers/members/tests/verification.test.mjs
git commit -m "feat(members): add minimal anti-abuse to email verification"
```

### Task 2.4: Add password-based auth endpoints

**Files:**
- Modify: `workers/members/src/index.js`
- Modify: `workers/members/src/lib/verification.js`
- Create: `workers/members/src/lib/users.js`
- Create: `workers/members/tests/login.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { normalizeEmail } from "../src/lib/verification.js";

assert.equal(normalizeEmail(" Test@Example.com "), "test@example.com");
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/login.test.mjs`  
Expected: FAIL with "Cannot find module" or assertion failure.

**Step 3: Write minimal implementation**

In `workers/members/src/lib/users.js`, add helpers:

```js
export async function findUserByEmail(db, email) { /* SELECT */ }
export async function createUser(db, payload) { /* INSERT */ }
export async function upsertPasswordIdentity(db, userId, hash) { /* INSERT/UPDATE auth_identities */ }
export async function findPasswordIdentity(db, userId) { /* SELECT */ }
```

In `workers/members/src/index.js`, add routes:
- `POST /api/auth/set-password` (requires prior email verification token or verified flag in KV; create user if needed; store `password_hash`).
- `POST /api/auth/login` (email + password; verify hash; return `user_id`).
- `POST /api/auth/reset-start` (send reset code, same rate limits).
- `POST /api/auth/reset-password` (verify code, update `password_hash`).

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/login.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src workers/members/tests/login.test.mjs
git commit -m "feat(members): add password login/reset endpoints"
```

### Task 2.5: Gate protected endpoints with JWT

**Files:**
- Modify: `workers/members/src/index.js`
- Modify: `workers/members/src/lib/jwt.js`
- Create: `workers/members/tests/auth-guard.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { verifySessionToken } from "../src/lib/jwt.js";

await assert.rejects(
  () => verifySessionToken("bad.token", "secret"),
  /invalid_token/
);
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/auth-guard.test.mjs`  
Expected: FAIL with "verifySessionToken is not a function".

**Step 3: Write minimal implementation**

In `workers/members/src/lib/jwt.js`, add `verifySessionToken` that validates signature and returns payload.

In `workers/members/src/index.js`, create helper:
- `requireAuth(request, env)` which reads `Authorization: Bearer <token>`, validates JWT, returns `userId` or 401.
- Use it for `/api/profile`, `/api/orders`, `/api/paypal/*`, and any user-specific endpoints.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/auth-guard.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src workers/members/tests/auth-guard.test.mjs
git commit -m "feat(members): enforce JWT auth on protected endpoints"
```

---

## Phase 3: Profile (before payment)

### Task 3.1: Normalize and store user profiles

**Files:**
- Modify: `workers/members/src/lib/profile.js`
- Create: `workers/members/tests/user-profile.test.mjs`
- Modify: `workers/members/src/index.js`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { normalizeProfile } from "../src/lib/profile.js";

const profile = normalizeProfile({ email: "A@B.COM" });
assert.equal(profile.email, "a@b.com");
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/user-profile.test.mjs`  
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

In `workers/members/src/lib/profile.js`:
- Ensure `normalizeProfile` normalizes email and trims strings.
- Add `upsertUserProfile(db, userId, profile)` which inserts or updates `user_profiles`.

In `workers/members/src/index.js`:
- Add `POST /api/profile` (JWT required) to call `upsertUserProfile`.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/user-profile.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src workers/members/tests/user-profile.test.mjs
git commit -m "feat(members): add user profile endpoint"
```

### Task 3.2: Enforce profile-before-order

**Files:**
- Modify: `workers/members/src/lib/orders.js`
- Modify: `workers/members/src/index.js`
- Create: `workers/members/tests/order-guard.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { requireProfile } from "../src/lib/orders.js";

await assert.rejects(
  () => requireProfile(null, "user-1"),
  /missing_profile/
);
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/order-guard.test.mjs`  
Expected: FAIL with "requireProfile is not a function".

**Step 3: Write minimal implementation**

In `workers/members/src/lib/orders.js`:
- Add `requireProfile(db, userId)` that checks `user_profiles` exists.

In `workers/members/src/index.js`:
- Use JWT `userId` and call `requireProfile` before `insertOrder`.
- Remove `user_id` from request body.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/order-guard.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src workers/members/tests/order-guard.test.mjs
git commit -m "feat(members): require profile before order"
```

---

## Phase 4: Orders + PayPal (JWT-protected)

### Task 4.1: Use JWT user_id in orders and payments

**Files:**
- Modify: `workers/members/src/index.js`
- Modify: `workers/members/tests/orders.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { normalizeOrderInput } from "../src/lib/orders.js";

assert.equal(normalizeOrderInput({ item_type: "package" }).itemType, "package");
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/orders.test.mjs`  
Expected: FAIL until helper exists.

**Step 3: Write minimal implementation**

In `workers/members/src/lib/orders.js`:
- Add `normalizeOrderInput` to validate order fields.

In `workers/members/src/index.js`:
- Read `userId` from `requireAuth`, not request body.
- Ensure `POST /api/paypal/create` and `/api/paypal/capture` validate `order.user_id === userId`.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/orders.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src workers/members/tests/orders.test.mjs
git commit -m "feat(members): tie orders to JWT user"
```

---

## Phase 5: smart-cs Lead Sync

### Task 5.1: Add smart-cs lead intake endpoint

**Files:**
- Modify: `workers/smart-cs/src/index.js`
- Create: `workers/smart-cs/src/lib/member-leads.js`
- Create: `workers/smart-cs/tests/member-leads.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { normalizeLead } from "../src/lib/member-leads.js";

const lead = normalizeLead({ email: "A@B.COM" });
assert.equal(lead.email, "a@b.com");
```

**Step 2: Run test to verify it fails**

Run: `node workers/smart-cs/tests/member-leads.test.mjs`  
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

In `workers/smart-cs/src/lib/member-leads.js`:
- `normalizeLead` lowercases email and trims strings.
- `insertLead(db, payload)` inserts into `member_leads`.

In `workers/smart-cs/src/index.js`:
- Add `POST /api/leads` with `Authorization: Bearer <SMART_CS_LEAD_TOKEN>`.
- Validate payload fields and insert.

**Step 4: Run test to verify it passes**

Run: `node workers/smart-cs/tests/member-leads.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/smart-cs/src workers/smart-cs/tests/member-leads.test.mjs
git commit -m "feat(smart-cs): add lead intake endpoint"
```

### Task 5.2: Trigger lead sync from profile submission

**Files:**
- Modify: `workers/members/src/index.js`
- Create: `workers/members/src/lib/smart-cs.js`
- Create: `workers/members/tests/smart-cs.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { buildLeadPayload } from "../src/lib/smart-cs.js";

const payload = buildLeadPayload({ email: "A@B.COM", name: "Test" });
assert.equal(payload.email, "a@b.com");
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/smart-cs.test.mjs`  
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

In `workers/members/src/lib/smart-cs.js`:
- `buildLeadPayload(profile)` normalizes allowed fields only.
- `sendLead(env, payload)` POSTs to `SMART_CS_LEAD_URL` with bearer token.

In `workers/members/src/index.js`:
- After `POST /api/profile` success, call `sendLead` in a try/catch.
- Log errors but do not block profile response.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/smart-cs.test.mjs`  
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src workers/members/tests/smart-cs.test.mjs
git commit -m "feat(members): sync profile to smart-cs"
```

---

## Phase 6: Frontend (Pages)

### Task 6.1: Add register/login/profile/checkout pages

**Files:**
- Create: `public/register.html`
- Create: `public/login.html`
- Create: `public/profile.html`
- Create: `public/checkout.html`
- Modify: `public/index.html`

**Step 1: Write the failing test**

Manual: confirm pages load and include CTA links.

**Step 2: Implement minimal pages**

Add simple forms matching API fields (email/code/password/profile/checkout).

**Step 3: Manual verification**

- Visit `/register` and `/login`
- Submit profile then proceed to checkout

**Step 4: Commit**

```bash
git add public/register.html public/login.html public/profile.html public/checkout.html public/index.html
git commit -m "feat(pages): add auth/profile/checkout pages"
```

### Task 6.2: Implement front-end flow in `members.js`

**Files:**
- Modify: `public/assets/js/members.js`
- Modify: `public/assets/css/members.css`

**Step 1: Write the failing test**

Manual: verify no JS errors on page load.

**Step 2: Implement minimal flow**

- `register`: start-email -> verify -> set-password -> login -> session token
- store JWT in `sessionStorage`
- `profile`: POST `/api/profile` with `Authorization` header
- `checkout`: create order -> create PayPal order -> capture

**Step 3: Manual verification**

- Confirm login persists across pages via `sessionStorage`
- Ensure profile is required before order

**Step 4: Commit**

```bash
git add public/assets/js/members.js public/assets/css/members.css
git commit -m "feat(pages): wire auth/profile/checkout flow"
```

---

## Phase 7: Configuration + Secrets

### Task 7.1: Update wrangler configs

**Files:**
- Modify: `workers/members/wrangler.jsonc`
- Modify: `workers/smart-cs/wrangler.jsonc`

**Step 1: Write the failing test**

Manual: confirm new bindings and vars documented.

**Step 2: Implement config**

Members:
- KV binding: `MEMBERS_KV`
- D1 binding: `MEMBERS_DB`
- Secrets: `JWT_SECRET`, `RESEND_API_KEY`, `FROM_EMAIL`, `PAYPAL_*`, `SMART_CS_LEAD_URL`, `SMART_CS_LEAD_TOKEN`, `TURNSTILE_SECRET`

Smart-cs:
- D1 binding: `SMART_CS_DB` (or existing)
- Secret: `SMART_CS_LEAD_TOKEN`

**Step 3: Manual verification**

Run: `wrangler deploy --dry-run` (if available)

**Step 4: Commit**

```bash
git add workers/members/wrangler.jsonc workers/smart-cs/wrangler.jsonc
git commit -m "chore: add members/smart-cs bindings and secrets"
```

