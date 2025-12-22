# Ops 知识库后台使用说明（中文）

## 用途
该后台用于上传和维护智能客服的知识库内容（Markdown）。上传后系统会自动重建向量索引。

## 知识库来源（仓库）
知识库的**源文件**统一放在仓库中，便于版本管理：
- `workers/smart-cs/knowledge/knowledge.md`

运营更新后建议同步提交到仓库，避免线上内容与代码记录不一致。

## 访问地址
- https://ops.chinamedicaltour.org

## 登录
1) 输入 Admin Token
2) 点击 **Login**
3) 登录后进入编辑区

## 上传方式
支持两种方式：
- **上传 Markdown 文件**（推荐）
- **直接在编辑区粘贴/编辑 Markdown**

## 上传流程
1) 从仓库 `workers/smart-cs/knowledge/knowledge.md` 复制内容，或直接上传该文件
2) 填写 `Update Note`（可选，但建议）
3) 点击 **Save & Upload**
4) 页面会显示重建状态（running → success/failed）

## Update Note 说明
`Update Note` 用于记录本次更新原因，便于审计和回溯，会随文件一起保存为元数据。

## 重建状态说明
状态在页面中自动刷新：
- `running`: 正在重建
- `success`: 重建完成，显示 chunk 数与 upsert 数
- `failed`: 重建失败，显示错误信息

如果上传的是同一份内容，也会触发一次**全量重建**，旧向量会被清理并重建，不会累积脏数据。

## 存储位置（R2）
为避免混淆，知识库文件和状态文件统一放在专门目录：
- 知识库文件：`rag/knowledge/knowledge.md`
- 重建状态：`rag/knowledge/status.json`

## RAG 开关（smart-cs）
如需启用/关闭 RAG，在 `workers/smart-cs/wrangler.jsonc` 中调整：
- `RAG_ENABLED`: `"true"` 或 `"false"`
- 修改后需重新部署 smart-cs：
  ```bash
  cd workers/smart-cs
  npx wrangler deploy
  ```

## 注意事项
- 每次上传都会触发“全量重建”。
- 系统会尝试删除旧向量，避免残留数据影响检索。
- 如促销活动下线，删除对应内容后重新上传即可。

## 快速测试
- 上传后等待 10–30 秒
- 若已开启 RAG，可直接向客服问套餐/促销相关问题验证
