# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command (automation may live under `.specify/scripts/`).

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

**Language/Version**: [e.g., Python 3.11, Swift 5.9, Rust 1.75 or NEEDS CLARIFICATION]  
**Primary Dependencies**: [e.g., FastAPI, UIKit, LLVM or NEEDS CLARIFICATION]  
**Storage**: [if applicable, e.g., PostgreSQL, CoreData, files or N/A]  
**Testing**: [e.g., pytest, XCTest, cargo test or NEEDS CLARIFICATION]  
**Target Platform**: [e.g., Linux server, iOS 15+, WASM or NEEDS CLARIFICATION]
**Project Type**: [single/web/mobile - determines source structure]  
**Performance Goals**: [domain-specific, e.g., 1000 req/s, 10k lines/sec, 60 fps or NEEDS CLARIFICATION]  
**Constraints**: [domain-specific, e.g., <200ms p95, <100MB memory, offline-capable or NEEDS CLARIFICATION]  
**Scale/Scope**: [domain-specific, e.g., 10k users, 1M LOC, 50 screens or NEEDS CLARIFICATION]

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [ ] SSE 默认开启：`POST /api/chat` 返回 SSE，且请求体 `stream` 强制 `true`（以 `docs/plan-cs.md` 为准）
- [ ] 前端 UX：展示连接/打字/加载；失败有明确文案且可恢复（重试/重新发送/稍后再试）
- [ ] Secrets：仓库与日志中不得出现 key 原文；`LONGCAT_API_KEYS` 仅通过 `wrangler secret` 或本地 `.dev.vars`
- [ ] Policy：不提供医疗诊断/治疗建议；每次回复包含免责声明（中英随输入）
- [ ] CORS：严格白名单 `env.ALLOWED_ORIGINS`；预检正确；非白名单 `Origin` 一律 `403`
- [ ] 可观测性：Worker JSON 日志包含 `request_id/origin/path/status/latency_ms/key_slot/attempt/error_code`
- [ ] 错误映射：区分 `400/429/5xx/timeout` 并映射为产品 `error_code` + UI 文案（`docs/plan-cs.md`）
- [ ] 可重复验证：至少一种脚本化方式覆盖 CORS、SSE、错误映射、Key 轮询/冷却、超时/取消

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

