# Quickstart: Smart CS v1

## Prerequisites

- Node.js + npm
- Cloudflare Wrangler（通过 `npx wrangler ...` 使用即可）
- 已配置本地 `LONGCAT_API_KEYS`（仅用于本机，不要提交真实值）

## 1) Run Worker locally

```bash
cd /mnt/c/dev_code/chinamedicaltour/workers/smart-cs
npx wrangler dev
```

默认监听 `http://localhost:8787`。

## 2) End-to-end curl (SSE)

> 必须带白名单 `Origin`（示例以 `wrangler.jsonc` 默认值为准）。

```bash
curl -N -v -X POST http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "Origin: http://127.0.0.1:5500" \
  -d '{"messages":[{"role":"user","content":"ping"}], "stream":true}'
```

预期：持续输出 `data: ...`，并最终出现 `data: [DONE]`。

## 3) CORS preflight check

```bash
curl -i -X OPTIONS http://localhost:8787/api/chat \
  -H "Origin: http://127.0.0.1:5500" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

预期：`200` 且包含 `Access-Control-Allow-Origin: http://127.0.0.1:5500`。

## 4) Browser manual verification

1. 用任意静态服务器打开站点根目录（例如 VSCode Live Server 或 `python -m http.server`）。
2. 打开 `/mnt/c/dev_code/chinamedicaltour/index.html`。
3. 右下角打开 Widget，发送消息：
   - 能看到连接/打字状态；
   - 回复逐步流式展示；
   - 断网/超时/上游失败时能展示错误文案，并可重试/重发。

