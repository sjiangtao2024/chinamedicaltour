---
description: "Task list for Smart CS v1 end-to-end MVP"
---

# Tasks: Smart CS v1 (Worker + Chat Widget)

**Input**: Design documents from `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/`  
**Prerequisites**: `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/plan.md`, `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/spec.md`  
**Contracts**: `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/contracts/api-chat.md`, `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/contracts/error-codes.md`  
**Source of truth**: `docs/plan-cs.md`, `docs/architecture-design-cs.md`, `docs/deployment-guide-cs.md`, `docs/development-specs-cs.md`

**TDD-lite rule**: 每个实现任务前必须先有对应的可重复验证步骤（优先 `curl`/脚本），并在任务完成标准中写明。

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Each task line includes exact file paths and a “Done when …” completion check.

---

## Phase 1：Worker 基础（路由/CORS/SSE骨架/日志/错误响应）

### Tests / Verification (write first)

- [ ] T001 [US3] Add local curl verification script skeleton at `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/scripts/verify-local.sh` (Done when: with `npx wrangler dev` running, script covers OPTIONS allowed-origin, POST forbidden-origin=403, POST SSE without Origin, POST SSE with allowed Origin)
- [ ] T002 [US3] Document how to run local checks in `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/quickstart.md` (Done when: includes `npx wrangler dev` + running `bash /mnt/c/dev_code/chinamedicaltour/workers/smart-cs/scripts/verify-local.sh`)

### Implementation (foundation)

- [ ] T003 [US3] Implement strict CORS whitelist + OPTIONS preflight in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/cors.js` and wire in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js` (Done when: preflight with allowed Origin returns 204 + ACAO; forbidden Origin returns 403; no Origin allowed for curl)
- [ ] T004 [US1] Replace Hello World with `/api/chat` route skeleton returning SSE `data:` + `[DONE]` in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js` and SSE headers in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/sse.js` (Done when: `curl -N` sees at least 2 `data:` events and a final `data: [DONE]`)
- [ ] T005 [US2] Implement non-200 JSON error response helper in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/errors.js` (Done when: invalid JSON body returns `400` and JSON `{error_code,message,request_id}`)
- [ ] T006 [US3] Add `request_id` generation + structured JSON logging helper in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/logger.js` and emit request summary log in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js` (Done when: logs include `request_id, origin, path, status, latency_ms, key_slot, attempt, upstream_status, error_code` and never include raw API keys)
- [ ] T007 [US2] Enforce request validation for `/api/chat` body shape in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js` (Done when: missing/invalid `messages` returns `400 invalid_request` JSON; `stream=false` still results in SSE streaming success)

---

## Phase 2：Longcat 集成（KeyManager、重试、超时、SSE转发、截断）

### Tests / Verification (write first)

- [ ] T008 [US2] Extend `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/scripts/verify-local.sh` to include error mapping checks (Done when: script includes cases that assert JSON error for `400/429/503/504` with correct `message` per `docs/plan-cs.md`)
- [ ] T009 [US1] Add mock directives for local simulation (`__mock_429`, `__mock_500`, `__mock_timeout`) in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/longcat-client.js` (Done when: sending those tokens makes Worker produce the matching non-200 response and logs show retry attempts)

### Implementation

- [ ] T010 [US3] Implement instance-memory key rotation + cooldown (TTL 60s) in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/key-manager.js` (Done when: repeated mocked 429 marks a slot cooled down and next attempt uses a different `key_slot` in logs)
- [ ] T011 [US2] Implement retry loop (max 3 attempts) + cooldown marking on 429/5xx/timeout in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js` (Done when: with `__mock_429`, logs show `attempt` increments up to 3 and returns `429 rate_limit_exceeded` JSON after retries)
- [ ] T012 [US2] Implement upstream timeout via `TIMEOUT_MS` with abort, mapping to `504 gateway_timeout` in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/longcat-client.js` and `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js` (Done when: `__mock_timeout` yields `504` JSON and logs show `error_code=gateway_timeout`)
- [ ] T013 [US1] Implement upstream request payload + auth injection (`env.LONGCAT_API_ENDPOINT`, `env.MODEL_NAME`, `LONGCAT_API_KEYS`) in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/longcat-client.js` (Done when: in non-mock mode, request includes Authorization header and `stream:true` in JSON body; in mock mode, Worker still streams SSE)
- [ ] T014 [US1] Implement SSE passthrough (upstream body → client response) in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js` using `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/sse.js` (Done when: `curl -N` receives OpenAI-style `data: {...}` lines and ends with `[DONE]`)
- [ ] T015 [US1] Implement truncation strategy (>6000 chars, keep system, remove oldest user+assistant pairs) in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/truncate.js` and apply before upstream call in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js` (Done when: sending a large history still succeeds and logs show no crash; manual inspection confirms system prompt retained)
- [ ] T016 [US3] Ensure system prompt includes medical disclaimer + non-diagnosis policy and language-following behavior in `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/truncate.js` (Done when: first assistant response (mock) includes disclaimer text; zh input yields zh disclaimer, en input yields en disclaimer)

