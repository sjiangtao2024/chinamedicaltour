import { requireAuth, requireDb, readJson } from "../lib/request.js";
import {
  findAgreementByOrderTerms,
  findLatestAgreementByOrder,
  insertAgreement,
} from "../lib/agreements.js";
import { findOrderByUser } from "../lib/orders.js";

const getClientIp = (request) => {
  const cfIp = request.headers.get("CF-Connecting-IP");
  if (cfIp) {
    return cfIp;
  }
  const forwarded = request.headers.get("X-Forwarded-For");
  if (!forwarded) {
    return "";
  }
  return forwarded.split(",")[0].trim();
};

export async function handleAgreements({ request, env, url, respond }) {
  if (!url.pathname.startsWith("/api/agreements")) {
    return null;
  }
  if (url.pathname !== "/api/agreements") {
    return respond(404, { ok: false, error: "not_found" });
  }

  const auth = await requireAuth(request, env);
  if (!auth.ok) {
    return respond(auth.status, { ok: false, error: auth.error });
  }

  if (request.method === "GET") {
    const orderId = url.searchParams.get("order_id") || "";
    if (!orderId) {
      return respond(400, { ok: false, error: "missing_order_id" });
    }

    let db;
    try {
      db = requireDb(env);
    } catch (error) {
      return respond(500, { ok: false, error: "missing_db" });
    }

    const order = await findOrderByUser(db, orderId, auth.userId);
    if (!order) {
      return respond(404, { ok: false, error: "order_not_found" });
    }

    const agreement = await findLatestAgreementByOrder(db, orderId);
    return respond(200, { ok: true, agreement: agreement || null });
  }

  if (request.method !== "POST") {
    return respond(405, { ok: false, error: "method_not_allowed" });
  }

  const body = await readJson(request);
  const orderId = body?.order_id ? String(body.order_id).trim() : "";
  const termsVersion = body?.terms_version ? String(body.terms_version).trim() : "";
  const termsDocId = body?.terms_doc_id ? String(body.terms_doc_id).trim() : "";
  const acceptedAt = body?.accepted_at ? String(body.accepted_at).trim() : "";
  const digitalAcceptedAt = body?.digital_accepted_at
    ? String(body.digital_accepted_at).trim()
    : "";
  const methodsAcceptedAt = body?.methods_accepted_at
    ? String(body.methods_accepted_at).trim()
    : "";
  const userAgent = body?.user_agent ? String(body.user_agent).trim() : "";
  const timeZone = body?.time_zone ? String(body.time_zone).trim() : "";

  if (!orderId || !termsVersion || !termsDocId || !acceptedAt) {
    return respond(400, { ok: false, error: "missing_fields" });
  }

  let db;
  try {
    db = requireDb(env);
  } catch (error) {
    return respond(500, { ok: false, error: "missing_db" });
  }

  const order = await findOrderByUser(db, orderId, auth.userId);
  if (!order) {
    return respond(404, { ok: false, error: "order_not_found" });
  }
  if (order.terms_version && order.terms_version !== termsVersion) {
    return respond(400, { ok: false, error: "terms_version_mismatch" });
  }

  const existing = await findAgreementByOrderTerms(db, { orderId, termsVersion });
  if (existing) {
    return respond(200, { ok: true, agreement: existing, reused: true });
  }

  const agreement = await insertAgreement(db, {
    userId: auth.userId,
    orderId,
    termsVersion,
    termsDocId,
    acceptedAt,
    digitalAcceptedAt,
    methodsAcceptedAt,
    userAgent,
    timeZone,
    ipAddress: getClientIp(request),
  });

  return respond(201, { ok: true, agreement });
}
