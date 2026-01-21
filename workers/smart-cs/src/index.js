import { handlePreflight, isOriginAllowed, maybeGetCorsHeaders } from "./lib/cors.js";
import { errorResponse } from "./lib/errors.js";
import { createRequestId, logJson } from "./lib/logger.js";
import { normalizeAndTruncateMessages } from "./lib/truncate.js";
import { createKeyManager } from "./lib/key-manager.js";
import { buildInsert, buildCleanup, buildUpdateSummary, buildUpdateRating } from "./lib/chat-log.js";
import { fetchLongcatSse } from "./lib/longcat-client.js";
import { sseHeaders, serializeSseData } from "./lib/sse.js";
import { getSystemPrompt } from "./lib/knowledge-base.js";
import { fetchRagChunks, mergeRagIntoSystemPrompt } from "./lib/rag-runtime.js";
import { shouldFallback } from "./lib/rag.js";
import { englishFallbackText, guardEnglishStream } from "./lib/english-guard.js";
import { resolveMaxTokens } from "./lib/token-budget.js";
import { parseRealtimeIntent } from "./lib/intent.js";
import { getRealtimeReply } from "./lib/realtime.js";
import { collectSseText } from "./lib/sse-collector.js";
import { parseExportParams } from "./lib/export.js";
import { insertLead, normalizeLead } from "./lib/member-leads.js";
import { nextLeadQuestion, shouldUseLeadFlow } from "./lib/lead-flow.js";
import { classifyPurchaseIntent } from "./lib/intent-score.js";
import { buildSummaryQueries, parseSummaryParams } from "./lib/admin-summary.js";
import {
  buildLoginRequiredReply,
  buildOrderInfoRequestReply,
  buildPolicyFallbackReply,
  classifySupportIntent,
} from "./lib/guardrails.js";
import { fetchOrderDetail } from "./lib/members-client.js";
import {
  buildOrderNotFoundReply,
  extractOrderId,
  formatOrderSummary,
} from "./lib/order-support.js";
import {
  buildLeadExtractionPrompt,
  isLeadComplete,
  parseLeadExtraction,
  sendLeadEmail,
  validateContact,
} from "./lib/lead-intake.js";

const CONTEXT_PREFIX = /^\[Context:\s*([^\]]+)\]\s*/;

function stripContextHeader(text) {
  if (!text) return "";
  const match = text.match(CONTEXT_PREFIX);
  if (!match) return text.trim();
  return text.slice(match[0].length).trim();
}

function extractContextHeader(text) {
  if (!text) return null;
  const match = text.match(CONTEXT_PREFIX);
  return match ? match[1].trim() : null;
}

function normalizeMeta(body, lastUserText) {
  const meta = body && body.meta && typeof body.meta === "object" ? body.meta : {};
  const pageUrl = typeof meta.page_url === "string" ? meta.page_url.trim() : "";
  const pageContext = typeof meta.page_context === "string" ? meta.page_context.trim() : "";
  const sessionId = typeof meta.session_id === "string" ? meta.session_id.trim() : "";
  const memberId = typeof meta.member_id === "string" ? meta.member_id.trim() : "";
  const fallbackContext = extractContextHeader(lastUserText || "");
  return {
    page_url: pageUrl || null,
    page_context: pageContext || fallbackContext || null,
    session_id: sessionId || null,
    member_id: memberId || null,
  };
}

function isAdminAuthorized(request, env) {
  const expected = env.ADMIN_TOKEN;
  if (!expected) return false;
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token");
  if (queryToken && queryToken === expected) return true;
  const headerToken = request.headers.get("X-Admin-Token");
  if (headerToken && headerToken === expected) return true;
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ") && auth.slice(7) === expected) return true;
  return false;
}

