# Longcat API 集成指南与调研报告

**生成日期:** 2025-12-21
**来源:** [Longcat 官方文档](https://longcat.chat/platform/docs/zh/)

## 1. 核心参数

| 特性 | 说明 | 备注 |
| :--- | :--- | :--- |
| **兼容协议** | OpenAI (`/v1/chat/completions`) <br> Anthropic (`/v1/messages`) | 本项目目前使用 OpenAI 格式，完全兼容。 |
| **推荐模型** | `LongCat-Flash-Chat` | 适用于通用对话 (替代原本配置的 `longcat-flash-v2`) |
| **思考模型** | `LongCat-Flash-Thinking` | 适用于复杂推理任务 (响应较慢，暂不推荐用于客服) |
| **最大输出** | 8,192 Tokens (8K) | 单次回复的最大长度 |
| **上下文窗口** | (未明确标出，通常 Longcat 系列支持长文本) | 建议控制在 32k 以内以保证响应速度 |

## 2. 配额与限制 (Rate Limits)

*   **每日额度:**
    *   **默认:** 500,000 (50万) Tokens / 天
    *   **申请后:** 5,000,000 (500万) Tokens / 天
    *   **计费:** 输入 (Prompt) + 输出 (Completion) 均计入。
*   **限流行为:** 超过额度或并发限制时，返回 HTTP `429 Too Many Requests`。
*   **并发限制:** 未明确，建议客户端做好重试机制。

## 3. 集成最佳实践

### 请求头 (Headers)
```json
{
  "Authorization": "Bearer YOUR_APP_KEY",
  "Content-Type": "application/json"
}
```

### 推荐参数 (Payload)
```json
{
  "model": "LongCat-Flash-Chat",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "stream": true,
  "temperature": 0.5
}
```

## 4. 对 Smart CS 项目的影响

1.  **模型名称**: 需将 `wrangler.jsonc` 中的 `MODEL_NAME` 更新为 `LongCat-Flash-Chat`。
2.  **错误处理**: 必须保留并测试 `429` 错误捕获逻辑 (目前 `index.js` 已实现)。
3.  **知识注入**: 由于文档未提及 Function Calling，必须依赖 **System Prompt** 进行知识库注入。

## 5. System Prompt 策略 (知识库注入)

由于无法挂载外部工具，我们需要将网站的核心业务逻辑压缩到 System Prompt 中。

**建议结构:**
1.  **身份定义:** 医疗旅游助手。
2.  **核心服务:** 体检 (301/协和)、中医、签证 (144h)、支付。
3.  **边界控制:** 拒绝政治/编程/无关话题。
4.  **语言控制:** 始终用从用户的语言回答。
