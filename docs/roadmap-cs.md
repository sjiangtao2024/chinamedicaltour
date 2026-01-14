# 智能客服文档导航 (Documentation Roadmap)

本文档旨在帮助开发者快速定位和理解 China Medical Tour 智能客服项目的文档体系。

## 文档概览

| 文件名 | 类型 | 主要用途 | 核心内容 | 受众 |
| :--- | :--- | :--- | :--- | :--- |
| **roadmap-cs.md** | 索引 | 导航与索引 | 文档列表、修改日志、快速入口 | 所有开发者 |
| **architecture-design-cs.md** | 架构 | 系统设计 | 数据流图、关键策略 (Failover)、CORS 设计、安全架构 | 架构师、后端开发 |
| **plan-cs.md** | 规格书 | 技术细节 | **接口契约** (/api/chat)、Key 轮询算法、UI 状态机、非功能需求 | 前后端开发 |
| **deployment-guide-cs.md** | 指南 | 部署与运维 | Worker 部署命令、绑定配置、Secrets 管理、发布与回滚 | 运维、开发 |
| **development-specs-cs.md** | 流程 | 开发规范 | Spec-Kit/Superpowers 流程、任务拆解 (Phase 1-3)、宪法原则 | 所有开发者 |
| **spec-kit-inputs-cs.md** | 模板 | Prompt | Codex CLI + Spec-Kit 的可复制输入模板（constitution/specify/plan/tasks） | 所有开发者 |
| **superpowers-inputs-cs.md** | 模板 | Prompt | Superpowers（Codex/Claude）安装与常用输入模板 | 所有开发者 |
| **ops-knowledge-guide.zh.md** | 运维 | RAG 知识库 | ops 后台使用、Markdown 上传、重建状态、存储路径 | 运维 |
| **smart-cs-features-and-guide.md** | 指南 | 功能总览 | 页面上下文、RAG、英文守卫、日志保留 | 产品、运营、开发 |
| **2026-01-14-terms-consent.md** | 变更 | 合规 | 条款同意留痕接口、DB 迁移与验收 checklist | 前后端、运维 |
| **plans/2025-12-22-smart-cs-rag-ops-design.md** | 设计 | RAG 架构 | RAG/Vectorize/ops 方案、数据流 | 架构师 |
| **plans/2025-12-22-smart-cs-rag-ops-api-spec.md** | 设计 | ops API | 登录/上传/状态 API 约定 | 后端 |
| **plans/2025-12-22-smart-cs-rag-ops-ui-spec.md** | 设计 | ops UI | 登录/上传界面说明 | 前端 |
| **plans/2025-12-22-smart-cs-rag-phase-plan.md** | 计划 | 迁移阶段 | 分阶段实施计划 | 所有开发者 |
| **plans/2025-12-22-smart-cs-rag-detailed-plan.md** | 计划 | 详细任务 | 任务拆解与操作步骤 | 开发 |

## 文档一致性检查点 (Source of Truth)

为了避免信息冲突，以下列模块为准：

*   **接口定义 (API Contract)**: 以 `plan-cs.md` 为准。
*   **部署配置 (Wrangler)**: 以 `deployment-guide-cs.md` 为准。
*   **开发任务 (Tasks)**: 以 `development-specs-cs.md` 为准。
*   **核心策略 (Key Strategy)**: 以 `architecture-design-cs.md` 为宏观指导，`plan-cs.md` 为实现细节。

## 变更记录

- 文档已从 `public/docs` 迁移到 `docs` 目录，便于版本管理与检索。
- 补充 RAG 知识库更新流程与运维说明。
- 智能客服功能总览文档已统一为中文版本。
- 新增条款同意留痕方案：`/api/agreements` 接口、`agreement_acceptances` 迁移、验收 checklist。

## 快速指引

*   **我想知道怎么发请求给后端？** -> 查看 `plan-cs.md` 的 "1. 接口契约"。
*   **我想部署到生产环境？** -> 查看 `deployment-guide-cs.md` 的 "2. 部署策略"。
*   **我想了解 Key 是怎么轮询的？** -> 查看 `plan-cs.md` 的 "2. 后端核心策略"。
*   **我需要配置本地开发环境？** -> 查看 `deployment-guide-cs.md` 的 "3. 开发与验证"。

## Upgrade 2025 Payments
- docs/plans/2025-12-25-upgrade-2025-payments-phase-plan.md
- docs/plans/2025-12-24-members-payments-phase-plan.md

## Payments 2026
- docs/plans/2026-01-14-refund-policy-implementation.md
- docs/plans/2026-01-14-refund-policy-spec.md
- docs/plans/2026-01-14-packages-api-implementation-plan.md
- docs/plans/2026-01-14-order-details-ui-spec.md
- docs/plans/2026-01-13-paypal-refund-automation-implementation-plan.md
- docs/plans/2026-01-13-paypal-refund-automation-design.md
- docs/payments-2026/manual-payment-test-cases.md
