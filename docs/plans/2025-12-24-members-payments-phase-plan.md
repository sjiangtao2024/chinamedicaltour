# Members + PayPal + Coupons Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a new `workers/members` API plus minimal static pages for registration, checkout, and post-payment profile completion.

**Architecture:** Add a dedicated Workers service (`workers/members`) that owns auth, orders, coupons, PayPal sandbox, and profile collection. Use D1 as the primary data store with KV for short-lived verification codes/session tokens. Static pages call `/api/...` on the same domain.

**Tech Stack:** Cloudflare Workers (nodejs_compat), D1, KV, Resend, PayPal Sandbox, Google OAuth, vanilla JS + static HTML.

### Task 1: Create a dedicated worktree

**Files:**
- None

**Step 1: Create worktree (use @superpowers:using-git-worktrees)**

Run: `git worktree add ../chinamedicaltour-members-payments`
Expected: new worktree directory created.

**Step 2: Enter worktree**

Run: `cd ../chinamedicaltour-members-payments`
Expected: path changes to new worktree.

**Step 3: Commit a placeholder branch**

Run:
```bash
git checkout -b feat/members-payments
```
Expected: branch created.

### Task 2: Scaffold `workers/members` Worker

**Files:**
- Create: `workers/members/package.json`
- Create: `workers/members/wrangler.jsonc`
- Create: `workers/members/src/index.js`
- Create: `workers/members/src/lib/response.js`
- Create: `workers/members/tests/health.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { jsonResponse } from "../src/lib/response.js";

assert.deepEqual(
  jsonResponse(200, { ok: true }).headers.get("Content-Type"),
  "application/json"
);
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/health.test.mjs`
Expected: FAIL with "Cannot find module" or "jsonResponse is not defined".

**Step 3: Write minimal implementation**

```js
export function jsonResponse(status, data, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
```

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/health.test.mjs`
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members
git commit -m "feat(members): scaffold worker and test helpers"
```

### Task 3: Add D1 schema migrations

**Files:**
- Create: `workers/members/migrations/0001_create_members_tables.sql`
- Create: `workers/members/tests/schema.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync("workers/members/migrations/0001_create_members_tables.sql", "utf8");
assert.ok(sql.includes("CREATE TABLE users"));
assert.ok(sql.includes("CREATE TABLE orders"));
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/schema.test.mjs`
Expected: FAIL with "ENOENT: no such file or directory".

**Step 3: Write minimal implementation**

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  country TEXT,
  preferred_contact TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX users_email_idx ON users(email);

CREATE TABLE auth_identities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  google_sub TEXT,
  password_hash TEXT,
  email_verified_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX auth_user_idx ON auth_identities(user_id);

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  item_type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  amount_original INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL,
  amount_paid INTEGER NOT NULL,
  currency TEXT NOT NULL,
  ref_channel TEXT,
  coupon_id TEXT,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX orders_idempotency_idx ON orders(idempotency_key);

