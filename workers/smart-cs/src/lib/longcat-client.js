import { sseHeaders, serializeSseData } from "./sse.js";

function shouldMock(env, keys) {
  if (env.MOCK_LONGCAT === "1") return true;
  const endpoint = String(env.LONGCAT_API_ENDPOINT || "");
  if (endpoint.includes("longcat.example")) return true;
  if (!keys || keys.length === 0) return true;
  return false;
}

function createTimeoutSignal(timeoutMs) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

function combineSignals(a, b) {
  if (!a) return b;
  if (!b) return a;
  if (AbortSignal.any) return AbortSignal.any([a, b]);
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  a.addEventListener("abort", onAbort, { once: true });
  b.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

function mockSseStream({ content }) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      (async () => {
        controller.enqueue(encoder.encode(serializeSseData({ choices: [{ delta: { content } }] })));
        await new Promise((r) => setTimeout(r, 50));
        controller.enqueue(
          encoder.encode(serializeSseData({ choices: [{ delta: { content: "\n" } }] })),
        );
        await new Promise((r) => setTimeout(r, 50));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      })().catch(() => controller.error(new Error("mock_failed")));
    },
  });
}

function getMockDirective(payload) {
  const msgs = Array.isArray(payload?.messages) ? payload.messages : [];
  const lastUser = [...msgs].reverse().find((m) => m && m.role === "user" && typeof m.content === "string");
  const text = (lastUser && lastUser.content) || "";
  if (text.includes("__mock_timeout")) return "timeout";
  if (text.includes("__mock_429")) return "429";
  if (text.includes("__mock_500")) return "500";
  return null;
}

export async function fetchLongcatSse({ env, requestId, key, timeoutMs, clientSignal, payload }) {
  const keys = (env.LONGCAT_API_KEYS || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (shouldMock(env, keys)) {
    const directive = getMockDirective(payload);
    if (directive === "timeout") {
      const e = new Error("timeout");
      e.code = "timeout";
      throw e;
    }
    if (directive === "429") return new Response(null, { status: 429 });
    if (directive === "500") return new Response(null, { status: 500 });
    const stream = mockSseStream({ content: "Mock reply (local dev). " + requestId });
    return new Response(stream, { status: 200, headers: sseHeaders() });
  }

  const timeout = createTimeoutSignal(timeoutMs);
  const combinedSignal = combineSignals(clientSignal, timeout.signal);

  try {
    const res = await fetch(env.LONGCAT_API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: env.MODEL_NAME,
        messages: payload.messages,
        stream: true,
        temperature: payload.temperature ?? 0.5,
      }),
      signal: combinedSignal,
    });
    return res;
  } catch (err) {
    if (timeout.signal.aborted) {
      const e = new Error("timeout");
      e.code = "timeout";
      throw e;
    }
    throw err;
  } finally {
    timeout.cancel();
  }
}
