<!--
Sync Impact Report

- Version change: TEMPLATE (placeholders) → 1.0.0
- Modified principles: N/A (initial fill from template placeholders)
- Added sections: N/A (filled existing template sections)
- Removed sections: N/A
- Templates requiring updates: ✅ updated under `/mnt/c/dev_code/chinamedicaltour/workers/smart-cs/.specify/templates/`
- Follow-up TODOs: None
-->

# China Medical Tour Smart CS Core Principles Constitution

## Core Principles

### 1) 用户至上（Streaming & UX）
- 所有对话回复必须“可感知快速”：默认使用 SSE 流式输出，首包尽快可见。
- 前端聊天组件必须展示明确的连接/打字/加载状态，直到收到首个 SSE `data:` 事件为止。
- 前端必须具备清晰的错误反馈与可恢复操作：至少包含“重试”和“重新发送”，并在失败时提示“稍后再试”。
- 回复语言必须跟随用户输入语言（中文→中文；英文→英文），语气礼貌、简洁、可执行（提供下一步操作）。

### 2) 安全第一（Secrets & Policy）
- 严禁在仓库内写入或打印任何 API Key（含示例“看起来像 key”的真实串）：`LONGCAT_API_KEYS` 只能通过 `wrangler secret` 或本地 `workers/smart-cs/.dev.vars` 注入；日志与错误信息不得包含 key 原文。
- 严禁给出“医疗诊断/处方/治疗建议”。每次面向用户的回复必须包含免责声明（随语言切换）：
  - 中文：`免责声明：我只能提供信息与流程建议，不构成医疗诊断或治疗建议；请咨询专业医生与官方机构。`
  - English: `Disclaimer: I provide information and process guidance only, not medical diagnosis or treatment advice. Please consult qualified clinicians and official authorities.`
- CORS 必须严格白名单：仅允许 `env.ALLOWED_ORIGINS` 中的 `Origin`。
  - 预检 `OPTIONS` 必须正确响应并返回匹配 `Origin` 的 `Access-Control-Allow-Origin`。
  - 非白名单 `Origin` 的请求一律拒绝（`403`）。

### 3) 极简架构（Serverless-only）
- 后端必须运行于 Cloudflare Workers（`workers/smart-cs`，`wrangler.jsonc` 为事实来源）；v1 不引入服务器与数据库作为前置条件。
- Key 轮询/冷却的状态允许先使用 instance memory（文档允许）；不强制引入 Durable Objects 作为 v1 必需项。
- 所有新增依赖必须有明确收益，并避免引入超出 Worker 场景的运行时假设（例如常驻进程、文件系统持久化）。

### 4) 可观测性与可调试（Debug-First）
- Worker 必须结构化日志（JSON），每个请求至少包含以下字段：
  - `request_id`、`origin`、`path`、`status`、`latency_ms`、`key_slot`（索引或匿名 ID）、`attempt`、`error_code`
- 对上游 Longcat API 的失败必须可定位并可归因：区分 `400` / `429` / `5xx` / `timeout`，映射为产品定义的 `error_code` 与 UI 文案（以 `docs/plan-cs.md` 为准）。
- 任何上游失败（含重试）都必须产生可追踪的日志链路：同一 `request_id` 下，`attempt` 递增且 `key_slot` 可见（但不得泄露 key 原文）。

### 5) 测试优先（TDD-lite）
- 每个关键行为至少有一种可重复验证方式：优先提供脚本化集成测试（`curl` 或 Node 脚本均可），并在文档中写清如何运行。
- 不为“测试而测试”：覆盖必须包含以下主题（与接口/体验强绑定）：
  - CORS 白名单与预检（`OPTIONS`）
  - SSE 流式返回（`POST /api/chat`，`stream` 强制 `true`）
  - 错误映射（`400/429/5xx/timeout` → `error_code` + UI 文案）
  - Key 轮询/冷却（含重试与冷却 TTL）
  - 超时/取消（前端 abort / Worker timeout）

## Additional Constraints（契约与目录结构）
- 接口契约以 `docs/plan-cs.md` 为准：`POST /api/chat`，SSE 返回，`stream` 强制 `true`。
- Key 轮询/冷却以 `docs/architecture-design-cs.md` + `docs/plan-cs.md` 为准。
- 部署结构以 `docs/deployment-guide-cs.md` 为准：静态站点在仓库根目录，前端聊天组件位于 `assets/`；Worker 位于 `workers/smart-cs`。
- 非白名单 `Origin` 的访问必须返回 `403`，且不得返回任何 CORS 放行头。

## Development Workflow（质量门禁）
- 合并前必须通过：
  - 本地 `npx wrangler dev` 可跑通（Worker 启动成功，且 `ALLOWED_ORIGINS` 生效）。
  - 至少一条端到端请求验证（`curl` 或浏览器），覆盖 SSE（可见逐步输出）与错误时的可恢复操作（重试/重新发送）。
- 任何与对外契约相关的变更（接口、错误码、UI 文案、CORS 策略、免责声明）必须同步更新 `docs/plan-cs.md` 及对应验证脚本。

## Governance
- 本宪法对 `workers/smart-cs`（后端 Worker）与仓库根目录 `assets/`（前端聊天组件）具有最高约束力；如与其他文档冲突，以 `docs/plan-cs.md` 的接口契约与本宪法的安全/治理条款为准。
- 宪法变更必须显式记录（版本号、日期、原因），并遵循语义化版本：
  - MAJOR：移除/重定义原则或引入不兼容治理规则
  - MINOR：新增原则或新增强制性门禁/约束
  - PATCH：澄清措辞/非语义修订
- 审查责任：每个 PR 评审必须逐条核对对原则的影响（尤其是 Secrets、CORS、SSE、免责声明、错误映射、日志字段、测试脚本）。

**Version**: 1.0.0 | **Ratified**: 2025-12-13 | **Last Amended**: 2025-12-13
