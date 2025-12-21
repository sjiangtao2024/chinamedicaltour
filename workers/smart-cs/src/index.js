import { handlePreflight, isOriginAllowed, maybeGetCorsHeaders } from "./lib/cors.js";
import { errorResponse } from "./lib/errors.js";
import { createRequestId, logJson } from "./lib/logger.js";
import { normalizeAndTruncateMessages } from "./lib/truncate.js";
import { createKeyManager } from "./lib/key-manager.js";
import { fetchLongcatSse } from "./lib/longcat-client.js";
import { sseHeaders } from "./lib/sse.js";

export default {
  async fetch(request, env, ctx) {
    const startMs = Date.now();
    const requestId = createRequestId();
    const url = new URL(request.url);
    const path = url.pathname;
    const origin = request.headers.get("Origin");

    const corsHeaders = maybeGetCorsHeaders(origin, env);
    const noIndexHeaders = { "X-Robots-Tag": "noindex, nofollow, nosnippet" };

    if (request.method === "OPTIONS") {
      return handlePreflight({ origin, env });
    }

    if (origin && !isOriginAllowed(origin, env)) {
      logJson("warn", {
        request_id: requestId,
        origin,
        path,
        status: 403,
        latency_ms: Date.now() - startMs,
        error_code: "forbidden_origin",
      });
      return new Response("Forbidden: Origin not allowed", { status: 403, headers: noIndexHeaders });
    }

    if (!path.endsWith("/api/chat")) {
      return new Response("Not Found", { status: 404, headers: noIndexHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: {
          ...noIndexHeaders,
          ...(corsHeaders || {}),
        },
      });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse({
        status: 400,
        error_code: "invalid_request",
        request_id: requestId,
        corsHeaders,
      });
    }

    const temperature = typeof body?.temperature === "number" ? body.temperature : undefined;
import { getSystemPrompt } from "./lib/knowledge-base.js";

// ... imports

    const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
    if (!rawMessages) {
      return errorResponse({
        status: 400,
        error_code: "invalid_request",
        request_id: requestId,
        corsHeaders,
      });
    }

    // Insert System Prompt at the beginning
    const systemMessage = { role: "system", content: getSystemPrompt() };
    const messagesWithSystem = [systemMessage, ...rawMessages];

    const messages = normalizeAndTruncateMessages(messagesWithSystem, { requestId });

    const keyManager = createKeyManager({ env, cooldownMs: 60_000 });
    const timeoutMs =
      typeof env.TIMEOUT_MS === "number"
        ? env.TIMEOUT_MS
        : Number.isFinite(Number(env.TIMEOUT_MS))
          ? Number(env.TIMEOUT_MS)
          : 15_000;

    let lastUpstreamStatus = undefined;
    let lastFailure = "upstream_service_unavailable";

    for (let attempt = 1; attempt <= 3; attempt++) {
      const keySelection = keyManager.selectKeySlot();
      if (!keySelection) {
        logJson("error", {
          request_id: requestId,
          origin: origin || null,
          path,
          status: 503,
          latency_ms: Date.now() - startMs,
          key_slot: null,
          attempt,
          upstream_status: null,
          error_code: "no_available_key",
        });
        return errorResponse({
          status: 503,
          error_code: "upstream_service_unavailable",
          request_id: requestId,
          corsHeaders,
        });
      }

      const { key_slot, key } = keySelection;

      try {
        const upstream = await fetchLongcatSse({
          env,
          requestId,
          key,
          timeoutMs,
          clientSignal: request.signal,
          payload: {
            messages,
            stream: true,
            temperature,
          },
        });

        lastUpstreamStatus = upstream.status;

        if (upstream.ok && upstream.body) {
          const latencyMs = Date.now() - startMs;
          logJson("info", {
            request_id: requestId,
            origin: origin || null,
            path,
            status: 200,
            latency_ms: latencyMs,
            key_slot,
            attempt,
            upstream_status: upstream.status,
            error_code: null,
          });

          return new Response(upstream.body, {
            status: 200,
            headers: {
              ...sseHeaders(),
              ...(corsHeaders || {}),
            },
          });
        }

        if (upstream.status === 400) {
          lastFailure = "invalid_request";
          logJson("warn", {
            request_id: requestId,
            origin: origin || null,
            path,
            status: 400,
            latency_ms: Date.now() - startMs,
            key_slot,
            attempt,
            upstream_status: upstream.status,
            error_code: "invalid_request",
          });
          return errorResponse({
            status: 400,
            error_code: "invalid_request",
            request_id: requestId,
            corsHeaders,
          });
        }

        if (upstream.status === 429) {
          lastFailure = "rate_limit_exceeded";
          keyManager.markCooldown(key_slot);
          logJson("warn", {
            request_id: requestId,
            origin: origin || null,
            path,
            status: 429,
            latency_ms: Date.now() - startMs,
            key_slot,
            attempt,
            upstream_status: upstream.status,
            error_code: "rate_limit_exceeded",
          });
          continue;
        }

        if (upstream.status >= 500 || upstream.status === 401 || upstream.status === 403) {
          lastFailure = "upstream_service_unavailable";
          keyManager.markCooldown(key_slot);
          logJson("warn", {
            request_id: requestId,
            origin: origin || null,
            path,
            status: 503,
            latency_ms: Date.now() - startMs,
            key_slot,
            attempt,
            upstream_status: upstream.status,
            error_code: "upstream_service_unavailable",
          });
          continue;
        }

        lastFailure = "upstream_service_unavailable";
        keyManager.markCooldown(key_slot);
        logJson("warn", {
          request_id: requestId,
          origin: origin || null,
          path,
          status: 503,
          latency_ms: Date.now() - startMs,
          key_slot,
          attempt,
          upstream_status: upstream.status,
          error_code: "upstream_service_unavailable",
        });
      } catch (err) {
        const isTimeout = err && typeof err === "object" && err.code === "timeout";
        if (isTimeout) {
          lastFailure = "gateway_timeout";
          keyManager.markCooldown(key_slot);
          logJson("warn", {
            request_id: requestId,
            origin: origin || null,
            path,
            status: 504,
            latency_ms: Date.now() - startMs,
            key_slot,
            attempt,
            upstream_status: lastUpstreamStatus || null,
            error_code: "gateway_timeout",
          });
          continue;
        }

        lastFailure = "upstream_service_unavailable";
        keyManager.markCooldown(key_slot);
        logJson("error", {
          request_id: requestId,
          origin: origin || null,
          path,
          status: 503,
          latency_ms: Date.now() - startMs,
          key_slot,
          attempt,
          upstream_status: lastUpstreamStatus || null,
          error_code: "upstream_fetch_failed",
        });
      }
    }

    const finalStatus =
      lastFailure === "rate_limit_exceeded" ? 429 : lastFailure === "gateway_timeout" ? 504 : 503;
    return errorResponse({
      status: finalStatus,
      error_code: lastFailure,
      request_id: requestId,
      corsHeaders,
    });
  },
};
