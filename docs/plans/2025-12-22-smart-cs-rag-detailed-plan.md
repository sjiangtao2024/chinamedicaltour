# 智能客服 RAG 迁移 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在不影响线上服务的前提下，将现有 smart-cs 平滑迁移到 RAG + Vectorize，并新增 D1 聊天记录（10–30 天）与 ops 上传后台。

**Architecture:** 新增独立 ops Worker 承担登录与知识上传，上传后在同一 Worker 内触发向量重建并写入 Vectorize；smart-cs 侧加入检索与提示词拼接逻辑，保留旧提示词兜底。聊天记录写入 D1，并通过 scheduled 事件每日清理。

**Tech Stack:** Cloudflare Workers, R2, Vectorize, Workers AI (embeddings), D1, Wrangler.

---

### Task 1: 新增 ops Worker 基础结构

**Files:**
- Create: `workers/ops/wrangler.jsonc`
- Create: `workers/ops/package.json`
- Create: `workers/ops/src/index.js`
- Create: `workers/ops/src/ui.html`

**Step 1: 写一个最小失败测试（token 校验函数）**
Create `workers/ops/tests/auth.test.mjs`:
```js
import assert from "node:assert/strict";
import { isValidToken } from "../src/lib/auth.js";

assert.equal(isValidToken("", "secret"), false);
assert.equal(isValidToken("secret", "secret"), true);
```
Expected: 运行会失败（因为 `isValidToken` 未定义）。

**Step 2: 运行测试确认失败**
Run: `node workers/ops/tests/auth.test.mjs`
Expected: FAIL with "Cannot find module ../src/lib/auth.js" or "isValidToken is not defined".

**Step 3: 写最小实现**
Create `workers/ops/src/lib/auth.js`:
```js
export function isValidToken(token, expected) {
  return Boolean(token) && token === expected;
}
```

**Step 4: 运行测试确认通过**
Run: `node workers/ops/tests/auth.test.mjs`
Expected: PASS with no output.

**Step 5: 提交**
```bash
git add workers/ops/tests/auth.test.mjs workers/ops/src/lib/auth.js
git commit -m "feat(ops): add token validation helper"
```

---

### Task 2: ops Worker HTTP 入口与登录页面

**Files:**
- Modify: `workers/ops/src/index.js`
- Create: `workers/ops/src/ui.html`

**Step 1: 写一个最小失败测试（返回 HTML）**
Create `workers/ops/tests/ui.test.mjs`:
```js
import assert from "node:assert/strict";
import { getUiHtml } from "../src/ui.js";

const html = getUiHtml();
assert.match(html, /Admin Token/i);
```
Expected: 运行会失败（因为 `getUiHtml` 未定义）。

**Step 2: 运行测试确认失败**
Run: `node workers/ops/tests/ui.test.mjs`
Expected: FAIL with "Cannot find module ../src/ui.js".

**Step 3: 写最小实现**
Create `workers/ops/src/ui.js`:
```js
import ui from "./ui.html";

export function getUiHtml() {
  return ui;
}
```
Create `workers/ops/src/ui.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Ops Knowledge Editor</title>
  </head>
  <body>
    <h1>Ops Knowledge Editor</h1>
    <label>Admin Token</label>
    <input id="token" type="password" />
    <button id="login">Login</button>
    <div id="app" hidden></div>
  </body>
</html>
```

**Step 4: 运行测试确认通过**
Run: `node workers/ops/tests/ui.test.mjs`
Expected: PASS with no output.

**Step 5: 提交**
```bash
git add workers/ops/src/ui.html workers/ops/src/ui.js workers/ops/tests/ui.test.mjs
git commit -m "feat(ops): add basic login UI"
```

---

### Task 3: ops 上传 API 与 R2 写入

**Files:**
- Modify: `workers/ops/src/index.js`
- Create: `workers/ops/src/lib/r2.js`
- Create: `workers/ops/tests/upload.test.mjs`

**Step 1: 写失败测试（解析请求体）**
```js
import assert from "node:assert/strict";
import { parseUpload } from "../src/lib/upload.js";

assert.throws(() => parseUpload({}), /invalid_request/);
assert.deepEqual(parseUpload({ content_markdown: "# A" }), {
  content_markdown: "# A",
  note: null,
  version: null,
});
```
Expected: FAIL（模块不存在）。

