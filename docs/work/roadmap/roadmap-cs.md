# 智能客服文档导航 (Documentation Roadmap)

本文档旨在帮助开发者快速定位和理解 China Medical Tour 智能客服项目的文档体系。

## 文档概览

**目录结构（顶层）**
- `docs/agent-rules/`：AI 工作流与规范
- `docs/work/<功能>/`：已上线且仍在维护
- `docs/dev/<功能>/`：开发中
- `docs/archive/<功能>/`：已完成存档
- `docs/deprecated/<功能>/`：已废弃或待删除

| 文件名 | 类型 | 主要用途 | 核心内容 | 受众 |
| :--- | :--- | :--- | :--- | :--- |
| **work/roadmap/roadmap-cs.md** | 索引 | 导航与索引 | 文档列表、修改日志、快速入口 | 所有开发者 |
| **work/architecture/architecture-design-cs.md** | 架构 | 系统设计 | 数据流图、关键策略 (Failover)、CORS 设计、安全架构 | 架构师、后端开发 |
| **work/specs/plan-cs.md** | 规格书 | 技术细节 | **接口契约** (/api/chat)、Key 轮询算法、UI 状态机、非功能需求 | 前后端开发 |
| **work/deployment/deployment-guide-cs.md** | 指南 | 部署与运维 | Worker 部署命令、绑定配置、Secrets 管理、发布与回滚 | 运维、开发 |
| **work/specs/development-specs-cs.md** | 流程 | 开发规范 | Spec-Kit/Superpowers 流程、任务拆解 (Phase 1-3)、宪法原则 | 所有开发者 |
| **work/ai/spec-kit-inputs-cs.md** | 模板 | Prompt | Codex CLI + Spec-Kit 的可复制输入模板（constitution/specify/plan/tasks） | 所有开发者 |
| **work/ai/superpowers-inputs-cs.md** | 模板 | Prompt | Superpowers（Codex/Claude）安装与常用输入模板 | 所有开发者 |
| **work/ops/ops-knowledge-guide.zh.md** | 运维 | RAG 知识库 | ops 后台使用、Markdown 上传、重建状态、存储路径 | 运维 |
| **work/smart-cs/smart-cs-features-and-guide.md** | 指南 | 功能总览 | 页面上下文、RAG、英文守卫、日志保留 | 产品、运营、开发 |
| **work/legal/2026-01-14-terms-consent.md** | 变更 | 合规 | 条款同意留痕接口、DB 迁移与验收 checklist | 前后端、运维 |
| **work/legal/terms-update-checklist.md** | 指南 | 合规 | 条款更新流程与校验清单 | 前后端、运维 |
| **dev/plans/2025-12-22-smart-cs-rag-ops-design.md** | 设计 | RAG 架构 | RAG/Vectorize/ops 方案、数据流 | 架构师 |
| **dev/plans/2025-12-22-smart-cs-rag-ops-api-spec.md** | 设计 | ops API | 登录/上传/状态 API 约定 | 后端 |
| **dev/plans/2025-12-22-smart-cs-rag-ops-ui-spec.md** | 设计 | ops UI | 登录/上传界面说明 | 前端 |
| **dev/plans/2025-12-22-smart-cs-rag-phase-plan.md** | 计划 | 迁移阶段 | 分阶段实施计划 | 所有开发者 |
| **dev/plans/2025-12-22-smart-cs-rag-detailed-plan.md** | 计划 | 详细任务 | 任务拆解与操作步骤 | 开发 |

## 全量索引（按目录）

**定位建议（最佳实践）**
- 优先看目录摘要 + 关键词，再结合路径清单定位具体文档。
- 关键词可直接用 `rg` 或 IDE 搜索。

