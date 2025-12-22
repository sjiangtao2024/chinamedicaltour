# 智能客服部署与项目结构指南

本文档详细说明了如何在现有的静态网站项目中，以 **Monorepo (单体仓库)** 的形式集成智能客服后端服务。

## 1. 项目目录结构 (Monorepo)

我们采用“前端静态资源 + 后端独立目录”的结构。这种结构保证了现有的静态网站架构不受影响，同时为后端服务提供了独立的开发环境。

```text
C:\dev_code\chinamedicaltour\           <-- [Root] 项目根目录
├── .git/
├── .gitignore
├── index.html                          <-- [Frontend] 现有网站入口
├── assets/                             <-- [Frontend] 静态资源 (CSS, JS, Images)
│   ├── js/
│   │   └── chat-widget.js              <-- [New] 负责与后端通信的前端组件
│   └── css/
├── docs/                               <-- [Docs] 项目文档
│   ├── roadmap-cs.md                   <-- [New] 文档导航
│   ├── deployment-guide-cs.md
│   ├── architecture-design-cs.md
│   ├── development-specs-cs.md
│   └── plan-cs.md
│
└── workers/                            <-- [Backend] 后端服务根目录 (新建)
    ├── smart-cs/                       <-- [Worker] 智能客服对外服务
    └── ops/                            <-- [Worker] 知识库上传与重建后台
        ├── .dev.vars                   <-- [Local] 本地开发 Secrets (gitignored)
        ├── .gitignore                  <-- Worker 专用的 gitignore
        ├── package.json                <-- 依赖管理
        ├── wrangler.jsonc              <-- Worker 配置文件
        └── src/
            └── index.js                <-- Worker 核心逻辑代码
```

### 1.1 目录职责说明
*   **根目录 (Root)**: 继续作为静态网站的主体。
*   **`workers/`**: 这是一个新的独立工作区。所有的后端逻辑、API 密钥配置、Wrangler 配置都**只**存在于此目录下。
*   **`assets/js/chat-widget.js`**: 这是前后端的“连接点”。它负责拼接完整的 API URL (如 `https://api.chinamedicaltour.org/api/chat`) 并发起请求。

## 2. 部署策略与环境配置

### 2.1 部署配置 (wrangler.jsonc)
当前 smart-cs 直接以生产配置为主（无 staging），路由统一为 `/api/chat`。

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "smart-cs-prod",
  "main": "src/index.js",
  "compatibility_date": "2025-01-01",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true
  },
  "routes": [
    { "pattern": "api.chinamedicaltour.org/api/chat*", "zone_name": "chinamedicaltour.org" }
  ],
  "vars": {
    "ALLOWED_ORIGINS": "https://chinamedicaltour.org,https://sjiangtao2024.github.io",
    "LONGCAT_API_ENDPOINT": "https://api.longcat.example/v1/chat/completions",
    "MODEL_NAME": "longcat-flash-v2",
    "TIMEOUT_MS": 10000,
    "RAG_ENABLED": "true"
  }
}
```

### 2.2 Secrets 管理 (API Keys)
采用**逗号分隔字符串**管理多个 Key，简化运维。
变量名: `LONGCAT_API_KEYS`

**本地开发 (Local):**
创建 `workers/smart-cs/.dev.vars` 文件 (注意：此文件必须在 .gitignore 中):
```text
LONGCAT_API_KEYS=sk-test-key-1,sk-test-key-2,sk-test-key-3
```

**线上环境 (Production):**
```bash
# 设置/更新 Keys
npx wrangler secret put LONGCAT_API_KEYS
# 输入值: sk-prod-key-1,sk-prod-key-2,sk-prod-key-3
```

### 2.3 部署命令
```bash
# 部署 smart-cs (生产)
npx wrangler deploy

# 部署 ops (后台)
cd workers/ops
npx wrangler deploy
```

## 3. 开发与验证

### 3.1 本地开发流程
1.  **启动 Worker**:
    ```bash
    cd workers/smart-cs
    # 启动本地服务，默认加载 .dev.vars
    npx wrangler dev
    ```
    输出: `Ready on http://localhost:8787`

2.  **验证接口**:
    ```bash
    # 测试 CORS + SSE（会持续输出 data: ...）
    curl -N -v -X POST http://localhost:8787/api/chat \
      -H "Content-Type: application/json" \
      -H "Accept: text/event-stream" \
      -H "Origin: http://127.0.0.1:5500" \
      -d '{"messages":[{"role":"user","content":"ping"}], "stream":true}'
    ```

3.  **覆盖 API Endpoint (可选)**:
    如果本地想 Mock Longcat API，可以在启动时覆盖变量：
    ```bash
    npx wrangler dev --var LONGCAT_API_ENDPOINT:http://localhost:3000/mock
    ```

### 3.2 CORS 验证指南
**验证 OPTIONS (预检):**
```bash
curl -I -X OPTIONS https://smart-cs-prod.<your-subdomain>.workers.dev/api/chat \
  -H "Origin: https://chinamedicaltour.org" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```
*   **预期**: `200 OK`, `Access-Control-Allow-Origin: https://chinamedicaltour.org`, `Access-Control-Allow-Headers: Content-Type`.
*   **注意**: 绑定自定义域 (`api.chinamedicaltour.org`) 后，需确保 `ALLOWED_ORIGINS` 包含该域名的前端调用源。

## 4. 运维与监控

### 4.1 日志监控 (Live Logs)
```bash
# 查看生产日志，关注 key_slot 字段（索引/匿名 ID）
npx wrangler tail --env production --sampling-rate 0.1 --format=pretty
```

### 4.2 容错机制说明
*   **重试逻辑**: Worker 内部配置了 `MAX_RETRIES` (默认 3)。
    *   **机制**: 每次请求失败 (429/5xx)，Worker 会自动切换到下一个可用的 Key 进行重试。
    *   **日志**: 失败的尝试会记录日志 `{"level": "warn", "key_id": "xxx", "status": 429, "action": "retry_next_key"}`。
    *   **回退**: 当前请求内不会回退到已失败的 Key。

### 4.3 故障恢复
*   **API Key 轮换**: 直接使用 `wrangler secret put` 更新，无需重新部署代码。
*   **版本回滚**: 在 Cloudflare Dashboard 操作，或使用 `npx wrangler rollback <id> --env production`。

## 5. 常见问题
*   **Q: 为什么本地测试报 403 Forbidden?**
    *   A: 检查 `Origin` 头是否在 `ALLOWED_ORIGINS` 列表中。本地开发通常是 `http://127.0.0.1:5500`。
*   **Q: 为什么自定义域不生效?**
    *   A: 确保 Cloudflare DNS 记录已添加，且 Worker 的 `routes` 配置正确匹配了该域名。
