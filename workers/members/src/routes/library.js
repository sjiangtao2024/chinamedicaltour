import {
  createLibraryEntry,
  deleteLibraryEntry,
  getLibraryEntryBySlug,
  listLibraryEntries,
  updateLibraryEntry,
} from "../lib/library.js";
import { readJson, requireDb, requireLibraryAdmin } from "../lib/request.js";

const ARTICLE_TABLE = "library_articles";
const FAQ_TABLE = "library_faqs";
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;

function parseLimit(value, fallback) {
  const raw = Number(value ?? fallback);
  if (!Number.isFinite(raw)) {
    return fallback;
  }
  return Math.min(Math.max(raw, 1), MAX_LIMIT);
}

function parseOffset(value) {
  const raw = Number(value || 0);
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(raw, 0);
}

function normalizeText(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

function pickUpdate(body, key) {
  if (!body || !Object.prototype.hasOwnProperty.call(body, key)) {
    return undefined;
  }
  return normalizeText(body[key]);
}

function buildEntryPayload(body, now) {
  return {
    slug: normalizeText(body?.slug),
    title: normalizeText(body?.title),
    summary: normalizeText(body?.summary),
    content_md: normalizeText(body?.content_md),
    cover_image_url: normalizeText(body?.cover_image_url),
    category: normalizeText(body?.category),
    tags: normalizeText(body?.tags),
    locale: normalizeText(body?.locale) || "en",
    status: normalizeText(body?.status) || "draft",
    seo_title: normalizeText(body?.seo_title),
    seo_description: normalizeText(body?.seo_description),
    published_at: normalizeText(body?.published_at),
    created_at: now,
    updated_at: now,
  };
}

function buildUpdatePayload(body, now) {
  const payload = {
    slug: pickUpdate(body, "slug"),
    title: pickUpdate(body, "title"),
    summary: pickUpdate(body, "summary"),
    content_md: pickUpdate(body, "content_md"),
    cover_image_url: pickUpdate(body, "cover_image_url"),
    category: pickUpdate(body, "category"),
    tags: pickUpdate(body, "tags"),
    locale: pickUpdate(body, "locale"),
    status: pickUpdate(body, "status"),
    seo_title: pickUpdate(body, "seo_title"),
    seo_description: pickUpdate(body, "seo_description"),
    published_at: pickUpdate(body, "published_at"),
  };

  const filtered = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
  if (Object.keys(filtered).length === 0) {
    return filtered;
  }
  return { ...filtered, updated_at: now };
}

async function handleList({ request, env, url, respond, table, publicOnly }) {
  let db;
  try {
    db = requireDb(env);
  } catch (error) {
    return respond(500, { ok: false, error: "missing_db" });
  }

  const status = publicOnly ? "published" : normalizeText(url.searchParams.get("status"));
  const locale = normalizeText(url.searchParams.get("locale"));
  const category = normalizeText(url.searchParams.get("category"));
  const tag = normalizeText(url.searchParams.get("tag"));
  const search = normalizeText(url.searchParams.get("q"));
  const limit = parseLimit(url.searchParams.get("limit"), DEFAULT_LIMIT);
  const offset = parseOffset(url.searchParams.get("offset"));

  const { results } = await listLibraryEntries(db, {
    table,
    status,
    locale,
    category,
    tag,
    search,
    limit,
    offset,
  });

  return respond(200, { ok: true, items: results || [] });
}

async function handleAdminList({ request, env, url, respond, table }) {
  const auth = await requireLibraryAdmin(request, env);
  if (!auth.ok) {
    return respond(auth.status, { ok: false, error: auth.error });
  }
  return handleList({ request, env, url, respond, table, publicOnly: false });
}

async function handleSlug({ env, url, respond, table }) {
  let db;
  try {
    db = requireDb(env);
  } catch (error) {
    return respond(500, { ok: false, error: "missing_db" });
  }

  const slug = url.pathname.split("/").pop();
  const locale = normalizeText(url.searchParams.get("locale"));

  const entry = await getLibraryEntryBySlug(db, {
    table,
    slug,
    status: "published",
    locale,
  });

  if (!entry) {
    return respond(404, { ok: false, error: "not_found" });
  }

  return respond(200, { ok: true, item: entry });
}

async function handleAdminCreate({ request, env, respond, table }) {
  const auth = await requireLibraryAdmin(request, env);
  if (!auth.ok) {
    return respond(auth.status, { ok: false, error: auth.error });
  }

  let db;
  try {
    db = requireDb(env);
  } catch (error) {
    return respond(500, { ok: false, error: "missing_db" });
  }

  const body = await readJson(request);
  const now = new Date().toISOString();
  const entry = buildEntryPayload(body, now);

  if (!entry.slug || !entry.title || !entry.content_md) {
    return respond(400, { ok: false, error: "missing_required_fields" });
  }

  const id = crypto.randomUUID();

  await createLibraryEntry(db, {
    table,
    entry: {
      id,
      ...entry,
    },
  });

  return respond(200, { ok: true, id });
}

async function handleAdminUpdate({ request, env, respond, table, id }) {
  const auth = await requireLibraryAdmin(request, env);
  if (!auth.ok) {
    return respond(auth.status, { ok: false, error: auth.error });
  }

  let db;
  try {
    db = requireDb(env);
  } catch (error) {
    return respond(500, { ok: false, error: "missing_db" });
  }

  const body = await readJson(request);
  const now = new Date().toISOString();
  const updates = buildUpdatePayload(body, now);

  const updated = await updateLibraryEntry(db, {
    table,
    id,
    updates,
  });

  if (!updated) {
    return respond(400, { ok: false, error: "no_updates" });
  }

  return respond(200, { ok: true });
}

async function handleAdminDelete({ request, env, respond, table, id }) {
  const auth = await requireLibraryAdmin(request, env);
  if (!auth.ok) {
    return respond(auth.status, { ok: false, error: auth.error });
  }

  let db;
  try {
    db = requireDb(env);
  } catch (error) {
    return respond(500, { ok: false, error: "missing_db" });
  }

  await deleteLibraryEntry(db, { table, id });
  return respond(200, { ok: true });
}

export async function handleLibrary({ request, env, url, respond }) {
  if (url.pathname === "/api/library/articles" && request.method === "GET") {
    return handleList({ request, env, url, respond, table: ARTICLE_TABLE, publicOnly: true });
  }

  if (url.pathname.startsWith("/api/library/articles/") && request.method === "GET") {
    return handleSlug({ env, url, respond, table: ARTICLE_TABLE });
  }

  if (url.pathname === "/api/library/faqs" && request.method === "GET") {
    return handleList({ request, env, url, respond, table: FAQ_TABLE, publicOnly: true });
  }

  if (url.pathname === "/api/admin/library/articles" && request.method === "GET") {
    return handleAdminList({ request, env, url, respond, table: ARTICLE_TABLE });
  }

  if (url.pathname === "/api/admin/library/faqs" && request.method === "GET") {
    return handleAdminList({ request, env, url, respond, table: FAQ_TABLE });
  }

  if (url.pathname === "/api/admin/library/articles" && request.method === "POST") {
    return handleAdminCreate({ request, env, respond, table: ARTICLE_TABLE });
  }

  if (url.pathname === "/api/admin/library/faqs" && request.method === "POST") {
    return handleAdminCreate({ request, env, respond, table: FAQ_TABLE });
  }

  const adminArticleMatch = url.pathname.match(/^\/api\/admin\/library\/articles\/([^/]+)$/);
  if (adminArticleMatch && request.method === "PATCH") {
    return handleAdminUpdate({ request, env, respond, table: ARTICLE_TABLE, id: adminArticleMatch[1] });
  }
  if (adminArticleMatch && request.method === "DELETE") {
    return handleAdminDelete({ request, env, respond, table: ARTICLE_TABLE, id: adminArticleMatch[1] });
  }

  const adminFaqMatch = url.pathname.match(/^\/api\/admin\/library\/faqs\/([^/]+)$/);
  if (adminFaqMatch && request.method === "PATCH") {
    return handleAdminUpdate({ request, env, respond, table: FAQ_TABLE, id: adminFaqMatch[1] });
  }
  if (adminFaqMatch && request.method === "DELETE") {
    return handleAdminDelete({ request, env, respond, table: FAQ_TABLE, id: adminFaqMatch[1] });
  }

  return null;
}
