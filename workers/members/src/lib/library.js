const LIBRARY_TABLES = new Set(["library_articles", "library_faqs"]);
const LIBRARY_COLUMNS = [
  "id",
  "slug",
  "title",
  "summary",
  "content_md",
  "cover_image_url",
  "category",
  "tags",
  "locale",
  "status",
  "seo_title",
  "seo_description",
  "published_at",
  "created_at",
  "updated_at",
];

function assertLibraryTable(table) {
  if (!LIBRARY_TABLES.has(table)) {
    throw new Error("invalid_library_table");
  }
  return table;
}

function buildLike(value) {
  return `%${value}%`;
}

export async function listLibraryEntries(
  db,
  { table, status, locale, category, tag, search, limit = 20, offset = 0 }
) {
  const safeTable = assertLibraryTable(table);
  const conditions = [];
  const args = [];

  if (status) {
    conditions.push("status = ?");
    args.push(status);
  }
  if (locale) {
    conditions.push("locale = ?");
    args.push(locale);
  }
  if (category) {
    conditions.push("category = ?");
    args.push(category);
  }
  if (tag) {
    conditions.push("tags LIKE ?");
    args.push(buildLike(tag));
  }
  if (search) {
    conditions.push("(title LIKE ? OR summary LIKE ?)");
    args.push(buildLike(search), buildLike(search));
  }

  let sql = `SELECT * FROM ${safeTable}`;
  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(" AND ")}`;
  }
  sql += " ORDER BY COALESCE(published_at, updated_at) DESC LIMIT ? OFFSET ?";
  args.push(limit, offset);

  return db.prepare(sql).bind(...args).all();
}

export async function getLibraryEntryBySlug(db, { table, slug, status, locale }) {
  const safeTable = assertLibraryTable(table);
  const conditions = ["slug = ?"];
  const args = [slug];

  if (status) {
    conditions.push("status = ?");
    args.push(status);
  }
  if (locale) {
    conditions.push("locale = ?");
    args.push(locale);
  }

  const sql = `SELECT * FROM ${safeTable} WHERE ${conditions.join(" AND ")} LIMIT 1`;
  return db.prepare(sql).bind(...args).first();
}

export async function createLibraryEntry(db, { table, entry }) {
  const safeTable = assertLibraryTable(table);
  const placeholders = LIBRARY_COLUMNS.map(() => "?").join(", ");
  const sql = `INSERT INTO ${safeTable} (${LIBRARY_COLUMNS.join(", ")}) VALUES (${placeholders})`;
  const values = LIBRARY_COLUMNS.map((column) => entry?.[column] ?? null);
  return db.prepare(sql).bind(...values).run();
}

export async function updateLibraryEntry(db, { table, id, updates }) {
  const safeTable = assertLibraryTable(table);
  const allowed = new Set(LIBRARY_COLUMNS.filter((column) => column !== "id" && column !== "created_at"));
  const fields = Object.keys(updates || {}).filter((key) => allowed.has(key));
  if (fields.length === 0) {
    return null;
  }

  const assignments = fields.map((field) => `${field} = ?`);
  const values = fields.map((field) => updates[field]);

  const sql = `UPDATE ${safeTable} SET ${assignments.join(", ")} WHERE id = ?`;
  return db.prepare(sql).bind(...values, id).run();
}

export async function deleteLibraryEntry(db, { table, id }) {
  const safeTable = assertLibraryTable(table);
  return db.prepare(`DELETE FROM ${safeTable} WHERE id = ?`).bind(id).run();
}
