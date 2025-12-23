# 智能客服系统指南（Sunny AI）

本文档说明 China Medical Tour 智能客服（Sunny）的定位、核心功能、配置与运维要点。

## 1. 系统概览

**Sunny** 是面向海外客户的智能客服助手：

- **人设**：Sunny（小晴），友好、专业、年轻的中文女性形象
- **回复语言**：强制英文回答（避免中英文混用）
- **核心能力**：围绕医疗旅游（套餐、支付、签证、流程）提供咨询
- **技术栈**：Cloudflare Workers（后端）+ 站点内嵌前端组件（Widget）

## 2. 核心功能

### A. 页面上下文感知（Context Injection）
前端会识别用户当前页面，并在请求中附带上下文提示，让 AI 优先回答相关主题。

- **实现位置**：`public/assets/js/chat-widget.js`
- **方式**：根据 `window.location.pathname` 生成 `System Context`
- **表现**：不同页面的欢迎语与推荐问题会变化

### B. 快捷问题（Quick Replies）
在聊天入口显示与页面主题相关的快捷问题，降低用户提问成本。

### C. RAG 知识检索（Vectorize）
当 `RAG_ENABLED` 为 `true` 时，系统会先检索知识库，再把结果拼入系统提示词。

- **向量检索**：Cloudflare Vectorize
- **知识来源**：`workers/smart-cs/knowledge/knowledge.md`
- **更新入口**：`https://ops.chinamedicaltour.org`

### D. 语言守卫（English Guard）
若模型输出出现中文，系统会强制回退为英文提示，保证统一语言体验。

### E. 聊天记录保留（D1）
聊天记录写入 D1，并按 `LOG_RETENTION_DAYS` 自动清理。
新增字段包含 `assistant_summary`（自动摘要）、`rating`（1–5 星）、`page_url`、`page_context`。
导出入口：`https://api.chinamedicaltour.org/admin/exports`（需 Admin Token）。

## 3. 配置与维护

### 3.1 前端配置
- `public/assets/js/chat-widget.js`：页面上下文、欢迎语、快捷问题

### 3.2 后端核心配置
- `workers/smart-cs/src/lib/knowledge-base.js`：系统提示词与基础规则
- `workers/smart-cs/src/lib/rag-runtime.js`：RAG 检索逻辑
- `workers/smart-cs/src/lib/english-guard.js`：英文守卫逻辑

### 3.3 知识库更新
- 源文件：`workers/smart-cs/knowledge/knowledge.md`
- 上传入口：`https://ops.chinamedicaltour.org`
- 详细流程：见 `docs/ops-knowledge-guide.zh.md`

### 3.4 Ops Admin Token（后台登录）
- **用途**：访问 `ops.chinamedicaltour.org` 的登录与上传功能
- **当前 Token**：`eZfpq4Mofu9sB42srYOvA78dmmHEKZij`
- **配置方式**：`wrangler secret put ADMIN_TOKEN`
- **轮换建议**：每 1–3 个月轮换一次并同步更新此文档

## 4. 部署

### 4.1 部署 smart-cs（生产）
```bash
cd workers/smart-cs
npx wrangler deploy
```

### 4.2 部署 ops（后台）
```bash
cd workers/ops
npx wrangler deploy
```

## 5. 常见问题

- **AI 仍在输出中文？**
  检查 `ENFORCE_ENGLISH` 是否为 `true`，以及系统提示词是否被覆盖。
- **RAG 没有生效？**
  确认 `RAG_ENABLED` 为 `true`，且知识库上传成功（查看 ops 状态）。
- **聊天日志太多？**
  调整 `LOG_RETENTION_DAYS`，并重新部署 smart-cs。
