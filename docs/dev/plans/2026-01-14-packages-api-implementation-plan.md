# Packages API Single Source Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide `/api/packages` from members as the single source of truth for packages and update frontend payment page to consume it.

**Architecture:** Members exposes a read-only packages endpoint backed by `service_products`, including display fields (name/category/price/features) and policy fields (refund_policy_type/terms_version). Frontend fetches this endpoint on Payment page load and renders selected package based on query param.

**Tech Stack:** Cloudflare Workers (JavaScript), D1, React (new-cmt), Vitest tests.

---

### Task 1: Add package fields to service_products schema

**Files:**
- Modify: `workers/members/migrations/0010_add_refund_policy_fields.sql`
- Test: `workers/members/tests/schema.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(
  "workers/members/migrations/0010_add_refund_policy_fields.sql",
  "utf8"
);
assert.ok(sql.includes("ALTER TABLE service_products ADD COLUMN category"));
assert.ok(sql.includes("ALTER TABLE service_products ADD COLUMN price"));
assert.ok(sql.includes("ALTER TABLE service_products ADD COLUMN currency"));
assert.ok(sql.includes("ALTER TABLE service_products ADD COLUMN features"));
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/schema.test.mjs`
Expected: FAIL with missing column assertions

**Step 3: Write minimal implementation**

```sql
ALTER TABLE service_products ADD COLUMN category TEXT;
ALTER TABLE service_products ADD COLUMN price INTEGER;
ALTER TABLE service_products ADD COLUMN currency TEXT;
ALTER TABLE service_products ADD COLUMN features TEXT;
```

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/schema.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add workers/members/migrations/0010_add_refund_policy_fields.sql workers/members/tests/schema.test.mjs
git commit -m "feat(packages): add display fields to service_products"
```

---

### Task 2: Add packages query + endpoint in members

**Files:**
- Modify: `workers/members/src/routes/orders.js`
- Modify: `workers/members/src/lib/orders.js`
- Test: `workers/members/tests/packages.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import { handleOrders } from "../src/routes/orders.js";

const db = {
  prepare(sql) {
    return {
      bind() {
        return {
          async all() {
            if (sql.includes("FROM service_products")) {
              return {
                results: [
                  {
                    item_type: "package",
                    item_id: "full-body",
                    name: "Full Body Scan",
                    category: "Health Screening",
                    price: 80000,
                    currency: "USD",
                    features: "MRI|CT",
                    refund_policy_type: "STANDARD",
                    terms_version: "2026-01-14",
                  },
                ],
              };
            }
            return { results: [] };
          },
        };
      },
    };
  },
};

const request = new Request("https://members.chinamedicaltour.org/api/packages", {
  method: "GET",
});

const response = await handleOrders({
  request,
  env: { MEMBERS_DB: db },
  url: new URL(request.url),
  respond: (status, payload) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
});

assert.equal(response.status, 200);
const data = await response.json();
assert.equal(data.ok, true);
assert.equal(data.packages.length, 1);
assert.equal(data.packages[0].item_id, "full-body");
assert.deepEqual(data.packages[0].features, ["MRI", "CT"]);
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/packages.test.mjs`
Expected: FAIL (endpoint missing)

**Step 3: Write minimal implementation**

```js
// in workers/members/src/lib/orders.js
export async function listServiceProducts(db, { itemType = "package" }) {
  return db
    .prepare(
      "SELECT item_type, item_id, name, category, price, currency, features, refund_policy_type, terms_version FROM service_products WHERE item_type = ? ORDER BY name ASC"
    )
    .bind(itemType)
    .all();
}

// in workers/members/src/routes/orders.js
if (url.pathname === "/api/packages" && request.method === "GET") {
  let db;
  try {
    db = requireDb(env);
  } catch (error) {
    return respond(500, { ok: false, error: "missing_db" });
  }
  const { results } = await listServiceProducts(db, { itemType: "package" });
  const packages = (results || []).map((row) => ({
    ...row,
    price: Number(row.price || 0),
    features: row.features ? String(row.features).split("|") : [],
  }));
  return respond(200, { ok: true, packages });
}
```

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/packages.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add workers/members/src/lib/orders.js workers/members/src/routes/orders.js workers/members/tests/packages.test.mjs
git commit -m "feat(packages): add packages api"
```

