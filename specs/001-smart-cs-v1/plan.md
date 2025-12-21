# Implementation Plan: Smart CS v1 (Worker + Chat Widget)

**Branch**: `001-smart-cs-v1` | **Date**: 2025-12-14 | **Spec**: `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/spec.md`
**Input**: Feature specification from `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/spec.md`

## Summary

在不引入服务器/数据库/构建链的前提下，实现：

- Cloudflare Worker：`POST /api/chat`（严格 CORS 白名单、SSE 流式、Key 轮询/冷却、超时与错误映射、结构化日志、截断策略）
- 前端静态站点：新增无构建链 Chat Widget（ReadableStream SSE 解析、状态机、超时/重试/重发、基础 a11y）
- 最小可重复验证：`wrangler dev` + `curl` + 浏览器手动验证

## Technical Context

**Language/Version**: JavaScript (ES2022), Cloudflare Workers runtime (nodejs_compat enabled)  
**Primary Dependencies**: None (v1 尽量零依赖)  
**Storage**: N/A（instance memory: `globalThis` 内 Map）  
**Testing**: `curl`（端到端）、可选 Node 脚本（解析 SSE）  
**Target Platform**: Cloudflare Workers + Browser (no build toolchain)  
**Project Type**: web（静态站点 + Worker）  
**Performance Goals**: “可感知快速”：首包尽快；前端即时显示连接/打字状态  
**Constraints**: 严格 CORS 白名单；`stream=true` 强制；不泄露 secrets；不输出医疗诊断/治疗建议；无 DB/无服务器 v1  
**Scale/Scope**: v1 MVP（可上线验证转化的最小闭环）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] SSE 默认开启：`POST /api/chat` 返回 SSE，且请求体 `stream` 强制 `true`（`docs/plan-cs.md`）
- [x] 前端 UX：连接/打字/加载；失败可恢复（重试/重新发送/稍后再试）
- [x] Secrets：不写入/不打印 key；仅 `wrangler secret`/`.dev.vars`
- [x] Policy：不提供医疗诊断/治疗建议；每次回复附免责声明（中英随输入）
- [x] CORS：严格白名单 `env.ALLOWED_ORIGINS`；预检正确；非白名单 `403`
- [x] 可观测性：JSON 日志字段齐全（含 `upstream_status`）
- [x] 错误映射：`400/429/5xx/timeout` → `error_code` + UI 文案（`docs/plan-cs.md`）
- [x] 可重复验证：提供 `curl` 步骤 + 浏览器手动验证步骤

## Project Structure

### Documentation (this feature)

```text
/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/
    ├── api-chat.md
    └── error-codes.md
```

### Source Code (repository root)

```text
/mnt/c/dev_code/chinamedicaltour/
├── assets/
│   ├── js/
│   │   └── chat-widget.js          # NEW
│   └── css/
│       └── chat-widget.css         # NEW
├── index.html                      # MODIFIED
└── workers/
    └── smart-cs/
        ├── wrangler.jsonc          # existing (env vars)
        └── src/
            ├── index.js            # MODIFIED (route handler)
            └── lib/                # NEW (模块化拆分)
                ├── cors.js
                ├── errors.js
                ├── key-manager.js
                ├── longcat-client.js
                ├── logger.js
                ├── sse.js
                └── truncate.js
```

**Structure Decision**: 采用“静态站点根目录 + Worker 子目录”的既有 Monorepo 结构；
Worker 内部用 `src/lib/*` 做最小拆分以保证可读性与可测试性（TDD-lite 的脚本化验证优先）。

## Phase 0: Research（补齐实现细节/约束）

> 目标：把“怎么做”具体化到可以直接按步骤改文件实现。

1. **SSE 端到端链路确认**（Worker → Browser）
   - 选择：`fetch(upstream)` 读取 `response.body`，通过 `ReadableStream`/`TransformStream` 逐行转发 `data:`。
   - 确认点：下游 `Response` headers（`Content-Type: text/event-stream`，`Cache-Control: no-cache`）。