**Step 2: 运行测试确认失败**
Run: `node workers/ops/tests/upload.test.mjs`
Expected: FAIL.

**Step 3: 写最小实现**
Create `workers/ops/src/lib/upload.js`:
```js
export function parseUpload(body) {
  if (!body || typeof body.content_markdown !== "string") {
    throw new Error("invalid_request");
  }
  return {
    content_markdown: body.content_markdown,
    note: typeof body.note === "string" ? body.note : null,
    version: typeof body.version === "string" ? body.version : null,
  };
}
```

**Step 4: 运行测试确认通过**
Run: `node workers/ops/tests/upload.test.mjs`
Expected: PASS.

**Step 5: 提交**
```bash
git add workers/ops/src/lib/upload.js workers/ops/tests/upload.test.mjs
git commit -m "feat(ops): add upload parsing"
```

---

### Task 4: 上传后触发向量重建（在 ops Worker 内异步）

**Files:**
- Create: `workers/ops/src/lib/chunking.js`
- Create: `workers/ops/src/lib/embeddings.js`
- Create: `workers/ops/src/lib/vectorize.js`
- Modify: `workers/ops/src/index.js`
- Create: `workers/ops/tests/chunking.test.mjs`

**Step 1: 写失败测试（分块）**
```js
import assert from "node:assert/strict";
import { chunkText } from "../src/lib/chunking.js";

const chunks = chunkText("A\n\nB\n\nC", { maxChars: 4 });
assert.deepEqual(chunks, ["A", "B", "C"]);
```
Expected: FAIL.

**Step 2: 运行测试确认失败**
Run: `node workers/ops/tests/chunking.test.mjs`
Expected: FAIL.

**Step 3: 写最小实现**
Create `workers/ops/src/lib/chunking.js`:
```js
export function chunkText(text, { maxChars }) {
  const blocks = text.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean);
  const chunks = [];
  for (const block of blocks) {
    if (block.length <= maxChars) {
      chunks.push(block);
      continue;
    }
    for (let i = 0; i < block.length; i += maxChars) {
      chunks.push(block.slice(i, i + maxChars));
    }
  }
  return chunks;
}
```

**Step 4: 运行测试确认通过**
Run: `node workers/ops/tests/chunking.test.mjs`
Expected: PASS.

**Step 5: 提交**
```bash
git add workers/ops/src/lib/chunking.js workers/ops/tests/chunking.test.mjs
git commit -m "feat(ops): add simple chunking"
```

---

### Task 5: smart-cs 引入 RAG 检索（影子模式）

**Files:**
- Modify: `workers/smart-cs/src/index.js`
- Create: `workers/smart-cs/src/lib/rag.js`
- Create: `workers/smart-cs/tests/rag-prompt.test.mjs`

**Step 1: 写失败测试（拼接提示词）**
```js
import assert from "node:assert/strict";
import { buildRagContext } from "../src/lib/rag.js";

const ctx = buildRagContext(["A", "B"]);
assert.match(ctx, /A/);
assert.match(ctx, /B/);
```
Expected: FAIL.

**Step 2: 运行测试确认失败**
Run: `node workers/smart-cs/tests/rag-prompt.test.mjs`
Expected: FAIL.

**Step 3: 写最小实现**
```js
export function buildRagContext(chunks) {
  if (!chunks || chunks.length === 0) return "";
  return `\n\n[KNOWLEDGE]\n${chunks.map((c, i) => `(${i + 1}) ${c}`).join("\n")}`;
}
```

**Step 4: 运行测试确认通过**
Run: `node workers/smart-cs/tests/rag-prompt.test.mjs`
Expected: PASS.

**Step 5: 提交**
```bash
git add workers/smart-cs/src/lib/rag.js workers/smart-cs/tests/rag-prompt.test.mjs
git commit -m "feat(smart-cs): add rag context builder"
```

---

### Task 6: smart-cs 注入检索结果（正式启用 + 兜底）

**Files:**
- Modify: `workers/smart-cs/src/index.js`
- Modify: `workers/smart-cs/wrangler.jsonc`

