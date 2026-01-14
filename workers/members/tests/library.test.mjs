import assert from "node:assert/strict";
import {
  listLibraryEntries,
  getLibraryEntryBySlug,
  createLibraryEntry,
  updateLibraryEntry,
  deleteLibraryEntry,
} from "../src/lib/library.js";

const listCalls = [];
const listDb = {
  prepare(sql) {
    return {
      bind(...args) {
        listCalls.push({ sql, args });
        return {
          all() {
            return { results: [{ id: "article-1" }] };
          },
        };
      },
    };
  },
};

const listResult = await listLibraryEntries(listDb, {
  table: "library_articles",
  status: "published",
  locale: "en",
  category: "guides",
  tag: "wellness",
  search: "tcm",
  limit: 10,
  offset: 5,
});

assert.equal(listResult.results.length, 1);
assert.equal(listCalls.length, 1);
const { sql: listSql, args: listArgs } = listCalls[0];
assert.match(listSql, /FROM library_articles/);
assert.match(listSql, /status = \?/);
assert.match(listSql, /locale = \?/);
assert.match(listSql, /category = \?/);
assert.match(listSql, /tags LIKE \?/);
assert.match(listSql, /title LIKE \?/);
assert.match(listSql, /summary LIKE \?/);
assert.match(listSql, /LIMIT \?/);
assert.match(listSql, /OFFSET \?/);
assert.equal(listArgs[0], "published");
assert.equal(listArgs[1], "en");
assert.equal(listArgs[2], "guides");
assert.equal(listArgs[3], "%wellness%");
assert.equal(listArgs[4], "%tcm%");
assert.equal(listArgs[5], "%tcm%");
assert.equal(listArgs[6], 10);
assert.equal(listArgs[7], 5);

const slugCalls = [];
const slugDb = {
  prepare(sql) {
    return {
      bind(...args) {
        slugCalls.push({ sql, args });
        return {
          first() {
            return { id: "article-9", slug: "intro" };
          },
        };
      },
    };
  },
};

const slugResult = await getLibraryEntryBySlug(slugDb, {
  table: "library_articles",
  slug: "intro",
  status: "published",
  locale: "en",
});

assert.equal(slugResult.id, "article-9");
assert.equal(slugCalls.length, 1);
const { sql: slugSql, args: slugArgs } = slugCalls[0];
assert.match(slugSql, /FROM library_articles/);
assert.match(slugSql, /slug = \?/);
assert.match(slugSql, /status = \?/);
assert.match(slugSql, /locale = \?/);
assert.equal(slugArgs[0], "intro");
assert.equal(slugArgs[1], "published");
assert.equal(slugArgs[2], "en");

const createCalls = [];
const createDb = {
  prepare(sql) {
    return {
      bind(...args) {
        createCalls.push({ sql, args });
        return {
          run() {
            return { success: true };
          },
        };
      },
    };
  },
};

await createLibraryEntry(createDb, {
  table: "library_articles",
  entry: {
    id: "article-2",
    slug: "getting-started",
    title: "Getting Started",
    summary: "Intro",
    content_md: "Hello",
    cover_image_url: "https://img",
    category: "guides",
    tags: "tcm,travel",
    locale: "en",
    status: "draft",
    seo_title: "SEO",
    seo_description: "Desc",
    published_at: null,
    created_at: "2026-01-14T00:00:00Z",
    updated_at: "2026-01-14T00:00:00Z",
  },
});

assert.equal(createCalls.length, 1);
const { sql: createSql } = createCalls[0];
assert.match(createSql, /INSERT INTO library_articles/);

const updateCalls = [];
const updateDb = {
  prepare(sql) {
    return {
      bind(...args) {
        updateCalls.push({ sql, args });
        return {
          run() {
            return { success: true };
          },
        };
      },
    };
  },
};

await updateLibraryEntry(updateDb, {
  table: "library_articles",
  id: "article-2",
  updates: {
    title: "Updated",
    summary: "Updated summary",
    updated_at: "2026-01-14T01:00:00Z",
  },
});

assert.equal(updateCalls.length, 1);
const { sql: updateSql, args: updateArgs } = updateCalls[0];
assert.match(updateSql, /UPDATE library_articles/);
assert.match(updateSql, /title = \?/);
assert.match(updateSql, /summary = \?/);
assert.match(updateSql, /updated_at = \?/);
assert.match(updateSql, /WHERE id = \?/);
assert.equal(updateArgs[updateArgs.length - 1], "article-2");

const deleteCalls = [];
const deleteDb = {
  prepare(sql) {
    return {
      bind(...args) {
        deleteCalls.push({ sql, args });
        return {
          run() {
            return { success: true };
          },
        };
      },
    };
  },
};

await deleteLibraryEntry(deleteDb, { table: "library_articles", id: "article-3" });

assert.equal(deleteCalls.length, 1);
const { sql: deleteSql, args: deleteArgs } = deleteCalls[0];
assert.match(deleteSql, /DELETE FROM library_articles/);
assert.equal(deleteArgs[0], "article-3");