2. **上游 Longcat API 交互方式**（基于 `docs/plan-cs.md`）
   - 选择：请求体保持 OpenAI chat.completions 兼容结构（`messages[]`, `model`, `stream=true`）。
3. **超时/取消语义**（Worker abort + 前端 abort）
   - Worker：`TIMEOUT_MS` 到达后 abort 上游 fetch → 返回 `504 gateway_timeout`（JSON）。
   - 前端：首包 5s abort 并自动重试 1 次；流中断 >10s 视为断开。

## Phase 1: Design（明确模块职责与契约）

### 1) Worker 端设计（必须覆盖的实现点）

**A. 路由与 CORS/OPTIONS**
- 文件：
  - `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js`（MODIFY）
  - `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/cors.js`（NEW）
- 行为：
  - 仅接受路径 `/api/chat`（或以 `.endsWith("/api/chat")` 兼容本地与 routes）
  - `OPTIONS`：
    - 白名单 Origin → `200` + 正确 CORS 头
    - 非白名单/无 Origin → `403`
  - `POST`：
    - 非白名单 Origin → `403`
    - 白名单 Origin → 继续处理

**B. SSE 透传/封装策略**
- 文件：
  - `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/sse.js`（NEW）
  - `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/longcat-client.js`（NEW）
- 策略：
  - 不在 Worker 内“重组语义”，仅做最小转发：读取上游 SSE，逐条 `data:` 原样写入下游（保持 OpenAI 兼容）。
  - 在流开始前可写入一次注释帧（可选）：`: request_id=<id>\n\n`（便于调试，不影响客户端）。
  - 当上游发送 `[DONE]` 或流结束时关闭下游流。

**C. Key 轮询与冷却（instance memory）**
- 文件：
  - `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/key-manager.js`（NEW）
- 数据结构：
  - `globalThis.__smartcs_key_state = { rrIndex:number, cooldownUntilBySlot: Map<number, number> }`
  - `slot` = keys 数组下标（`env.LONGCAT_API_KEYS` 解析后）
- 行为：
  - 选择 ACTIVE key：从 `rrIndex` 开始轮询找第一个 `now >= cooldownUntil`
  - 失败（`429`/`5xx`/timeout）→ 该 slot 置 `cooldownUntil = now + 60000`
  - 单次请求内最多尝试 3 次（attempt 1..3），每次换 slot
  - 若全部不可用 → 返回 `503 upstream_service_unavailable`（JSON）

**D. 超时控制（AbortController + TIMEOUT_MS）**
- 文件：
  - `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/longcat-client.js`（NEW）
- 行为：
  - `TIMEOUT_MS` 默认来自 `env.TIMEOUT_MS`（`wrangler.jsonc` 已配置）
  - 到时 abort 上游 fetch，并映射到 `504 gateway_timeout`

**E. 错误映射与响应体格式（统一 JSON）**
- 文件：
  - `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/errors.js`（NEW）
- 输出（非 200）：
  - `Content-Type: application/json`
  - body: `{ "error_code": "...", "message": "...", "request_id": "..." }`
  - `error_code` 与 UI 文案映射以 `docs/plan-cs.md` 表为准

**F. 日志字段规范（结构化 JSON）**
- 文件：
  - `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/logger.js`（NEW）
- 约束：
  - 每个请求至少 1 条 summary log（含 `latency_ms`），每次 attempt 可追加 warn log
  - 字段：`request_id, origin, path, status, latency_ms, key_slot, attempt, upstream_status, error_code`
  - 严禁记录 key 原文；仅记录 `key_slot`

**G. 截断策略实现（字符估算 + 移除消息对）**
- 文件：
  - `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/truncate.js`（NEW）