**Step 1: 写失败测试（降级逻辑）**
Create `workers/smart-cs/tests/rag-fallback.test.mjs`:
```js
import assert from "node:assert/strict";
import { shouldFallback } from "../src/lib/rag.js";

assert.equal(shouldFallback(false, []), true);
assert.equal(shouldFallback(true, ["A"]), false);
```
Expected: FAIL.

**Step 2: 运行测试确认失败**
Run: `node workers/smart-cs/tests/rag-fallback.test.mjs`
Expected: FAIL.

**Step 3: 写最小实现**
```js
export function shouldFallback(ragEnabled, chunks) {
  return !ragEnabled || !chunks || chunks.length === 0;
}
```

**Step 4: 运行测试确认通过**
Run: `node workers/smart-cs/tests/rag-fallback.test.mjs`
Expected: PASS.

**Step 5: 提交**
```bash
git add workers/smart-cs/src/lib/rag.js workers/smart-cs/tests/rag-fallback.test.mjs
git commit -m "feat(smart-cs): add rag fallback helper"
```

---

### Task 7: D1 聊天记录存储与清理

**Files:**
- Create: `workers/smart-cs/migrations/0001_create_chat_logs.sql`
- Modify: `workers/smart-cs/src/index.js`
- Modify: `workers/smart-cs/wrangler.jsonc`

**Step 1: 写失败测试（SQL 生成）**
Create `workers/smart-cs/tests/chat-log.test.mjs`:
```js
import assert from "node:assert/strict";
import { buildInsert } from "../src/lib/chat-log.js";

const sql = buildInsert();
assert.match(sql, /insert into chat_logs/i);
```
Expected: FAIL.

**Step 2: 运行测试确认失败**
Run: `node workers/smart-cs/tests/chat-log.test.mjs`
Expected: FAIL.

**Step 3: 写最小实现**
Create `workers/smart-cs/src/lib/chat-log.js`:
```js
export function buildInsert() {
  return "INSERT INTO chat_logs (request_id, user_text, assistant_text, created_at) VALUES (?, ?, ?, ?)";
}
```

**Step 4: 运行测试确认通过**
Run: `node workers/smart-cs/tests/chat-log.test.mjs`
Expected: PASS.

**Step 5: 提交**
```bash
git add workers/smart-cs/src/lib/chat-log.js workers/smart-cs/tests/chat-log.test.mjs
git commit -m "feat(smart-cs): add chat log helper"
```

---

### Task 8: Scheduled 清理任务

**Files:**
- Modify: `workers/smart-cs/src/index.js`

**Step 1: 写失败测试（清理 SQL）**
Create `workers/smart-cs/tests/cleanup.test.mjs`:
```js
import assert from "node:assert/strict";
import { buildCleanup } from "../src/lib/chat-log.js";

const sql = buildCleanup(7);
assert.match(sql, /delete from chat_logs/i);
assert.match(sql, /-7/);
```
Expected: FAIL.

**Step 2: 运行测试确认失败**
Run: `node workers/smart-cs/tests/cleanup.test.mjs`
Expected: FAIL.

**Step 3: 写最小实现**
```js
export function buildCleanup(days) {
  return `DELETE FROM chat_logs WHERE created_at < datetime('now', '-${days} days')`;
}
```

**Step 4: 运行测试确认通过**
Run: `node workers/smart-cs/tests/cleanup.test.mjs`
Expected: PASS.

**Step 5: 提交**
```bash
git add workers/smart-cs/src/lib/chat-log.js workers/smart-cs/tests/cleanup.test.mjs
git commit -m "feat(smart-cs): add cleanup query"
```

---

## 验证步骤（人工）
- `wrangler dev` 启动 ops Worker，验证登录与上传。
- 上传知识后确认 Vectorize 可检索。
- smart-cs 影子模式日志正常。
- RAG 开关开启后，回答依然稳定。
- D1 写入与清理任务可执行。

## 备注
- 初期向量重建在 ops Worker 内异步执行（`ctx.waitUntil`），未来可迁移到 Workflows。
- 测试采用 `node` 直接运行，当前仓库未集成测试框架。
