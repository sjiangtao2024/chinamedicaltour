# Spec-Kit（Codex CLI）输入模板（Smart CS）

本文档提供可直接复制粘贴到 Codex CLI 的 Spec‑Kit prompts 输入内容，用于实现 China Medical Tour 智能客服（Smart CS）。

## 0. 在 WSL 中启动 Codex CLI（项目级 `CODEX_HOME`）

在 `workers/smart-cs` 目录启动，确保能加载本项目的 `.codex/prompts/`：

```bash
cd workers/smart-cs
CODEX_HOME="$PWD/.codex" codex --enable skills
```

说明：
- Codex CLI 的自定义 prompts 默认只从 `$CODEX_HOME/prompts/` 加载，因此这里将 `CODEX_HOME` 指向项目内 `.codex`。
- 本仓库的 speckit 工作流通过 `/prompts:speckit.*` 触发（不是 `/speckit.*`）。

## 1) `/prompts:speckit.constitution` 输入内容

```text
为 China Medical Tour 的 “Smart CS 智能客服” 建立项目宪法（Constitution），范围覆盖后端 Cloudflare Worker（workers/smart-cs）与前端静态站点的聊天组件（assets/ 下）。

PROJECT_NAME: China Medical Tour Smart CS

Core Principles（必须可测试、可执行）：
1) 用户至上（Streaming & UX）
- 所有对话回复必须“可感知快速”：默认流式输出（SSE），前端展示打字/加载状态。
- 前端必须具备清晰的错误反馈与可恢复操作（重试/重新发送/提示稍后再试）。
- 回复语言跟随用户输入语言（用户中文则中文，英文则英文），语气礼貌、简洁、可执行。

2) 安全第一（Secrets & Policy）
- 严禁在仓库内写入/打印 API Key：LONGCAT_API_KEYS 只能通过 wrangler secret/.dev.vars 注入；日志不得包含 key 原文。
- 严禁给出“医疗诊断/处方/治疗建议”；必须包含免责声明：仅提供信息与流程建议，建议咨询专业医生与官方机构。
- CORS 必须严格白名单（env.ALLOWED_ORIGINS），预检请求正确响应；非白名单 Origin 一律拒绝（403）。

3) 极简架构（Serverless-only）
- 后端必须运行于 Cloudflare Workers（wrangler.jsonc 已存在）；不引入服务器与数据库作为 v1 前置条件。
- Key 冷却状态允许先用 instance memory（文档允许）；不强制 Durable Objects（可列为未来演进）。

4) 可观测性与可调试（Debug-First）
- Worker 必须结构化日志（JSON），包含：request_id、origin、path、status、latency_ms、key_slot(索引/匿名ID)、attempt、error_code。
- 对上游 Longcat API 的失败必须可定位：区分 400/429/5xx/timeout，并映射为产品定义的错误码与 UI 文案（见 plan-cs.md）。

5) 测试优先（TDD-lite）
- 每个关键行为至少有一种可重复验证方式：优先提供脚本化集成测试（curl/Node 脚本均可），并在 README 或 docs 中写清怎么跑。
- 不为“测试而测试”：覆盖必须包含 CORS、SSE、错误映射、Key 轮询/冷却、超时/取消。

Additional Constraints（与现有文档一致）：
- 接口以 docs/plan-cs.md 为准：POST /api/chat，SSE 返回，stream 强制 true。
- Key 轮询/冷却以 docs/architecture-design-cs.md + docs/plan-cs.md 为准。
- 部署结构以 docs/deployment-guide-cs.md 为准：静态站点在根目录，Worker 在 workers/smart-cs。

Governance：
- Constitution 变更必须显式记录（版本号、日期、原因）。
- 合并前必须通过：本地 wrangler dev 可跑通 + 至少一条端到端请求（curl 或浏览器）。
Ratified=2025-12-13，Version=1.0.0
```

## 2) `/prompts:speckit.specify` 输入内容（建议先做端到端 MVP）

