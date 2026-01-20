# Smart-CS Terms/Policy & Order Support Plan

## 1. 背景与目标
当前智能客服已上线并接入 PayPal 支付。需要实现两个核心目标：
1) 让客服准确掌握并回答 Terms 与 Policy（退款、流程等）。
2) 支持订单查询、订单退款、订单疑问解答。
同时必须避免在上述两类问题中产生超出知识库范围的回答。

## 2. 当前代码现状（基于现有实现）
- RAG 注入：`workers/smart-cs/src/lib/rag-runtime.js` 使用 Vectorize 检索，命中后注入 System Prompt。
- 兜底：当检索不到 RAG chunk 时直接使用 System Prompt（允许一般常识回答）。
- 知识库：`workers/smart-cs/knowledge/knowledge.md` 目前包含服务、签证、支付方式、FAQ，但缺少 terms/policy 与订单退款细节。
- 运营入口：`workers/ops` 提供后台页面与 API（上传 Markdown → 写入 R2 → 重建向量索引）。

## 3. 文档交付物（本阶段）
- Terms/Policy 知识结构与内容规范（Q&A/模板/关键词）。
- Smart-CS 回答边界与拒答策略规范。
- 订单查询/退款的 API 合约与流程说明。
- 测试与验收清单。

## 4. 知识库更新方案（Terms/Policy）
### 4.1 内容结构要求
- 必须使用“明确标题 + 问答模板 + 条件/限制/流程”形式。
- 每条政策包含关键词（refund/cancellation/treatment flow/dispute），便于检索命中。
- 对关键政策使用固定模板回答，避免模型扩展。

### 4.2 必须覆盖的主题
- 退款条件与时限（包含例外与不可退款情况）。
- 治疗/服务流程（咨询 → 评估 → 付款 → 到院 → 报告/随访）。
- 订单争议与客服处理流程。
- 支付方式的范围与限制（PayPal/Alipay/WeChat Pay）。

### 4.3 更新路径
- 通过 `ops.chinamedicaltour.org` 上传 Markdown。
- 写入 R2 并自动重建向量索引。
- 每次更新需要记录版本与变更说明（note 字段）。

## 5. 回答边界与防越界策略
### 5.1 业务类问题“只允许 RAG”
- Terms/Policy/订单/退款/流程相关问题必须只基于 RAG 内容作答。
- 无 RAG 命中时必须拒答并引导联系人工或提交工单。

### 5.2 RAG 相似度阈值
- Vectorize 查询返回 score 时设置最低阈值（如 0.75）。
- 低于阈值视为“无知识”，触发拒答模板。

### 5.3 拒答模板（示例）
- “I’m sorry, I don’t have that policy detail in our official knowledge base. Please contact support at https://chinamedicaltour.org/contact.”

## 6. 订单能力方案
### 6.1 能力范围
- 订单查询（状态、金额、支付方式、最近更新）。
- 订单退款（可退款条件下提交请求）。
- 订单疑问解答（基于订单信息 + RAG）。

### 6.2 API 合约建议
- `POST /api/orders/lookup`
  - 输入：order_id + email/phone + payment_reference
  - 输出：status, amount, currency, updated_at, refundable
- `POST /api/orders/refund`
  - 输入：order_id + email/phone + reason
  - 输出：refund_id, status, eta

### 6.3 身份校验
- 必须验证用户提供的订单号 + 联系方式 + 支付凭证（PayPal 交易号）。
- 校验失败直接拒绝订单查询与退款。

## 7. Smart-CS 处理流程（高层）
1) 意图识别：区分 terms/policy、订单查询、退款请求、其他。
2) Terms/Policy → RAG 检索 → 低分拒答 / 命中答复。
3) 订单查询/退款 → 调用订单 API → 结构化回复。
4) 无法验证身份 → 引导提交工单。

## 8. 测试与验收
- RAG 空命中 → 必须拒答（无自由扩展）。
- RAG 低分命中 → 必须拒答。
- 订单查询成功 / 失败 / 身份校验失败。
- 退款成功 / 退款不符合条件。
- 回答中不出现超出知识库的政策条款。

## 9. 实施顺序（建议）
1) 先补齐知识库 terms/policy 内容并上线。
2) 加入 RAG 阈值与严格拒答策略。
3) 接入订单 API，实现查询与退款。
4) 完成测试与验收。

## 10. 未决问题
- 订单系统现有 API 是否可用？
- 退款规则的真实政策文本（需要业务确认）。
- 是否需要对接 PayPal API 以验证交易号？
