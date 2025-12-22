# 智能客服 RAG + 运维上传设计

## 背景
当前智能客服 Worker（`workers/smart-cs`）使用 `workers/smart-cs/src/lib/knowledge-base.js` 中的大段系统提示词。该方式可用，但非技术人员无法更新，并且每次请求的 token 体积偏大。站点已在 `https://chinamedicaltour.org` 上线，并调用 `https://api.chinamedicaltour.org/api/chat`。

## 目标
- 让非技术人员无需改代码即可更新知识库。
- 用户侧聊天流程不变。
- 通过检索注入减少提示词体积。
- 使用简单 admin token 完成权限控制。

## 非目标
- 短期替换 longcat 模型。
- 构建复杂认证体系（SSO、角色等）。
- 引入多渠道（微信等）。

## 约束
- 使用 Cloudflare 相关服务（Workers、R2、Vectorize、Workers AI Embeddings）。
- 初期使用单一共享 admin token。
- 聊天 Worker 与运维 Worker 分离部署。

## 方案架构
- **smart-cs Worker（对外）**：
  - 接收 `chinamedicaltour.org` 的聊天请求。
  - 使用 Workers AI 生成 query embedding。
  - 从 Vectorize 检索 Top‑K 片段。
  - 构建精简提示词（规则 + 片段）。
  - 调用 longcat API 生成回复。
- **ops Worker（内部）**：
  - 通过 `ops.chinamedicaltour.org` 提供登录页。
  - 校验共享 admin token。
  - 提供编辑器，内容转换为 Markdown。
  - 上传到 R2 固定路径（例如 `knowledge/knowledge.md`）。
- **R2 事件流水线**：
  - R2 对象变更触发 Worker/Workflow 重建索引。
  - 拉取 Markdown，分块，生成 embedding，写入 Vectorize。

## 数据流
1. 管理员在 `ops.chinamedicaltour.org` 登录并编辑内容。
2. 前端将内容转为 Markdown 并上传到 R2。
3. R2 触发重建流程：
   - 解析 Markdown -> 分块。
   - Workers AI 生成 embedding。
   - Vectorize upsert 向量（带 metadata）。
4. 用户聊天请求：
   - smart-cs 生成 query embedding。
   - Vectorize 返回 Top‑K 片段。
   - smart-cs 拼接提示词并调用 longcat。

## 内容格式
- 推荐上传 Markdown。
- Vectorize metadata 建议包含：章节标题、来源、更新时间、语言。
- 分块大小建议 500–800 tokens（可调）。

## 错误处理
- 上传失败：前端提示原因并保留草稿。
- 重建失败：写日志并保留旧索引。
- smart-cs 检索失败时降级为最小提示词。

## 安全
- ops 侧每次上传校验共享 admin token。
- token 定期轮换并记录更新时间。
- ops 域名与对外服务隔离，便于审计。

## 可观测性
- 上传日志：操作者、时间、版本。
- 重建日志：分块数量、embedding 次数、耗时。
- 检索日志：Top‑K、检索耗时。

## 免费额度注意事项
- Workers AI：10,000 Neurons/天。
- Vectorize（Workers Free）：
  - 30 million queried vector dimensions / 月。
  - 5 million stored vector dimensions。
- 当前内容体量很小，Vectorize 免费额度足够。
- Workers AI 主要用于 embedding，回复继续走 longcat。

## 上线步骤
1. 保留现有系统提示词作为兜底。
2. 增加 ops Worker + R2 上传。
3. 启用 R2 触发重建 Vectorize。
4. smart-cs 切换为 RAG 注入知识。
5. 观察质量与延迟，调整分块与 Top‑K。

## 待确认问题
- 具体 embedding 模型与维度。
- Top‑K 默认值与检索失败策略。
- 知识库是否仅单一文件或支持多文件。