function buildAdminPage({ tokenParam }) {
  const tokenValue = tokenParam ? tokenParam.replace(/"/g, "&quot;") : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Smart CS Export</title>
    <style>
      body { font-family: system-ui, sans-serif; margin: 24px; color: #0f172a; }
      form { display: grid; gap: 12px; max-width: 520px; }
      label { font-size: 13px; color: #334155; }
      input { padding: 8px 10px; border: 1px solid #cbd5f5; border-radius: 8px; font-size: 14px; }
      button { padding: 10px 14px; border: none; border-radius: 8px; background: #0f766e; color: #fff; font-weight: 600; cursor: pointer; }
      .hint { font-size: 12px; color: #64748b; }
    </style>
  </head>
  <body>
    <h2>Smart CS Export</h2>
    <p class="hint">Download chat logs as CSV. Requires admin token.</p>
    <form method="GET" action="/admin/export.csv">
      <label>Admin Token</label>
      <input name="token" type="password" value="${tokenValue}" required />
      <label>Start (ISO date)</label>
      <input name="start" type="text" placeholder="2025-01-01" />
      <label>End (ISO date)</label>
      <input name="end" type="text" placeholder="2025-01-31" />
      <label>Limit</label>
      <input name="limit" type="number" min="1" max="5000" value="1000" />
      <label>Offset</label>
      <input name="offset" type="number" min="0" value="0" />
      <button type="submit">Download CSV</button>
    </form>
  </body>
</html>`;
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsv(rows) {
  const header = [
    "request_id",
    "user_text",
    "assistant_summary",
    "rating",
    "page_url",
    "page_context",
    "created_at",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const line = [
      row.request_id,
      row.user_text,
      row.assistant_summary,
      row.rating,
      row.page_url,
      row.page_context,
      row.created_at,
    ].map(csvEscape);
    lines.push(line.join(","));
  }
  return lines.join("\n");
}

function buildSseResponse({ replyText, requestId, corsHeaders }) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(serializeSseData({ choices: [{ delta: { content: replyText } }] })),
      );
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...sseHeaders(),
      ...(corsHeaders || {}),
      "X-Request-Id": requestId,
    },
  });
}

async function generateSummary({ env, requestId, userText, assistantText, timeoutMs }) {
  if (!assistantText || !assistantText.trim()) return null;
  const keyManager = createKeyManager({ env, cooldownMs: 60_000 });
  const keySelection = keyManager.selectKeySlot();
  if (!keySelection) return null;

  const summaryPrompt = [
    {
      role: "system",
      content:
        "你是客服质检助手。请用简体中文总结客服回复的要点，保持客观简洁，不超过120字，只输出总结。",
    },
    {
      role: "user",
      content: `用户提问：${userText}\n\n客服回复：${assistantText}`,
    },
  ];

  const upstream = await fetchLongcatSse({
    env,
    requestId: `${requestId}_summary`,
    key: keySelection.key,
    timeoutMs: timeoutMs || 10_000,
    clientSignal: undefined,
    payload: {
      messages: summaryPrompt,
      stream: true,
      temperature: 0.2,
      max_tokens: 200,
    },
  });

  if (!upstream.ok || !upstream.body) return null;
  const summary = await collectSseText(upstream.body, { maxChars: 400 });
  return summary ? summary.trim() : null;
}

export default {
  async scheduled(event, env, ctx) {
    const days = Number(env.LOG_RETENTION_DAYS) || 14;
    if (!env.DB) return;
    const sql = buildCleanup(days);
    ctx.waitUntil(env.DB.prepare(sql).run());
  },

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

    if (path === "/admin/exports") {
      const url = new URL(request.url);
      const tokenParam = url.searchParams.get("token") || "";
      if (!isAdminAuthorized(request, env)) {
        return new Response(buildAdminPage({ tokenParam }), {
          status: 401,
          headers: { "Content-Type": "text/html; charset=utf-8", ...noIndexHeaders },
        });
      }
      return new Response(buildAdminPage({ tokenParam }), {
        status: 200,
        headers: { "Content-Type": "text/html; charset=utf-8", ...noIndexHeaders },
      });
    }

    if (path === "/admin/export.csv") {
      if (!isAdminAuthorized(request, env)) {
        return new Response("Unauthorized", { status: 401, headers: noIndexHeaders });
      }
      if (!env.DB) {
        return new Response("Database unavailable", { status: 503, headers: noIndexHeaders });
      }
      const url = new URL(request.url);
      const { startIso, endIso, limit, offset } = parseExportParams(url, env);
      const sql = `SELECT request_id, user_text, assistant_summary, rating, page_url, page_context, created_at
        FROM chat_logs
        WHERE created_at >= ? AND created_at <= ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`;
      const result = await env.DB.prepare(sql).bind(startIso, endIso, limit, offset).all();
      const csv = buildCsv(result?.results || []);
      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": "attachment; filename=chat_logs.csv",
          ...noIndexHeaders,
        },
      });
    }

    if (path === "/admin/summary") {
      if (!isAdminAuthorized(request, env)) {
        return new Response("Unauthorized", { status: 401, headers: noIndexHeaders });
      }
      if (!env.DB) {
        return new Response(JSON.stringify({ ok: false, error: "db_unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...noIndexHeaders },
        });
      }
      const url = new URL(request.url);
      const { startIso, endIso, intent, limit, offset } = parseSummaryParams(url);
      const { statsSql, statsArgs, summariesSql, summariesArgs } = buildSummaryQueries({
        startIso,
        endIso,
        intent,
        limit,
        offset,
      });
      const statsRow = await env.DB.prepare(statsSql).bind(...statsArgs).first();
      const summaries = await env.DB.prepare(summariesSql).bind(...summariesArgs).all();
      const summary = {
        total_chats: Number(statsRow?.total_chats || 0),
        unique_sessions: Number(statsRow?.unique_sessions || 0),
        unique_members: Number(statsRow?.unique_members || 0),
        unique_customers: Number(statsRow?.unique_customers || 0),
        intent_high: Number(statsRow?.intent_high || 0),
        intent_medium: Number(statsRow?.intent_medium || 0),
        intent_low: Number(statsRow?.intent_low || 0),
      };
      return new Response(
        JSON.stringify({
          ok: true,
          summary,
          summaries: summaries?.results || [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...noIndexHeaders },
        },
      );
    }

        if (path === "/api/leads") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { ...noIndexHeaders, ...(corsHeaders || {}) },
        });
      }
      const auth = request.headers.get("Authorization") || "";
      const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
      if (!env.SMART_CS_LEAD_TOKEN || token !== env.SMART_CS_LEAD_TOKEN) {
        return new Response("Unauthorized", {
          status: 401,
          headers: { ...noIndexHeaders, ...(corsHeaders || {}) },
        });
      }
      let payload;
      try {
        payload = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...(corsHeaders || {}) },
        });
      }
      if (!env.DB) {
        return new Response(JSON.stringify({ ok: false, error: "db_unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json", ...(corsHeaders || {}) },
        });
      }
      const lead = normalizeLead(payload || {});
      const saved = await insertLead(env.DB, lead);
      return new Response(JSON.stringify({ ok: true, lead: saved }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...(corsHeaders || {}) },
      });
    }

if (path === "/api/feedback") {
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { ...noIndexHeaders, ...(corsHeaders || {}) },
        });
      }
      let feedback;
      try {
        feedback = await request.json();
      } catch {
        return errorResponse({
          status: 400,
          error_code: "invalid_request",
          request_id: requestId,
          corsHeaders,
        });
      }
      const requestIdValue = typeof feedback?.request_id === "string" ? feedback.request_id : "";
      const rating = Number(feedback?.rating);
      if (!requestIdValue || !Number.isFinite(rating) || rating < 1 || rating > 5) {
        return errorResponse({
          status: 400,
          error_code: "invalid_request",
          request_id: requestId,
          corsHeaders,
        });
      }
      if (env.DB) {
        const sql = buildUpdateRating();
        const stmt = env.DB.prepare(sql).bind(rating, requestIdValue);
        ctx.waitUntil(stmt.run());
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...(corsHeaders || {}) },
      });
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
    const maxTokens = resolveMaxTokens(env);

    const rawMessages = Array.isArray(body?.messages) ? body.messages : null;
    if (!rawMessages) {
      return errorResponse({
        status: 400,
        error_code: "invalid_request",
        request_id: requestId,
        corsHeaders,
      });
    }

    const lastUser = [...rawMessages]
      .reverse()
      .find((m) => m && m.role === "user" && typeof m.content === "string");
    const lastUserTextRaw = lastUser?.content || "";
    const userText = stripContextHeader(lastUserTextRaw);
    const meta = normalizeMeta(body, lastUserTextRaw);

    // Insert System Prompt at the beginning
    const sysPrompt = getSystemPrompt();
    const ragEnabled = env.RAG_ENABLED === true || env.RAG_ENABLED === "true";
    const ragTopK = Number(env.RAG_TOP_K) || 3;
    const ragMinScore = Number(env.RAG_MIN_SCORE) || 0.75;

    let ragChunks = [];
    if (ragEnabled) {
      const lastUserText = lastUserTextRaw;
      try {
        ragChunks = await fetchRagChunks({ env, query: lastUserText, topK: ragTopK });
      } catch {
        ragChunks = [];
      }
    }

    const filteredRagChunks = ragChunks.filter(
      (chunk) => Number(chunk?.score || 0) >= ragMinScore,
    );

    const realtimeIntent = parseRealtimeIntent(lastUserTextRaw);
    if (realtimeIntent) {
      const realtime = await getRealtimeReply(realtimeIntent);
      if (realtime) {
        const replyText = realtime.text;
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(serializeSseData({ choices: [{ delta: { content: replyText } }] })),
            );
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });

        const isError = realtime.meta?.error === true;
        logJson(isError ? "warn" : "info", {
          request_id: requestId,
          origin: origin || null,
          path,
          status: 200,
          latency_ms: Date.now() - startMs,
          key_slot: null,
          attempt: 0,
          upstream_status: realtime.meta?.status || null,
          error_code: isError ? "realtime_fallback" : "realtime_reply",
          realtime_source: realtime.meta?.source || null,
          realtime_cached: realtime.meta?.cached ?? null,
          realtime_error: realtime.meta?.message || null,
        });

        const intent = classifyPurchaseIntent(userText);
        if (env.DB) {
          const sql = buildInsert();
          const stmt = env.DB.prepare(sql).bind(
            requestId,
            userText,
            replyText,
            replyText,
            null,
            meta.page_url,
            meta.page_context,
            meta.session_id,
            meta.member_id,
            intent.level,
            intent.reason,
            new Date().toISOString(),
          );
          ctx.waitUntil(stmt.run());
        }

        return new Response(stream, {
          status: 200,
          headers: {
            ...sseHeaders(),
            ...(corsHeaders || {}),
            "X-Request-Id": requestId,
          },
        });
      }
    }

    const supportIntent = classifySupportIntent(userText);
    if (supportIntent === "order") {
      const authHeader = request.headers.get("Authorization") || "";
      const hasAuth = authHeader.startsWith("Bearer ") && authHeader.length > 7;
      if (!hasAuth) {
        const replyText = buildLoginRequiredReply();
        return buildSseResponse({ replyText, requestId, corsHeaders });
      }

      const orderId = extractOrderId(userText);
      if (!orderId) {
        const replyText = buildOrderInfoRequestReply();
        return buildSseResponse({ replyText, requestId, corsHeaders });
      }

      const order = await fetchOrderDetail({
        env,
        authHeader,
        orderId,
      });

      const replyText = order ? formatOrderSummary(order) : buildOrderNotFoundReply();
      return buildSseResponse({ replyText, requestId, corsHeaders });
    }

    if (supportIntent === "policy" && filteredRagChunks.length === 0) {
      const replyText = buildPolicyFallbackReply();
      return buildSseResponse({ replyText, requestId, corsHeaders });
    }

    const leadFlowActive = shouldUseLeadFlow({ lastUserText: userText, messages: rawMessages });
    if (leadFlowActive) {
      let lead = {};
      let contactStatus = null;
      const keyManager = createKeyManager({ env, cooldownMs: 60_000 });
      const keySelection = keyManager.selectKeySlot();

      if (keySelection) {
        try {
          const leadPrompt = buildLeadExtractionPrompt(rawMessages, null);
          const leadUpstream = await fetchLongcatSse({
            env,
            requestId: `${requestId}_leadflow`,
            key: keySelection.key,
            timeoutMs: 10_000,
            clientSignal: request.signal,
            payload: {
              messages: leadPrompt,
              stream: true,
              temperature: 0.2,
              max_tokens: 300,
            },
          });
          if (leadUpstream.ok && leadUpstream.body) {
            const leadText = await collectSseText(leadUpstream.body, { maxChars: 1200 });
            lead = parseLeadExtraction(leadText);
          }
        } catch {
          lead = {};
        }
      }

      if (lead?.contact) {
        contactStatus = validateContact(lead.contact);
      }

      const nextStep = nextLeadQuestion({ lead, contactStatus });
      const replyText = nextStep.text;
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(serializeSseData({ choices: [{ delta: { content: replyText } }] })),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      logJson("info", {
        request_id: requestId,
        origin: origin || null,
        path,
        status: 200,
        latency_ms: Date.now() - startMs,
        key_slot: keySelection?.key_slot || null,
        attempt: 0,
        upstream_status: null,
        error_code: "lead_flow_reply",
        lead_step: nextStep.step,
      });

      const intent = classifyPurchaseIntent(userText);
      if (env.DB) {
        const sql = buildInsert();
        const stmt = env.DB.prepare(sql).bind(
          requestId,
          userText,
          replyText,
          replyText,
          null,
          meta.page_url,
          meta.page_context,
          meta.session_id,
          meta.member_id,
          intent.level,
          intent.reason,
          new Date().toISOString(),
        );
        ctx.waitUntil(stmt.run());
      }

      if (nextStep.step === "done" && contactStatus?.ok) {
        ctx.waitUntil(sendLeadEmail({ env, lead, meta, requestId }));
      }

      return new Response(stream, {
        status: 200,
        headers: {
          ...sseHeaders(),
          ...(corsHeaders || {}),
          "X-Request-Id": requestId,
        },
      });
    }

    const mergedSystemPrompt = shouldFallback(ragEnabled, filteredRagChunks)
      ? sysPrompt
      : mergeRagIntoSystemPrompt(sysPrompt, filteredRagChunks);

    const systemMessage = { role: "system", content: mergedSystemPrompt };
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
            max_tokens: maxTokens,
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

          const intent = classifyPurchaseIntent(userText);
          if (env.DB) {
            const sql = buildInsert();
            const stmt = env.DB.prepare(sql).bind(
              requestId,
              userText,
              "[streamed]",
              null,
              null,
              meta.page_url,
              meta.page_context,
              meta.session_id,
              meta.member_id,
              intent.level,
              intent.reason,
              new Date().toISOString(),
            );
            ctx.waitUntil(stmt.run());
          }

          const [clientStream, captureStream] = upstream.body.tee();
          const enforceEnglish = env.ENFORCE_ENGLISH === true || env.ENFORCE_ENGLISH === "true";
          const body = enforceEnglish
            ? guardEnglishStream({
                upstreamBody: clientStream,
                fallbackText: englishFallbackText(),
              })
            : clientStream;

          if (env.DB) {
            const captureTask = (async () => {
              const assistantText = await collectSseText(captureStream, { maxChars: 4000 });
              const summary = await generateSummary({
                env,
                requestId,
                userText,
                assistantText,
                timeoutMs,
              });
              if (!summary) return;
              const updateSql = buildUpdateSummary();
              await env.DB.prepare(updateSql).bind(summary, requestId).run();
            })();
            ctx.waitUntil(captureTask);
          }
          const leadTask = (async () => {
            const keyManager = createKeyManager({ env, cooldownMs: 60_000 });
            const keySelection = keyManager.selectKeySlot();
            if (!keySelection) return;
            const leadPrompt = buildLeadExtractionPrompt(rawMessages, null);
            const leadUpstream = await fetchLongcatSse({
              env,
              requestId: `${requestId}_lead`,
              key: keySelection.key,
              timeoutMs: 10_000,
              clientSignal: undefined,
              payload: {
                messages: leadPrompt,
                stream: true,
                temperature: 0.2,
                max_tokens: 300,
              },
            });
            if (!leadUpstream.ok || !leadUpstream.body) return;
            const leadText = await collectSseText(leadUpstream.body, { maxChars: 1200 });
            const lead = parseLeadExtraction(leadText);
            if (!isLeadComplete(lead)) return;
            const contactCheck = validateContact(lead.contact);
            if (!contactCheck.ok) return;
            await sendLeadEmail({ env, lead, meta, requestId });
          })();
          ctx.waitUntil(leadTask);

          return new Response(body, {
            status: 200,
            headers: {
              ...sseHeaders(),
              ...(corsHeaders || {}),
              "X-Request-Id": requestId,
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