---

## Phase 3：前端 widget（CSS/JS、流式解析、错误/重试、嵌入 index.html）

### Tests / Verification (write first)

- [ ] T017 [US1] Add browser manual test checklist to `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/quickstart.md` (Done when: includes steps to open `index.html`, send message, observe `Connecting/Awaiting First Byte/Streaming`, and verify auto-scroll)
- [ ] T018 [US2] Add failure-mode manual checklist (timeout/429/offline) to `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/quickstart.md` (Done when: includes expected UI text per `docs/plan-cs.md` and “重试/重新发送” expectations)

### Implementation

- [ ] T019 [US1] Create widget CSS with BEM naming in `/mnt/c/dev_code/chinamedicaltour/assets/css/chat-widget.css` (Done when: widget renders fixed bottom-right, panel layout, message bubbles readable)
- [ ] T020 [US1] Create widget DOM + a11y basics (aria-label, focus management, Esc close) in `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js` (Done when: toggle opens/closes; Esc closes; open focuses input; close returns focus to toggle)
- [ ] T021 [US1] Implement fetch+ReadableStream SSE parser in `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js` (Done when: streaming appends assistant message incrementally and ends cleanly on `[DONE]`)
- [ ] T022 [US1] Implement state machine and status UI (`Connecting`, `Awaiting First Byte`, `Streaming`, `Error`) in `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js` (Done when: status text updates across phases during a request)
- [ ] T023 [US2] Implement 5s first-byte timeout with auto retry once; 10s stream gap abort in `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js` (Done when: can reproduce by offline/slow and observe retry once then Error)
- [ ] T024 [US2] Implement non-200 JSON error handling + “重试” button (same payload) in `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js` (Done when: 429/504 show exact message from server and clicking retry re-requests)
- [ ] T025 [US1] Implement auto-scroll and send button disabling/loading in `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js` (Done when: send disabled during streaming; messages stay scrolled to bottom)
- [ ] T026 [US3] Add welcome message with disclaimer and allowed scope in `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js` (Done when: first open shows disclaimer text before user sends anything)
- [ ] T027 [US1] Support config injection from `<script data-api-url data-retry>` in `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js` (Done when: changing attributes in HTML changes endpoint and retry behavior)
- [ ] T028 [US1] Embed widget assets into homepage `/mnt/c/dev_code/chinamedicaltour/index.html` (Done when: `index.html` includes `assets/css/chat-widget.css` and `assets/js/chat-widget.js` with `data-api-url` and widget appears)

---

## End-to-end 验证清单（curl + 浏览器）

- [ ] T029 Run local Worker and pass curl checks (Done when: `cd /mnt/c/dev_code/chinamedicaltour/workers/smart-cs && npx wrangler dev` then `bash /mnt/c/dev_code/chinamedicaltour/workers/smart-cs/scripts/verify-local.sh` shows: allowed preflight 204, forbidden origin 403, SSE responses include `data:` and `[DONE]`)
- [ ] T030 Verify error mapping via mock directives (Done when: sending `__mock_429` yields `429 rate_limit_exceeded` JSON, `__mock_500` yields `503 upstream_service_unavailable` JSON, `__mock_timeout` yields `504 gateway_timeout` JSON; logs show attempts and `key_slot` only)
- [ ] T031 Manual browser run-through on `/mnt/c/dev_code/chinamedicaltour/index.html` (Done when: widget streams; disconnecting network produces error UI; retry works; Esc closes; focus behavior correct)

---

## Dependencies & Execution Order (high level)

- Phase 1 tasks must complete before Phase 2 (CORS/route/log/error skeleton is required for reliable debugging).
- Phase 2 must complete before Phase 3 (frontend relies on stable SSE + error JSON contract).
- End-to-end tasks (T029–T031) are the merge gate.

