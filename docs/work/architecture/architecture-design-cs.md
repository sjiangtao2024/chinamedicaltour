# 智能客服 (Smart CS) 架构设计与最佳实践

本文档详细描述了 China Medical Tour 智能客服系统的架构设计、安全策略及最佳实践。基于 Cloudflare Workers 和 Longcat API 构建。

## 1. 核心架构设计

### 1.1 系统数据流
```mermaid
graph LR
    User[用户 (Browser)] -- "HTTPS (流式传输)" --> Worker[Cloudflare Worker]
    
    subgraph "Cloudflare Edge"
        Worker -- "鉴权 & 路由" --> Strategy{Key 轮询与冷却}
        Strategy -- "健康 Key" --> Key1[API Key 1]
        Strategy -- "故障转移 (Failover)" --> Key2[API Key 2]
    end
    
    subgraph "AI Provider"
        Key1 --> LongcatAPI[Longcat AI API]
        Key2 --> LongcatAPI
    end
    
    LongcatAPI -- "SSE Stream" --> Worker
    Worker -- "SSE Stream" --> User
```

### 1.2 关键策略：Key 轮询与冷却 (Rotation with Health Check)
采用**带健康检查的轮询 + 冷却 (Cooldown)** 策略，而非简单的主备或随机：
1.  **轮询**: 默认在所有状态为 `ACTIVE` 的 Key 中轮询使用。
2.  **冷却**: 若某个 Key 请求返回 `429` (Rate Limit) 或 `5xx`，将其标记为 `COOLDOWN` (暂定 60s)，期间不再分发请求。
3.  **故障转移**: 当前 Key 失败时，立即尝试下一个可用 Key (Worker 内部自动重试，对用户透明)。

## 2. 安全性与成本控制 (Security & Cost)

### 2.1 环境变量管理与配置格式
推荐使用 `wrangler.jsonc`。

#### 示例 `wrangler.jsonc` 配置：
```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "smart-cs",
  "main": "src/index.js",
  "compatibility_date": "2025-01-01",
  "vars": {
    "ALLOWED_ORIGINS": "https://chinamedicaltour.org,https://sjiangtao2024.github.io,http://127.0.0.1:5500,http://localhost:8000"
  },
  // 环境定义请参考 docs/deployment-guide-cs.md
}
```

*   **敏感信息 (Secrets)**: API Key **严禁**写入配置文件。

### 2.2 严格的 CORS 策略
Worker 应只允许受信任的域名调用。

```javascript
// Worker 示例：处理 CORS
function getCorsHeaders(requestOrigin, env) {
  const allowed = (env.ALLOWED_ORIGINS || "").split(",");
  if (allowed.includes(requestOrigin)) {
    return {
      "Access-Control-Allow-Origin": requestOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400"
    };
  }
  return null;
}
```

### 2.3 速率限制 (Rate Limiting)
*   **WAF 规则 (推荐)**：在 Cloudflare 仪表盘设置 WAF 规则，限制每个 IP 每分钟的请求次数。
*   **Worker 内部限制**：可选 Cloudflare KV 记录 IP 请求计数。

## 3. AI 交互体验优化 (UX)

### 3.1 流式响应 (Streaming / SSE)
为了降低感知的延迟，**必须**使用流式传输。
*   **后端**：Worker 调用 Longcat API 时开启 `stream: true`。
*   **前端**：使用 `EventSource` 或 `fetch` + `ReadableStream`。

### 3.2 上下文与人设 (Context & System Prompt)
Worker 是无状态的，状态需由前端维护。
*   **System Prompt**: 见 `plan-cs.md` 接口契约。
*   **历史记录**: 前端负责截断和传递。

## 4. 前端集成规范

详见 `plan-cs.md`。

## 5. 开发路线图 (Roadmap)
详见 `development-specs-cs.md` 的 Task 列表。
