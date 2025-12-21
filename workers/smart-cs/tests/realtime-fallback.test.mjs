import assert from "node:assert/strict";
import { getRealtimeReply } from "../src/lib/realtime.js";

const originalFetch = globalThis.fetch;

globalThis.fetch = async () => ({
  ok: false,
  status: 502,
  text: async () => "Bad Gateway",
  json: async () => ({}),
});

const result = await getRealtimeReply({ type: "weather", cityId: "beijing" });
assert.ok(result);
assert.match(result.text, /couldn't fetch/i);
assert.equal(result.meta?.error, true);
assert.equal(result.meta?.status, 502);

globalThis.fetch = originalFetch;