**统一标签表（建议检索关键词）**
| 标签 | 说明 | 常见路径 |
| --- | --- | --- |
| `agent-rules` | AI 工作规范与流程 | `docs/agent-rules/` |
| `payments` | 支付/退款/合规 | `docs/work/payments/`, `docs/dev/payments-2026/`, `docs/dev/upgrade-2025-payments/` |
| `smart-cs` | 智能客服与 RAG | `docs/work/smart-cs/`, `docs/dev/plans/2025-12-22-smart-cs-*` |
| `ops` | 运维/知识库/后台 | `docs/work/ops/` |
| `members` | 会员系统 | `docs/work/members/`, `docs/dev/plans/*members*` |
| `deployment` | 部署与发布 | `docs/work/deployment/`, `docs/archive/deployment/` |
| `specs` | 规范/接口/策略 | `docs/work/specs/` |
| `legal` | 条款与合规 | `docs/work/legal/` |
| `vip-services` | VIP 服务定价/流程 | `docs/work/vip-services/`, `docs/dev/plans/*vip*` |
| `requirements` | 需求与材料 | `docs/dev/requirements/` |
| `plans` | 计划与设计稿 | `docs/dev/plans/` |
| `archive` | 历史存档 | `docs/archive/` |
| `deprecated` | 废弃文档 | `docs/deprecated/` |

### agent-rules
**用途**：AI 工作流规范、项目内的操作准则。  
**关键词**：worktree、planning、python、architecture
- `docs/agent-rules/ai-planning-and-documentation.md`
- `docs/agent-rules/ai-worktrees-protocol.md`
- `docs/agent-rules/project-architecture.md`
- `docs/agent-rules/python-script-rules.md`

### work
**用途**：已上线且持续维护的文档。  
**关键词**：payments、smart-cs、ops、members、deployment、specs
- **payments**：支付合规、接入与退款相关说明
- **smart-cs**：智能客服与 RAG 相关
- **ops**：知识库运维与后台操作
- **members**：会员系统与控制台相关
- `docs/work/ai/GEMINI.md`
- `docs/work/ai/image_prompts.md`
- `docs/work/ai/spec-kit-inputs-cs.md`
- `docs/work/ai/superpowers-inputs-cs.md`
- `docs/work/architecture/architecture-design-cs.md`
- `docs/work/content/faq.md`
- `docs/work/content/pre-consultation.md`
- `docs/work/deployment/deployment-guide-cs.md`
- `docs/work/legal/2026-01-14-terms-consent.md`
- `docs/work/legal/terms-update-checklist.md`
- `docs/work/legal/Main T&C.docx`
- `docs/work/legal/terms-conditions-bilingual.docx`
- `docs/work/members/members-worker-dashboard-deploy.md`
- `docs/work/ops/admin-coupons-ops.md`
- `docs/work/ops/ops-knowledge-guide.zh.md`
- `docs/work/payments/COMPLIANCE_AND_PAYMENT_GUIDE.md`
- `docs/work/payments/支付宝微信外国人注册指南.md`
- `docs/work/payments/支付宝微信支付商户集成最佳实践.md`
- `docs/work/payments/支付集成实施计划.md`
- `docs/work/payments/支付限额解决方案.md`
- `docs/work/payments/退款逻辑开发者文档.docx`
- `docs/work/roadmap/roadmap-cs.md`
- `docs/work/smart-cs/longcat-api-guide.md`
- `docs/work/smart-cs/smart-cs-features-and-guide.md`
- `docs/work/specs/development-specs-cs.md`
- `docs/work/specs/plan-cs.md`
- `docs/work/vip-services/vipservices-stage-pricing.xlsx`

