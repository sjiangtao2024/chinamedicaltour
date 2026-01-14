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
