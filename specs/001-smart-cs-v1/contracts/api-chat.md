# Contract: POST /api/chat (Smart CS v1)

**Authoritative spec**: `docs/plan-cs.md`  
**Public URL (prod)**: `https://api.chinamedicaltour.org/api/chat`

## Request

- Method: `POST`
- Headers:
  - `Content-Type: application/json`
  - `Origin: <caller origin>`（必须在 `env.ALLOWED_ORIGINS` 白名单中）
- Body:
  ```json
  {
    "messages": [
      { "role": "user", "content": "你好，我想咨询签证" }
    ],
    "stream": true,
    "temperature": 0.5
  }
  ```

## Success Response (200)

- `Content-Type: text/event-stream`
- SSE 事件：兼容 OpenAI 的 `data: { "choices": ... }` 流
- 结束标记：`data: [DONE]`

## Error Response (non-200)

- `Content-Type: application/json`
- Body:
  ```json
  { "error_code": "invalid_request", "message": "请求格式有误，请刷新页面重试。", "request_id": "..." }
  ```

## CORS

- 仅当 `Origin` 在 `env.ALLOWED_ORIGINS` 中时返回 CORS 头。
- 预检 `OPTIONS` 必须正确响应。
- 非白名单 `Origin`: `403`，且不得返回放行 CORS 头。