```text
实现 Smart CS v1 端到端 MVP：Cloudflare Worker 的 /api/chat 流式对话接口 + 静态站点可嵌入的 Chat Widget（无构建链、原生 CSS/JS），并严格遵守现有文档契约与安全要求。

背景/事实来源（必须对齐）：
- 接口契约与错误映射：docs/plan-cs.md
- Key 轮询与冷却策略：docs/architecture-design-cs.md + docs/plan-cs.md
- Monorepo 结构与部署方式：docs/deployment-guide-cs.md
- 当前实现现状：workers/smart-cs/src/index.js 仅 Hello World；assets/js/chat-widget.js 不存在

功能范围（v1 必须完成）：

A. 后端：Smart CS Core API（Cloudflare Worker）
1) 路由
- 仅提供 POST /api/chat（与现有 wrangler routes / 本地路径兼容）
- OPTIONS 预检正确返回
2) 输入
- JSON: { messages: [{role,content}...], stream: true, temperature?: number }
- 若 stream=false 或缺失：后端仍强制以 SSE 流式返回（按 docs/plan-cs.md “stream 强制 true”）
3) 输出（成功）
- HTTP 200
- Content-Type: text/event-stream; charset=utf-8
- SSE 数据格式与 OpenAI 风格兼容：data: {...}\n\n；最终以 data: [DONE]\n\n 收尾
4) 上游调用（Longcat）
- 使用 env.LONGCAT_API_ENDPOINT、env.MODEL_NAME
- Authorization 由 Worker 内部注入（前端不传）
- 使用 env.LONGCAT_API_KEYS（逗号分隔）进行 Key 轮询 + 冷却（TTL 60s）+ 最多 3 次尝试
- TIMEOUT_MS 超时（默认来自 wrangler.jsonc）
5) CORS
- 仅允许 env.ALLOWED_ORIGINS 中的 Origin
- Origin 不存在（如 curl）可放行，但一旦存在且不在白名单必须 403
6) 错误映射（对齐 docs/plan-cs.md）
- 400 -> error_code=invalid_request，前端文案“请求格式有误，请刷新页面重试。”（不重试）
- 429 -> rate_limit_exceeded，“咨询人数过多，请稍等片刻。”（建议指数退避）
- 503 -> upstream_service_unavailable，“AI 服务暂不可用，请稍后重试。”
- 504 -> gateway_timeout，“连接超时，请检查网络。”（前端自动重试 1 次）
要求：错误也用 SSE 或 JSON？v1 约定：非 200 直接返回 application/json，包含 {error_code,message,request_id}，前端按此处理。
7) 上下文截断（对齐 docs/plan-cs.md）
- 保留 system prompt
- 总字符数 > 6000 触发截断：从最早 user+assistant 对开始移除，直到 < 6000
8) 安全与免责声明
- 系统提示词必须包含“非医疗建议/仅信息与流程”免责声明
- 不泄露 secrets；日志中 key 只允许匿名索引或 hash 前缀

B. 前端：Chat Widget（嵌入静态站点）
1) 文件与集成点（对齐 docs/deployment-guide-cs.md / docs/plan-cs.md）
- 新增 assets/js/chat-widget.js
- 新增 assets/css/chat-widget.css（原生 CSS，建议 BEM）
- 在 index.html（至少）通过 <script data-api-url=...> 注入配置（docs/plan-cs.md 3.2）
2) 交互与 UI
- 右下角悬浮按钮，点击展开/收起
- 消息列表 + 输入框 + 发送按钮
- 显示连接状态：Connecting / Awaiting First Byte / Streaming / Error
- 错误状态有清晰文案与重试按钮
3) 连接与超时（对齐 docs/plan-cs.md 3.1）
- 5 秒未收到首字节：abort，并自动重试 1 次；再失败进入 Error
- Streaming 中断 >10 秒：视为断开并提示
4) 流式解析
- 使用 fetch(POST) + ReadableStream 读取 SSE；解析 data: 行并增量拼接 assistant 回复
5) 体验细节
- 自动滚动到底部
- 发送时禁用按钮/显示 loading
- 默认首条系统/欢迎信息包含免责声明与可问范围（签证、套餐、流程、预约、医院资质等）
- 语言跟随用户输入

验收标准（必须可验证）：
- 本地：npx wrangler dev 后，curl POST http://localhost:8787/api/chat 能收到 SSE（至少 2 个 data 事件 + [DONE]）
- CORS：白名单 Origin 成功；非白名单 Origin 403
- Key 轮询：人为模拟 429/5xx 时会切换 key 并记录结构化日志（不含 key 明文）
- 前端：index.html 打开后 widget 可用；断网/超时/429 能显示对应文案
- 不引入构建链；不新增后端服务；不提交任何 secrets
```