### dev
**用途**：正在开发/迭代中的需求与计划。  
**关键词**：plans、upgrade-2025、payments-2026、requirements
- `docs/dev/payments-2026/manual-payment-test-cases.md`
- `docs/dev/plans/2025-12-22-smart-cs-rag-detailed-plan.md`
- `docs/dev/plans/2025-12-22-smart-cs-rag-ops-api-spec.md`
- `docs/dev/plans/2025-12-22-smart-cs-rag-ops-design.md`
- `docs/dev/plans/2025-12-22-smart-cs-rag-ops-ui-spec.md`
- `docs/dev/plans/2025-12-22-smart-cs-rag-phase-plan.md`
- `docs/dev/plans/2025-12-24-members-payments-phase-plan.md`
- `docs/dev/plans/2025-12-25-upgrade-2025-payments-phase-plan.md`
- `docs/dev/plans/2025-12-29-member-center-mvp.md`
- `docs/dev/plans/2025-12-31-admin-platform-design.md`
- `docs/dev/plans/2025-12-31-members-routing-refactor-design.md`
- `docs/dev/plans/2026-01-03-membership-system-design.md`
- `docs/dev/plans/2026-01-03-membership-system-implementation.md`
- `docs/dev/plans/2026-01-04-vip-services-guided-flow-design.md`
- `docs/dev/plans/2026-01-07-babeldoc-merge-batching-design.md`
- `docs/dev/plans/2026-01-13-paypal-refund-automation-design.md`
- `docs/dev/plans/2026-01-13-paypal-refund-automation-implementation-plan.md`
- `docs/dev/plans/2026-01-14-order-details-ui-spec.md`
- `docs/dev/plans/2026-01-14-packages-api-implementation-plan.md`
- `docs/dev/plans/2026-01-14-refund-policy-implementation.md`
- `docs/dev/plans/2026-01-14-refund-policy-spec.md`
- `docs/dev/plans/2026-01-22-admin-members-registry-design.md`
- `docs/dev/requirements/2026医疗旅游全链路成本.md`
- `docs/dev/requirements/Body check up package.en.xlsx`
- `docs/dev/requirements/Body check up package.translations-ori.csv`
- `docs/dev/requirements/Body check up package.translations.csv`
- `docs/dev/requirements/Body check up package.translations.md`
- `docs/dev/requirements/Body check up package.xlsx`
- `docs/dev/requirements/会员体系.docx`
- `docs/dev/requirements/会员体系开发需求文档.md`
- `docs/dev/requirements/全链路服务成本与内容清单.docx`
- `docs/dev/requirements/眼科和眼科的项目.docx`
- `docs/dev/upgrade-2025-payments/auth-and-cs-integration.md`
- `docs/dev/upgrade-2025-payments/automation-strategy.md`
- `docs/dev/upgrade-2025-payments/deployment.md`
- `docs/dev/upgrade-2025-payments/design.md`
- `docs/dev/upgrade-2025-payments/members-api.md`
- `docs/dev/upgrade-2025-payments/paypal-evidence-based-flow.md`
- `docs/dev/upgrade-2025-payments/paypal-sandbox-automation-brief.md`
- `docs/dev/upgrade-2025-payments/paypal-sandbox-test-execution-checklist.md`
- `docs/dev/upgrade-2025-payments/paypal-sandbox-test-plan.md`
- `docs/dev/upgrade-2025-payments/paypal-sandbox.md`
- `docs/dev/upgrade-2025-payments/paypal-webhook-security-test-checklist.md`
- `docs/dev/upgrade-2025-payments/plan_webhook_security_fix.md`

### archive
**用途**：已完成但需保留参考的历史文档。  
**关键词**：legacy、v1、proposal
- `docs/archive/architecture/smart-cs-architecture-v1.md`
- `docs/archive/deployment/deployment-guide-v1.md`
- `docs/archive/plans/implementation_plan.md`
- `docs/archive/proposals/optimization_proposal.md`

### deprecated
**用途**：已废弃或待删除的文档（旧主页等）。  
**关键词**：homepage、legacy
- `docs/deprecated/homepage/marketing-ops-guide.md`
- `docs/deprecated/homepage/walkthrough.md`

## 文档一致性检查点 (Source of Truth)

为了避免信息冲突，以下列模块为准：

