# Feature Specification: Smart CS v1 (Worker + Chat Widget)

**Feature Branch**: `001-smart-cs-v1`  
**Created**: 2025-12-14  
**Status**: Draft  
**Input**: User description: "Smart CS v1 技术实现方案与落地文件清单"

**Constitution**: `/mnt/c/dev_code/chinamedicaltour/.specify/memory/constitution.md`

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 流式对话咨询（SSE）(Priority: P1)

用户在网站右下角打开聊天窗口，输入问题后，能看到“连接中/打字中”的状态，并以流式方式逐步看到回复内容。

**Why this priority**: Smart CS 的核心价值即“可感知快速”的对话体验，必须首先交付。

**Independent Test**:
- `npx wrangler dev` 启动后，通过 `curl -N` 对 `/api/chat` 发起请求，能持续看到 `data:` 行输出；
- 浏览器打开 `index.html`，Widget 能逐步渲染回复。

**Acceptance Scenarios**:
1. **Given** 前端 `Origin` 在 `ALLOWED_ORIGINS` 白名单中，**When** `POST /api/chat` 且 `stream=true`，**Then** 返回
   `Content-Type: text/event-stream` 且持续输出 SSE。
2. **Given** 用户发送消息，**When** 首包未到，**Then** 前端显示“连接中/加载中”，收到首个 `data:` 后切换为“打字中”。

---

### User Story 2 - 错误可恢复（错误码映射 + 重试/重发）(Priority: P1)

当上游失败（400/429/5xx/timeout）时，前端能给出明确文案，并允许用户重试或重新发送。

**Why this priority**: 没有可恢复的失败体验将导致咨询中断，影响转化。

**Independent Test**:
- Worker 能对不同失败类型返回统一 JSON：`{ error_code, message, request_id }`（HTTP status 与 error_code 映射符合
  `docs/plan-cs.md`）；
- 前端能展示相应 UI 文案，并可点击“重试/重新发送”恢复。

**Acceptance Scenarios**:
1. **Given** 请求体不合法，**When** `POST /api/chat`，**Then** `400` + `error_code=invalid_request`。
2. **Given** 上游返回 `429`，**When** Worker 重试到上限仍失败，**Then** `429` + `error_code=rate_limit_exceeded`，
   前端展示“咨询人数过多，请稍等片刻。”并允许重试。
3. **Given** 首包等待超过阈值或上游超时，**When** 请求被 abort，**Then** `504` + `error_code=gateway_timeout`，
   前端提示检查网络并自动重试 1 次。

---

### User Story 3 - 安全与合规（CORS 白名单 + Secrets + 免责声明）(Priority: P1)

系统严格限制调用来源，不泄露密钥，并且每次输出包含免责声明且不提供医疗诊断/治疗建议。

**Why this priority**: 安全与政策是上线的硬门槛。

**Independent Test**:
- 非白名单 `Origin` 访问一律 `403`；
- 日志不包含 key 原文；
- 输出中包含免责声明（随用户语言切换）。

**Acceptance Scenarios**:
1. **Given** `Origin` 不在 `ALLOWED_ORIGINS`，**When** `OPTIONS` 或 `POST`，**Then** `403` 且不返回放行 CORS 头。
2. **Given** 任意对话请求，**When** 产生日志，**Then** 日志字段齐全且无敏感 key。

---

### Edge Cases

- 用户请求体 `stream=false`：Worker 必须拒绝并按契约提示（`400 invalid_request`）。
- `Origin` 为空（例如 curl 未带 Origin）：按产品要求默认拒绝或仅允许本地测试（本计划以“严格拒绝”为默认）。
- 上游 SSE 中出现非 JSON `data:`：Worker 透传但记录 `error_code=upstream_malformed_sse`（不泄露内容）。

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Worker MUST 提供 `POST /api/chat` 并以 SSE 返回（`stream` 强制 `true`），契约以 `docs/plan-cs.md` 为准。
- **FR-002**: Worker MUST 严格执行 CORS 白名单（`env.ALLOWED_ORIGINS`），`OPTIONS` 预检正确响应，非白名单 `403`。
- **FR-003**: Worker MUST 实现 Key 轮询/冷却：instance memory，cooldown 60s，max retries 3（`docs/plan-cs.md`）。
- **FR-004**: Worker MUST 实现超时控制：`AbortController` + `TIMEOUT_MS`，并将超时映射为 `504 gateway_timeout`。
- **FR-005**: Worker MUST 结构化 JSON 日志包含：`request_id, origin, path, status, latency_ms, key_slot, attempt, upstream_status, error_code`。
- **FR-006**: Worker MUST 实现截断策略：字符估算 + 移除最早消息对（保留 system），并在上游请求前执行。
- **FR-007**: 前端 MUST 提供 `assets/js/chat-widget.js` 与 `assets/css/chat-widget.css`（无构建链），并在 `index.html` 引入。
- **FR-008**: 前端 MUST 使用 `fetch` + `ReadableStream` 解析 SSE（处理 `data:` 行与 `[DONE]`）。
- **FR-009**: 前端 MUST 提供状态机与超时/重试策略（首包 5s 超时、自动重试 1 次、可手动重试/重发）。
- **FR-010**: 前端 MUST 支持 `data-api-url`、`data-retry` 配置注入（`docs/plan-cs.md 3.2`）。
- **FR-011**: 前端 MUST 满足最小可访问性：focus 管理、Esc 关闭、关键元素 `aria-label`。

## Success Criteria *(mandatory)*

- **SC-001**: 本地 `npx wrangler dev` 下，`curl -N` 能看到持续输出的 SSE `data:` 行。
- **SC-002**: 非白名单 `Origin` 的 `OPTIONS/POST` 均返回 `403`。
- **SC-003**: Worker 对 `400/429/5xx/timeout` 能返回一致的 `{error_code,message,request_id}` 并匹配 UI 文案表。
- **SC-004**: 浏览器中 Widget 能流式展示内容、可在错误时重试/重发恢复。

