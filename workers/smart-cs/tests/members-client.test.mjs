import assert from "node:assert/strict";
import { fetchOrderDetail } from "../src/lib/members-client.js";

const env = { MEMBERS_API_BASE: "https://members.example.com" };

const calls = [];
const fetchImpl = async (url, init) => {
  calls.push({ url, init });
  return new Response(
    JSON.stringify({ ok: true, order: { id: "order-1", status: "paid" } }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

const order = await fetchOrderDetail({
  env,
  authHeader: "Bearer test-token",
  orderId: "order-1",
  fetchImpl,
});

assert.equal(order.id, "order-1");
assert.equal(calls.length, 1);
assert.equal(calls[0].url, "https://members.example.com/api/orders/order-1");
assert.equal(calls[0].init.headers.Authorization, "Bearer test-token");
