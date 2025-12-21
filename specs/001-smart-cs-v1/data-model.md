# Data Model (No-DB): Smart CS v1

> v1 无数据库；本文档描述“在请求/内存中存在的数据结构”与关键状态。

## Worker Inbound Model

### ChatRequest

- `messages: Array<{ role: "system"|"user"|"assistant", content: string }>`
- `stream: true`（强制）
- `temperature?: number`

### Truncation Inputs/Outputs

- Input: `messages[]`
- Output: `messages[]`（保留 system，必要时移除最早 user+assistant 成对消息）
- Trigger: `totalChars > 6000` 或估算 token 超阈（按 `docs/plan-cs.md`）

## Worker Runtime State (Instance Memory)

### KeyState

- `keys: string[]`（每次请求由 `env.LONGCAT_API_KEYS` 解析）
- `rrIndex: number`（轮询指针）
- `cooldownUntilBySlot: Map<number, number>`（slot → epoch ms）
- `cooldownTtlMs: 60000`

### AttemptContext (per request)

- `request_id: string`
- `attempt: 1..3`
- `key_slot: number`
- `upstream_status?: number`
- `error_code?: string`

## Worker Error Model

### ErrorResponse (JSON)

- `error_code: "invalid_request" | "rate_limit_exceeded" | "upstream_service_unavailable" | "gateway_timeout" | ...`
- `message: string`（与 `docs/plan-cs.md` UI 文案一致）
- `request_id: string`

## Frontend Widget State

### UIState

- `isOpen: boolean`
- `phase: "idle"|"connecting"|"awaiting_first_byte"|"streaming"|"done"|"error"`
- `retryLeft: number`
- `lastUserMessage: string`
- `activeAbortController?: AbortController`
- `timers: { firstByte?: number, streamGap?: number }`

