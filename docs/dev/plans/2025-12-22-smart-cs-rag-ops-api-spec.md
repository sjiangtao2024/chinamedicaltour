# 智能客服 RAG 运维上传接口草案

## 范围
本文描述 ops Worker 的最小可用接口，用于知识库上传与索引重建触发。生产聊天接口保持不变（`/api/chat`），不在此文档展开。

## 域名与路径
- 入口域名: `https://ops.chinamedicaltour.org`
- 基础路径: `/` 和 `/api/*`

## 鉴权方式
- 使用单一共享 admin token。
- 推荐在请求头携带: `Authorization: Bearer <ADMIN_TOKEN>`。
- 所有写操作必须校验 token。

## 环境变量
- `ADMIN_TOKEN`: ops 后台共享 token。
- `R2_BUCKET`: 知识库文件所在的 R2 bucket。
- `KNOWLEDGE_KEY`: 固定对象 key，例如 `knowledge/knowledge.md`。
- `VECTOR_INDEX`: Vectorize 索引名称。
- `EMBEDDING_MODEL`: Workers AI embedding 模型名称。

## 接口列表

### 1) 获取后台页面
**GET /**
- 说明: 返回登录/编辑页面 HTML。
- 认证: 无。
- 响应: `200 text/html`。

### 2) 校验 token
**POST /api/auth**
- 说明: 校验 token 是否有效。
- 请求头:
  - `Authorization: Bearer <ADMIN_TOKEN>`
- 响应:
  - 成功: `200 { "ok": true }`
  - 失败: `401 { "ok": false, "error": "unauthorized" }`

### 3) 上传知识库内容
**POST /api/knowledge**
- 说明: 上传 Markdown 内容并写入 R2。
- 请求头:
  - `Authorization: Bearer <ADMIN_TOKEN>`
  - `Content-Type: application/json`
- 请求体:
  ```json
  {
    "content_markdown": "# Title\n...",
    "note": "optional update note",
    "version": "optional client version"
  }
  ```
- 响应:
  - 成功: `200 { "ok": true, "key": "knowledge/knowledge.md", "updated_at": "ISO8601" }`
  - 失败:
    - `400 invalid_request`
    - `401 unauthorized`
    - `500 upload_failed`

### 4) 手动触发重建（可选）
**POST /api/rebuild**
- 说明: 手动触发向量重建，用于兜底或调试。
- 请求头:
  - `Authorization: Bearer <ADMIN_TOKEN>`
- 响应:
  - 成功: `202 { "ok": true, "job_id": "..." }`
  - 失败:
    - `401 unauthorized`
    - `500 rebuild_failed`

### 5) 查询最近构建状态（可选）
**GET /api/status**
- 说明: 返回最近一次重建状态。
- 请求头:
  - `Authorization: Bearer <ADMIN_TOKEN>`
- 响应:
  ```json
  {
    "ok": true,
    "last_success_at": "ISO8601",
    "last_error": null,
    "chunks": 42,
    "duration_ms": 8123
  }
  ```

## 自动重建流程（R2 事件）
- 触发: R2 对象 `knowledge/knowledge.md` 更新。
- 动作:
  1. 拉取 Markdown。
  2. 清洗/分块（500-800 tokens）。
  3. 生成 embedding。
  4. upsert Vectorize（包含 metadata）。
- 失败处理: 记录错误并保留旧索引。

## 错误码约定
- `invalid_request`: 请求体缺失或格式非法。
- `unauthorized`: token 无效或缺失。
- `upload_failed`: 写入 R2 失败。
- `rebuild_failed`: 向量重建失败。
- `internal_error`: 其他系统错误。

## 速率限制（建议）
- 上传接口: 每分钟 5 次。
- 重建接口: 每 10 分钟 1 次。

## 日志字段（建议）
- `request_id`, `ip`, `user_agent`。
- `knowledge_key`, `version`, `note`。
- `chunks`, `embedding_calls`, `duration_ms`。