---

### Task 3: Backfill display fields in service_products seed

**Files:**
- Modify: `workers/members/migrations/0010_add_refund_policy_fields.sql`
- Test: `workers/members/tests/schema.test.mjs`

**Step 1: Write the failing test**

```js
import assert from "node:assert/strict";
import fs from "node:fs";

const sql = fs.readFileSync(
  "workers/members/migrations/0010_add_refund_policy_fields.sql",
  "utf8"
);
assert.ok(sql.includes("'Full Body Scan'"));
assert.ok(sql.includes("'Health Screening'"));
assert.ok(sql.includes("80000"));
assert.ok(sql.includes("'MRI"));
```

**Step 2: Run test to verify it fails**

Run: `node workers/members/tests/schema.test.mjs`
Expected: FAIL

**Step 3: Write minimal implementation**

Update seed INSERT to include `category`, `price`, `currency`, `features` values. Use `|` separator in `features`.

**Step 4: Run test to verify it passes**

Run: `node workers/members/tests/schema.test.mjs`
Expected: PASS

**Step 5: Commit**

```bash
git add workers/members/migrations/0010_add_refund_policy_fields.sql workers/members/tests/schema.test.mjs
git commit -m "feat(packages): seed display fields"
```

---

### Task 4: Update Payment page to fetch packages

**Files:**
- Modify: `new-cmt/src/pages/Payment.tsx`
- Test: `new-cmt/src/__tests__/paymentPackages.test.tsx`

**Step 1: Write the failing test**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Payment from "@/pages/Payment";

it("loads packages from api", async () => {
  const fetchMock = vi.fn((input: RequestInfo) => {
    const url = typeof input === "string" ? input : input.url;
    if (url.endsWith("/api/packages")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({
            ok: true,
            packages: [
              {
                item_type: "package",
                item_id: "full-body",
                name: "Full Body Scan",
                category: "Health Screening",
                price: 80000,
                currency: "USD",
                features: ["MRI"],
                refund_policy_type: "STANDARD",
                terms_version: "2026-01-14",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );
    }
    return Promise.resolve(new Response("not found", { status: 404 }));
  });

  const originalFetch = global.fetch;
  global.fetch = fetchMock as typeof fetch;

  render(
    <MemoryRouter initialEntries={["/payment?package=full-body"]}>
      <Payment />
    </MemoryRouter>
  );

  await waitFor(() => {
    expect(screen.getByText(/full body scan/i)).toBeInTheDocument();
  });

  global.fetch = originalFetch;
});
```

**Step 2: Run test to verify it fails**

Run: `npm test -- --run src/__tests__/paymentPackages.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

- Replace static `packages` map with fetched state.
- Load `/api/packages` in `useEffect` and store in state.
- Map API payload into `selectedPackage` by `item_id`.

**Step 4: Run test to verify it passes**

Run: `npm test -- --run src/__tests__/paymentPackages.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/Payment.tsx src/__tests__/paymentPackages.test.tsx
git commit -m "feat(payment): load packages from api"
```

---

### Task 5: Update documentation

**Files:**
- Modify: `docs/dev/plans/2026-01-14-refund-policy-implementation.md`

**Step 1: Update doc**

Add a section:
- `/api/packages` is the single source of truth
- New package onboarding steps

**Step 2: Commit**

```bash
git add docs/dev/plans/2026-01-14-refund-policy-implementation.md
git commit -m "docs(refund): document packages api as source of truth"
```

---

## Verification

Run:
- `node workers/members/tests/schema.test.mjs`
- `node workers/members/tests/packages.test.mjs`
- `npm test -- --run src/__tests__/paymentPackages.test.tsx`

Expected: PASS