CREATE TABLE order_profiles (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  gender TEXT,
  birth_date TEXT,
  contact_info TEXT,
  companions TEXT,
  emergency_contact TEXT,
  email TEXT,
  checkup_date TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX order_profiles_order_idx ON order_profiles(order_id);

CREATE TABLE coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  value INTEGER NOT NULL,
  ref_channel TEXT,
  scope TEXT,
  valid_from TEXT,
  valid_to TEXT,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX coupons_code_idx ON coupons(code);
```

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/schema.test.mjs`
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/migrations workers/members/tests/schema.test.mjs
git commit -m "feat(members): add D1 schema migrations"
```

### Task 4: Email verification flow (Resend + KV)

**Files:**
- Create: `workers/members/src/lib/email.js`
- Create: `workers/members/src/lib/verification.js`
- Modify: `workers/members/src/index.js`
- Create: `workers/members/tests/verification.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { buildVerificationKey } from "../src/lib/verification.js";

assert.equal(buildVerificationKey("test@example.com"), "verify:test@example.com");
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/verification.test.mjs`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

```js
export function buildVerificationKey(email) {
  return `verify:${email}`;
}
```

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/verification.test.mjs`
Expected: exit code 0.

**Step 5: Implement routes**

Add `POST /api/auth/start-email` and `POST /api/auth/verify-email` in `workers/members/src/index.js`. Require `RESEND_API_KEY`, `FROM_EMAIL`, KV binding `MEMBERS_KV`, and enforce 10-minute TTL.

**Step 6: Commit**

```bash
git add workers/members/src workers/members/tests/verification.test.mjs
git commit -m "feat(members): email verification endpoints"
```

### Task 5: Session tokens (JWT)

**Files:**
- Create: `workers/members/src/lib/jwt.js`
- Modify: `workers/members/src/index.js`
- Create: `workers/members/tests/jwt.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/jwt.js";

const token = await createSessionToken({ userId: "u1" }, "secret");
assert.ok(token.split(".").length === 3);
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/jwt.test.mjs`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

Implement JWT creation/verification with a 24h TTL. Use `JWT_SECRET` from env.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/jwt.test.mjs`
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src/lib/jwt.js workers/members/tests/jwt.test.mjs workers/members/src/index.js
git commit -m "feat(members): JWT session tokens"
```

### Task 6: Google OAuth endpoints

**Files:**
- Create: `workers/members/src/lib/google-oauth.js`
- Modify: `workers/members/src/index.js`
- Create: `workers/members/tests/google-oauth.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { buildAuthUrl } from "../src/lib/google-oauth.js";

const url = buildAuthUrl("client", "https://chinamedicaltour.org/api/auth/google/callback", "state123");
assert.ok(url.includes("accounts.google.com"));
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/google-oauth.test.mjs`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

Implement auth URL builder and callback handler that exchanges code for tokens and maps to `auth_identities`.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/google-oauth.test.mjs`
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src/lib/google-oauth.js workers/members/tests/google-oauth.test.mjs workers/members/src/index.js
git commit -m "feat(members): google oauth endpoints"
```

### Task 7: Orders + coupons + idempotency

**Files:**
- Create: `workers/members/src/lib/orders.js`
- Create: `workers/members/src/lib/coupons.js`
- Modify: `workers/members/src/index.js`
- Create: `workers/members/tests/orders.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { applyCoupon } from "../src/lib/coupons.js";

assert.deepEqual(applyCoupon(10000, { type: "percent", value: 10 }), {
  original: 10000,
  discount: 1000,
  paid: 9000,
});
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/orders.test.mjs`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

Implement coupon application, idempotency key uniqueness, and `POST /api/orders`.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/orders.test.mjs`
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src/lib/orders.js workers/members/src/lib/coupons.js workers/members/tests/orders.test.mjs workers/members/src/index.js
git commit -m "feat(members): orders and coupons"
```

### Task 8: PayPal sandbox integration + webhook

**Files:**
- Create: `workers/members/src/lib/paypal.js`
- Modify: `workers/members/src/index.js`
- Create: `workers/members/tests/paypal.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { buildOrderPayload } from "../src/lib/paypal.js";

const payload = buildOrderPayload({ amount: 100, currency: "USD" });
assert.equal(payload.intent, "CAPTURE");
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/paypal.test.mjs`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

Implement create/capture endpoints plus webhook verification (signature check). Require `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_WEBHOOK_ID`.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/paypal.test.mjs`
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src/lib/paypal.js workers/members/tests/paypal.test.mjs workers/members/src/index.js
git commit -m "feat(members): paypal sandbox integration"
```

### Task 9: Post-payment profile collection

**Files:**
- Create: `workers/members/src/lib/profile.js`
- Modify: `workers/members/src/index.js`
- Create: `workers/members/tests/profile.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { normalizeProfile } from "../src/lib/profile.js";

const profile = normalizeProfile({ email: "a@b.com" });
assert.equal(profile.email, "a@b.com");
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/profile.test.mjs`
Expected: FAIL with "Cannot find module".

**Step 3: Write minimal implementation**

Implement `POST /api/orders/:id/profile` and update order status to `profile_completed`. Sync non-sensitive fields to `users`.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/profile.test.mjs`
Expected: exit code 0.

**Step 5: Commit**

```bash
git add workers/members/src/lib/profile.js workers/members/tests/profile.test.mjs workers/members/src/index.js
git commit -m "feat(members): post-payment profile collection"
```

### Task 10: Static pages + minimal wiring

**Files:**
- Create: `public/register.html`
- Create: `public/checkout.html`
- Create: `public/post-payment.html`
- Create: `public/assets/js/members.js`
- Create: `public/assets/css/members.css`
- Modify: `public/index.html`

**Step 1: Write the failing test**

Add a simple smoke test script `scripts/check-members-pages.js` that asserts files exist.

**Step 2: Run test to verify it fails**

Run: `node scripts/check-members-pages.js`
Expected: FAIL with "ENOENT" for missing pages.

**Step 3: Write minimal implementation**

Create the three pages, wire `members.js`, add a "Member Register" link on `public/index.html`, and add minimal form validation.

**Step 4: Run test to verify it passes**

Run: `node scripts/check-members-pages.js`
Expected: exit code 0.

**Step 5: Commit**

```bash
git add public scripts/check-members-pages.js
git commit -m "feat(frontend): add members register and checkout pages"
```

### Task 11: Update docs and deployment notes

**Files:**
- Modify: `docs/upgrade-2025-payments/design.md`
- Create: `docs/upgrade-2025-payments/deployment.md`

**Step 1: Write the failing test**

Create `scripts/check-upgrade-docs.js` to assert `deployment.md` exists.

**Step 2: Run test to verify it fails**

Run: `node scripts/check-upgrade-docs.js`
Expected: FAIL with "ENOENT".

**Step 3: Write minimal implementation**

Add deployment steps (wrangler deploy, D1 migrations, secrets, KV binding) to `docs/upgrade-2025-payments/deployment.md`.

**Step 4: Run test to verify it passes**

Run: `node scripts/check-upgrade-docs.js`
Expected: exit code 0.

**Step 5: Commit**

```bash
git add docs/upgrade-2025-payments/deployment.md scripts/check-upgrade-docs.js
git commit -m "docs: add members payments deployment guide"
```

---

Plan complete and saved to `docs/plans/2025-12-24-members-payments-phase-plan.md`. Two execution options:

1. Subagent-Driven (this session) - I dispatch fresh subagent per task, review between tasks, fast iteration
2. Parallel Session (separate) - Open new session with executing-plans, batch execution with checkpoints

Which approach?
