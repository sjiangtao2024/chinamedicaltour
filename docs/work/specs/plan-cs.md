# 智能客服技术规格书 (Technical Specification)

本文档定义了智能客服系统的详细技术规格，包括接口契约、内部逻辑策略、前端集成规范及非功能性需求。

## 1. 接口契约 (Interface Contract)

### 1.1 对话接口 (Chat Completions)
*   **Public URL**: `https://api.chinamedicaltour.org/api/chat`
*   **Method**: `POST`
*   **Headers**:
    *   `Content-Type`: `application/json`
    *   `Authorization`: **无需前端传递** (Worker 内部注入)

#### 请求体 (Request Body)
```json
{
  "messages": [
    { "role": "system", "content": "..." }, // 可选
    { "role": "user", "content": "你好，我想咨询签证" }
  ],
  "stream": true,      // 强制 true
  "temperature": 0.5
}
```

#### 响应 (Response)
*   **Success (200 OK)**:
    *   **Format**: Server-Sent Events (SSE)
    *   **Stream**: 兼容 OpenAI 格式 (`data: {"choices": ...}`)

*   **Error Handling (错误码映射)**:
    | HTTP Status | Error Code | UI 文案 | 处理策略 |
    | :--- | :--- | :--- | :--- |
    | 400 | `invalid_request` | "请求格式有误，请刷新页面重试。" | 不重试 |
    | 429 | `rate_limit_exceeded` | "咨询人数过多，请稍等片刻。" | 建议指数退避重试 |
    | 503 | `upstream_service_unavailable` | "AI 服务暂不可用，请稍后重试。" | 允许用户点击重试 |
    | 504 | `gateway_timeout` | "连接超时，请检查网络。" | 前端自动重试 1 次 |

### 1.2 历史记录截断策略 (Token Truncation)
为防止 Context Window 溢出，Worker 执行以下截断逻辑：

1.  **估算算法 (v1)**:
    *   由于 Worker 引入 tokenizer 库过大，v1 采用字符估算：
    *   `Token Count ≈ (中文数 * 2) + (英文数 * 0.3)`
    *   **保底限制**: 总字符数 > 6000 时触发截断。
2.  **截断行为**:
    *   保留 `System Prompt`。
    *   从最早的对话开始移除 `User + Assistant` 消息对，直到总字符数 < 6000。
3.  **未来计划**: v2 版本引入 `tiktoken` (WASM) 或轻量级分词器。

## 2. 后端核心策略 (Worker Logic)

### 2.1 高级 Key 轮询 (Key Rotation)
*   **Key 加载**:
    *   从环境变量 `LONGCAT_API_KEYS` 读取逗号分隔的字符串。
    *   解析为 Key 数组：`keys = env.LONGCAT_API_KEYS.split(',').map(k => k.trim()).filter(k => k)`。

*   **状态存储**: **Instance Memory** (当前 Worker 实例内存)。
    *   *注意*: 由于 Worker 是无状态且分布式的，Key 的冷却状态**不是全局同步**的。这意味着不同地区的请求可能使用同一 Key，但单个实例内会避免使用已标记冷却的 Key。
    *   *未来计划*: 迁移至 Cloudflare Durable Objects 以实现全局状态同步。

*   **轮询逻辑**:
    1.  优先选择 `status=ACTIVE` 的 Key。
    2.  若遇到 429/5xx，将当前 Key 标记为 `COOLDOWN` (TTL: 60s)。
    3.  立即切换至下一个 Key 重试 (最多 3 次)。

## 3. 前端集成规范 (Integration)

### 3.1 UI 状态机与超时
前端需维护以下连接状态：

*   **Connecting (连接中)**:
    *   用户发送消息，建立 Fetch 连接。
*   **Awaiting First Byte (等待首字节)**:
    *   **超时策略**: 若 **5秒** 内未收到 SSE 的第一个数据包，前端应主动 `abort()` 请求。
    *   **重试**: 自动重试 1 次；若仍超时，转入 Error 状态。
*   **Streaming (传输中)**:
    *   **超时策略**: 若数据流中断超过 **10秒**，视为连接断开。

### 3.2 配置注入
`chat-widget.js` 需支持从 HTML 属性或全局变量读取配置：
```html
<script 
  src="assets/js/chat-widget.js" 
  data-api-url="https://api.chinamedicaltour.org/api/chat"
  data-retry="3"
  defer>
</script>
```

## 4. 非功能性需求 (NFR)
... (保持原有内容)