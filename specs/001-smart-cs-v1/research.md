# Research: Smart CS v1 Implementation Notes

**Date**: 2025-12-14  
**Scope**: `/api/chat` SSE + Key rotation/cooldown + static chat widget (no build chain)

## Decision 1: Worker SSE 转发方式

- **Decision**: Worker 使用 `fetch()` 获取上游 SSE `Response.body`，逐行读取并将 `data:` 行写回下游 `ReadableStream`。
- **Rationale**:
  - 保持 OpenAI 兼容 SSE 格式，不在 Worker 内做多余重组，减少 bug 面。
  - 可在失败时快速切换为 JSON 错误响应（非 200）。
- **Alternatives considered**:
  - 将上游内容缓冲后一次性返回：违背“可感知快速”与 streaming 要求。
  - Worker 内将 chunk 聚合成纯文本：会破坏 OpenAI 兼容契约，且难与前端解析器一致。

## Decision 2: Key 轮询/冷却的存储与可观测性

- **Decision**: 使用 instance memory（`globalThis`）存储 `cooldownUntilBySlot` Map，并以 `key_slot`（数组下标）作为匿名标识。
- **Rationale**:
  - 满足 v1 “不引入 DO/DB”约束，且对冷却逻辑足够。
  - `key_slot` 便于排查问题，同时不泄露 key 原文。
- **Alternatives considered**:
  - Durable Objects：全局一致性更强，但非 v1 必需项，增加复杂度。
  - KV：写入/一致性与成本不匹配 v1。

## Decision 3: 错误响应格式与 UI 文案来源

- **Decision**: 非 200 统一 JSON：`{ error_code, message, request_id }`；`error_code`/`message` 映射以 `docs/plan-cs.md` 为准。
- **Rationale**:
  - 前端无需解析 SSE 错误帧，处理路径更简单。
  - `request_id` 可用于日志关联与排障。
- **Alternatives considered**:
  - SSE 里输出错误事件：更复杂且浏览器端更难统一处理。

## Decision 4: 截断策略（v1）

- **Decision**: Worker 端执行字符估算与“移除最早 user+assistant 消息对”的截断；保留 system。
- **Rationale**:
  - Worker 端集中处理，避免前端多实现一份。
  - 不引入 tokenizer 依赖，保持包体与性能。