- 行为（与 `docs/plan-cs.md` 一致）：
  - 估算：`tokens ≈ (中文数*2) + (英文数*0.3)`，并以 `totalChars > 6000` 触发
  - 保留 system；从最早 `user+assistant` 成对移除直到满足阈值

### 2) 前端 widget 端设计（必须覆盖的实现点）

**A. DOM 结构（BEM）与样式组织（无构建链）**
- 文件：
  - `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js`（NEW）
  - `/mnt/c/dev_code/chinamedicaltour/assets/css/chat-widget.css`（NEW）
- DOM（示例类名）：
  - `.cmt-chat`（容器）
  - `.cmt-chat__toggle`（打开按钮）
  - `.cmt-chat__panel[aria-hidden]`（面板）
  - `.cmt-chat__messages`（消息列表）
  - `.cmt-chat__status`（连接/打字状态）
  - `.cmt-chat__error`（错误提示 + 按钮）
  - `.cmt-chat__input` / `.cmt-chat__send`

**B. fetch + ReadableStream SSE 解析器**
- 文件：
  - `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js`（NEW）
- 解析策略：
  - `response.body.getReader()` + `TextDecoder`
  - 以 `\n` 分行，消费 `data:` 行
  - `data: [DONE]` 或流结束 → 完成
  - `data: {json}`：解析 OpenAI 兼容 chunk，抽取增量文本并 append 到最后一条 assistant 消息

**C. 状态机与超时/重试策略**
- 状态：
  - `idle` → `connecting` → `awaiting_first_byte` → `streaming` → `done` | `error`
- 超时：
  - 首包 5s 超时：abort，自动重试 1 次
  - 流中断 10s：abort，提示可重试
- 重试：
  - 次数来自 `data-retry`（默认 3）
  - UI 提供：`重试`（同一请求再发），`重新发送`（重新构造请求）

**D. 配置注入（data-*）**
- 从当前 `<script src="assets/js/chat-widget.js" ...>` 的 `dataset` 读取：
  - `data-api-url`
  - `data-retry`

**E. 可访问性最小要求**
- `aria-label`：toggle/close/send/input
- focus：
  - 打开时 focus 到输入框
  - 关闭时返回 toggle
- 键盘：
  - `Esc` 关闭
  - `Enter` 发送（`Shift+Enter` 换行可选）

## Phase 2: Implementation Steps（逐步改哪些文件）

> 下面步骤按“先 Worker 后前端，最后验证”排序；每步都列出需修改/新增的文件。

1. **实现严格 CORS + 路由骨架**
   - MODIFY: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js`
   - NEW: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/cors.js`
2. **实现统一错误模型 + 错误码映射**
   - NEW: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/errors.js`
   - MODIFY: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js`
3. **实现 request_id 与结构化日志**
   - NEW: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/logger.js`
   - MODIFY: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js`
4. **实现截断策略**
   - NEW: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/truncate.js`
   - MODIFY: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js`
5. **实现 Key 轮询/冷却（instance memory）**
   - NEW: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/key-manager.js`
6. **实现上游 Longcat 请求 + 超时**
   - NEW: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/longcat-client.js`
7. **实现 SSE 转发（上游→下游）**
   - NEW: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/lib/sse.js`
   - MODIFY: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/src/index.js`
8. **实现前端 Chat Widget（JS + CSS）**
   - NEW: `/mnt/c/dev_code/chinamedicaltour/assets/js/chat-widget.js`
   - NEW: `/mnt/c/dev_code/chinamedicaltour/assets/css/chat-widget.css`
9. **在首页引入 widget**
   - MODIFY: `/mnt/c/dev_code/chinamedicaltour/index.html`
10. **补齐验证文档/脚本（最小可重复）**
   - MODIFY: `/mnt/c/dev_code/chinamedicaltour/specs/001-smart-cs-v1/quickstart.md`（写清如何跑）
   - 可选 NEW: `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/scripts/verify-local.sh`

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | v1 维持 serverless-only 与最小拆分 | N/A |

