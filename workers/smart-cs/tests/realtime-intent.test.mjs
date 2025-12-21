import assert from "node:assert/strict";
import { parseRealtimeIntent } from "../src/lib/intent.js";

const weather = parseRealtimeIntent("What's the weather in Beijing today?");
assert.deepEqual(weather, { type: "weather", cityId: "beijing" });

const weatherWithContext = parseRealtimeIntent(
  "[Context: User is viewing 'Home' page about general medical tourism inquiries]\n\n北京今天天气怎么样？",
);
assert.deepEqual(weatherWithContext, { type: "weather", cityId: "beijing" });

const fx = parseRealtimeIntent("USD to CNY exchange rate?");
assert.deepEqual(fx, { type: "fx", from: "USD", to: "CNY" });

const fxCny = parseRealtimeIntent("人民币兑欧元汇率");
assert.deepEqual(fxCny, { type: "fx", from: "CNY", to: "EUR" });

const notSupported = parseRealtimeIntent("EUR to GBP rate");
assert.equal(notSupported, null);