## 3) `/prompts:speckit.plan` 输入内容（技术选型与落地路径）

```text
请基于当前仓库结构与既有约束，给出 Smart CS v1 的技术实现方案（Implementation Plan），并明确每一步要改哪些文件。

硬性约束与现状：
- Worker：Cloudflare Workers + Wrangler（workers/smart-cs/wrangler.jsonc 已存在，src/index.js 目前仅 Hello World）
- 静态站点：根目录多页面 HTML，无 Tailwind/无构建链
- 目标接口：POST /api/chat，SSE（docs/plan-cs.md）
- Key 轮询/冷却：instance memory + cooldown 60s + max retries 3（docs/plan-cs.md）
- CORS：严格白名单（env.ALLOWED_ORIGINS）
- 前端 widget：新增 assets/js/chat-widget.js 与 assets/css/chat-widget.css，并在 index.html 引入；配置从 script data-* 读取（docs/plan-cs.md 3.2）
- 需要最小可重复验证：curl/wrangler dev/浏览器

计划中必须包含：
1) Worker 端实现细节
- 路由与 CORS/OPTIONS
- SSE 透传/封装策略（如何从上游响应流转发到客户端）
- Key 轮询与冷却的数据结构（内存 Map、cooldown 过期）
- 超时控制（AbortController + TIMEOUT_MS）
- 错误映射与响应体格式（统一 {error_code,message,request_id}）
- 日志字段规范（JSON、request_id、latency_ms、key_slot、attempt、upstream_status）
- 截断策略实现（字符估算与移除消息对）

2) 前端 widget 端实现细节
- DOM 结构、样式组织（BEM）、无构建链
- fetch + ReadableStream SSE 解析器（处理 data: 行、[DONE]）
- 状态机与超时/重试策略
- 配置注入（data-api-url、data-retry）
- 可访问性最小要求（focus、键盘 Esc 关闭、aria-label）

3) 文件清单（必须给出准确路径）
- 修改：workers/smart-cs/src/index.js
- 可能新增：workers/smart-cs/src/*.js（如拆分 cors、sse、longcatClient、keyManager）
- 新增：assets/js/chat-widget.js、assets/css/chat-widget.css
- 修改：index.html（引入 css + script）

4) 验证方案
- curl 端到端：本地 wrangler dev + POST /api/chat（带 Origin）
- 浏览器手动验证：widget 能流式显示、错误文案一致
```

## 4) `/prompts:speckit.tasks` 输入内容（拆分成可执行任务）

```text
请把实现计划拆解成可执行任务列表（tasks.md），要求：
- 严格按依赖顺序：测试/验证脚本优先于实现（TDD-lite）
- 每个任务写明要改的文件路径
- 每个任务有完成标准（可验证的命令或现象）
- 后端与前端分阶段（Phase 1/2/3 与 docs/development-specs-cs.md 对齐）
- 包含关键场景：CORS、SSE、超时、错误映射、Key 轮询+冷却、截断、前端状态机

建议输出结构：
- Phase 1：Worker 基础（路由/CORS/Hello->SSE骨架/日志/错误响应）
- Phase 2：Longcat 集成（KeyManager、重试、超时、SSE转发、截断）
- Phase 3：前端 widget（CSS/JS、流式解析、错误/重试、嵌入 index.html）
- 最后：端到端验证清单（curl + 浏览器）
```

