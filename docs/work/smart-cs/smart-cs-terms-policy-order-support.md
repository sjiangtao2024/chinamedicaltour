# Smart-CS Terms/Policy 与订单支持说明

## 目标
- 让智能客服仅基于官方知识库回答 Terms/Policy 问题。
- 支持订单查询与疑问解答（只读），不在客服内执行退款/取消/修改。
- 避免“超出知识库范围”的回答。

## 范围
### 1) Terms/Policy 相关
- 退款条件与时限（含例外/不可退）。
- 治疗/服务流程（咨询 -> 评估 -> 付款 -> 到院 -> 报告/随访）。
- 订单争议与处理流程。
- 付款方式范围与限制（PayPal/Alipay/WeChat Pay）。

### 2) 订单相关
- 查询订单状态与关键字段（订单状态、金额、币种、更新时间、服务类型）。
- 订单疑问答复（仅基于订单 API 输出与知识库说明）。
- 退款/取消/修改统一引导至 Member Center。

## 依赖与入口
- 知识库更新入口：`workers/ops`（`ops.chinamedicaltour.org` 上传 Markdown，重建向量索引）。
- RAG 查询入口：`workers/smart-cs/src/lib/rag-runtime.js`。
- Orders API：`workers/members`（详见 `docs/dev/upgrade-2025-payments/members-api.md`）。

## 知识库内容规范（Terms/Policy）
### 结构要求
- 必须使用“标题 + Q&A + 条件/限制/流程”结构。
- 每条政策必须包含明确关键词（refund/cancellation/treatment flow/dispute）。
- 对关键政策提供固定模板回答，禁止扩展性解释。

### 必备条目（至少覆盖）
- Refund Policy（可退款/不可退款/时限）
- Cancellation Policy
- Treatment Flow / Service Flow
- Dispute & Support Flow
- Payment Methods Scope

### 版本与更新
- 若条款变更，需同步前端与后端版本号（见 `docs/work/legal/terms-update-checklist.md`）。
- 每次知识库更新需记录版本与更新时间说明（ops 上传 note 字段）。

## 智能客服回答边界
### RAG-only 规则
- Terms/Policy/订单/退款/流程相关问题必须仅基于 RAG 或订单 API。
- 未命中或命中置信度不足必须拒答并引导人工。
### 订单操作引导
- 退款/取消/修改类问题统一引导至 Member Center：`https://chinamedicaltour.org/member-center`

### 拒答模板（示例）
- “I’m sorry, I don’t have that policy detail in our official knowledge base. Please contact support at https://chinamedicaltour.org/contact.”

## 订单支持流程（高层）
1) 意图识别
   - Terms/Policy
   - 订单查询
   - 订单疑问
2) Terms/Policy -> RAG 检索
3) 订单查询 -> 调用 Members API（只读）
4) 退款/取消/修改 -> 引导至 Member Center
5) 身份校验失败 -> 拒答 + 引导登录或提交工单

## Members API 对接要点
### 查询订单（只读）
- `GET /api/orders/:id`（需 JWT）
- 输出用于客服答复：status, amount, currency, updated_at, item_type, item_id

### 验证要求
- 订单查询必须验证用户身份（JWT）。
- 无身份校验时禁止提供订单信息。

## 质量与验收
- RAG 空命中/低分命中必须拒答。
- 订单查询必须走 API，不允许模型推测。
- 退款/取消/修改统一引导 Member Center，不在客服内执行。
- 回答不得出现超出知识库的退款条款或流程细节。

## 相关文档
- `docs/work/legal/terms-update-checklist.md`
- `docs/dev/upgrade-2025-payments/members-api.md`
- `docs/dev/plans/2026-01-14-refund-policy-spec.md`