*   **接口定义 (API Contract)**: 以 `docs/work/specs/plan-cs.md` 为准。
*   **部署配置 (Wrangler)**: 以 `docs/work/deployment/deployment-guide-cs.md` 为准。
*   **开发任务 (Tasks)**: 以 `docs/work/specs/development-specs-cs.md` 为准。
*   **核心策略 (Key Strategy)**: 以 `docs/work/architecture/architecture-design-cs.md` 为宏观指导，`docs/work/specs/plan-cs.md` 为实现细节。

## 变更记录

- 文档已从 `public/docs` 迁移到 `docs` 目录，便于版本管理与检索。
- 文档分类整理为 `docs/work|dev|archive|deprecated/<功能>/`。
- 补充 RAG 知识库更新流程与运维说明。
- 智能客服功能总览文档已统一为中文版本。
- 新增条款同意留痕方案：`/api/agreements` 接口、`agreement_acceptances` 迁移、验收 checklist。

## 快速指引

*   **我想知道怎么发请求给后端？** -> 查看 `docs/work/specs/plan-cs.md` 的 "1. 接口契约"。
*   **我想部署到生产环境？** -> 查看 `docs/work/deployment/deployment-guide-cs.md` 的 "2. 部署策略"。
*   **我想了解 Key 是怎么轮询的？** -> 查看 `docs/work/specs/plan-cs.md` 的 "2. 后端核心策略"。
*   **我需要配置本地开发环境？** -> 查看 `docs/work/deployment/deployment-guide-cs.md` 的 "3. 开发与验证"。

## 关键文档快速入口

**Payments（支付）**
- `docs/work/payments/COMPLIANCE_AND_PAYMENT_GUIDE.md`（合规与支付综述）
- `docs/work/payments/支付集成实施计划.md`（支付接入实施）
- `docs/work/payments/退款逻辑开发者文档.docx`（退款流程）
- `docs/dev/payments-2026/manual-payment-test-cases.md`（2026 支付测试）

**Smart-CS（智能客服）**
- `docs/work/architecture/architecture-design-cs.md`（架构设计）
- `docs/work/specs/plan-cs.md`（接口与策略）
- `docs/work/smart-cs/smart-cs-features-and-guide.md`（功能总览）
- `docs/work/smart-cs/longcat-api-guide.md`（Longcat 接口）
- `docs/dev/plans/2025-12-22-smart-cs-rag-detailed-plan.md`（RAG 计划）

**Members（会员）**
- `docs/work/members/members-worker-dashboard-deploy.md`（后台部署）
- `docs/dev/plans/2025-12-24-members-payments-phase-plan.md`（会员支付阶段计划）
- `docs/dev/plans/2025-12-31-members-routing-refactor-design.md`（路由改造设计）
- `docs/dev/plans/2026-01-03-membership-system-design.md`（会员体系设计）
- `docs/dev/plans/2026-01-03-membership-system-implementation.md`（会员体系实施）

**Ops（运维）**
- `docs/work/ops/ops-knowledge-guide.zh.md`（知识库运维）
- `docs/work/ops/admin-coupons-ops.md`（优惠券运维）
- `docs/dev/plans/2025-12-22-smart-cs-rag-ops-design.md`（RAG ops 设计）
- `docs/dev/plans/2025-12-22-smart-cs-rag-ops-api-spec.md`（RAG ops API）
- `docs/dev/plans/2025-12-22-smart-cs-rag-ops-ui-spec.md`（RAG ops UI）

## Upgrade 2025 Payments
- docs/dev/plans/2025-12-25-upgrade-2025-payments-phase-plan.md
- docs/dev/plans/2025-12-24-members-payments-phase-plan.md

## Payments 2026
- docs/dev/plans/2026-01-14-refund-policy-implementation.md
- docs/dev/plans/2026-01-14-refund-policy-spec.md
- docs/dev/plans/2026-01-14-packages-api-implementation-plan.md
- docs/dev/plans/2026-01-14-order-details-ui-spec.md
- docs/dev/plans/2026-01-13-paypal-refund-automation-implementation-plan.md
- docs/dev/plans/2026-01-13-paypal-refund-automation-design.md
- docs/dev/payments-2026/manual-payment-test-cases.md
