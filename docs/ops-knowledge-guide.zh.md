# Ops 知识库后台使用说明（中文）

## 用途
该后台用于上传和维护智能客服的知识库内容（Markdown）。上传后系统会自动重建向量索引。

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
1) 选择 Markdown 文件或手动编辑内容
2) 点击 **Save & Upload**
3) 页面会显示重建状态（running → success/failed）

## Update Note 说明
`Update Note` 用于记录本次更新原因，便于审计和回溯，会随文件一起保存为元数据。

## 存储位置（R2）
为避免混淆，知识库文件和状态文件统一放在专门目录：
- 知识库文件：`rag/knowledge/knowledge.md`
- 重建状态：`rag/knowledge/status.json`

## 注意事项
- 每次上传都会触发“全量重建”。
- 系统会尝试删除旧向量，避免残留数据影响检索。
- 如促销活动下线，删除对应内容后重新上传即可。

## 快速测试
- 上传后等待 10–30 秒
- 若已开启 RAG，可直接向客服问套餐/促销相关问题验证

