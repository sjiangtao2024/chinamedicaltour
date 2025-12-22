# 智能客服系统架构设计 (Smart CS v1)

**版本:** v1.0
**日期:** 2025-12-21
**状态:** 已实施

## 1. 系统概览

智能客服系统旨在为国际患者提供关于“中国医疗旅游”的即时咨询服务。它采用 Serverless 架构，后端作为 API 网关连接 Longcat AI 模型。

### 核心组件
*   **前端:** 纯静态 JS/CSS (`public/assets/js/chat-widget.js`)，负责 UI 渲染和 SSE 流式接收。
*   **后端:** Cloudflare Worker (`workers/smart-cs`), 负责业务逻辑、密钥管理和 CORS。
*   **AI 模型:** Longcat Flash Chat (兼容 OpenAI 接口)。
*   **知识库:** 硬编码在 Worker 中的精简业务知识 (`src/lib/knowledge-base.js`)。

## 2. 目录结构变更 (Security Update)

为了防止后端源码泄露，项目采用了**动静分离**策略：

```text
root/
├── public/           <-- Cloudflare Pages 的构建输出目录 (对外公开)
│   ├── index.html
│   ├── assets/
│   └── docs/
├── workers/          <-- Cloudflare Workers 源码 (仅 Git 托管，不发布到 Pages)
│   └── smart-cs/
│       ├── src/
│       │   ├── index.js          # 入口 (注入 System Prompt)
│       │   └── lib/
│       │       ├── key-manager.js # 多 Key 轮询
│       │       └── knowledge-base.js # 核心知识库
│       └── wrangler.jsonc        # Worker 配置
├── .gitignore
└── package.json
```

## 3. 关键功能模块

### A. 知识库注入 (System Prompt)
由于 Longcat 暂不支持 Function Calling，我们采用 **System Prompt Injection** 模式。
*   **实现:** `src/lib/knowledge-base.js` 导出一个包含 Markdown 格式知识点的字符串 `CORE_KNOWLEDGE`。
*   **内容:** 涵盖 Medical Packages (价格/内容), Visa Policy (144h/15d), Payment (Alipay), Hospital Info。
*   **逻辑:** 每次请求前，`index.js` 会自动将 `getSystemPrompt()` 的结果插入 `messages` 数组的第一位。

### B. 多 Key 轮询与高可用
*   **背景:** 单个 Key 可能触发 Rate Limit (429)。
*   **实现:** `src/lib/key-manager.js`
*   **策略:**
    1.  从环境变量 `LONGCAT_API_KEYS` 读取逗号分隔的 Key 列表。
    2.  请求失败 (429/5xx) 时，自动标记当前 Key 为“冷却中 (Cooldown)”。
    3.  重试逻辑最多尝试 3 次，自动切换到下一个可用 Key。

### C. 流式响应 (SSE)
*   后端使用 Server-Sent Events 标准格式透传 AI 的打字机效果。

## 4. 配置参数 (wrangler.jsonc)

| 变量名 | 值 (示例) | 说明 |
| :--- | :--- | :--- |
| `MODEL_NAME` | `LongCat-Flash-Chat` | 必须精确匹配官方文档 |
| `TIMEOUT_MS` | `15000` | 超时时间 (毫秒) |
| `LONGCAT_API_KEYS` | (Secret) | 逗号分隔的密钥串，通过 `wrangler secret put` 设置 |

## 5. 限制与未来规划
*   **当前限制:** 知识库是静态的，网站更新后需要手动更新 `knowledge-base.js` 并重新部署 Worker。
*   **未来规划:** 引入 Cloudflare Vectorize 实现 RAG (检索增强生成)，实现知识库的自动同步。
