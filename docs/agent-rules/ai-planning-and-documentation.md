# AI 开发计划与文档维护指南

## 目标
- 统一 AI 在本项目中的计划、进度与文档放置方式。
- 确保每次启动都能快速恢复上下文、减少重复沟通。

## 计划与进度文件（必用）
当任务复杂或预计超过 5 次工具调用时，使用以下文件：
- `task_plan.md`：任务阶段、状态、决策、错误记录
- `findings.md`：需求、研究结论、技术决策与资源链接
- `progress.md`：本次会话的操作记录与结果

**更新节奏**
- 每完成一个阶段：更新 `task_plan.md` 状态。
- 每次发现新事实/规则：追加到 `findings.md`。
- 每个重要动作/结果：写入 `progress.md`。
- 发生错误必须记录（含解决方式），避免重复踩坑。

**注意**
- 不要只在脑中记忆，必须写入文件。
- 更新不求长，但必须准确、可追溯。

## 文档放置规则
**优先级：已有约定 > 现有目录结构 > 新增目录。**

推荐放置策略：
- 代理/流程规范：`docs/agent-rules/`
- 产品或功能说明：`docs/` 下对应主题目录
- 如果无法确定位置：放在 `docs/` 并创建清晰命名的子目录

**硬性要求**
- 所有新增文档必须放在 `docs/` 或其子目录下，不要放在仓库其他位置。

**当前 `docs/` 目录结构（固定四类 + agent-rules）：**
- `docs/agent-rules/`（流程规范）
- `docs/work/<功能>/`
- `docs/dev/<功能>/`
- `docs/archive/<功能>/`
- `docs/deprecated/<功能>/`

**分类含义**
- `work`：已上线且仍在维护/迭代
- `dev`：正在开发中
- `archive`：已完成并存档（低频变更）
- `deprecated`：已废弃或待删除

**新增文档后：**
- 在 `AGENTS.md` 增加引用入口（若属于必读或高频文档）。
- 同步更新 `docs/work/roadmap/roadmap-cs.md` 的索引（路径与分类）。
- 如影响工作流，更新 `docs/agent-rules/` 中相关规范。

**检索标签建议（与 roadmap 保持一致）**
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

**关键文档入口模板（用于 roadmap）**
```
**<模块名>**
- `docs/<scope>/<path>`（一句话说明）
```

**示例：Payments**
```
**Payments（支付）**
- `docs/work/payments/COMPLIANCE_AND_PAYMENT_GUIDE.md`（合规与支付综述）
- `docs/work/payments/支付集成实施计划.md`（支付接入实施）
- `docs/work/payments/退款逻辑开发者文档.docx`（退款流程）
- `docs/dev/payments-2026/manual-payment-test-cases.md`（2026 支付测试）
```

## 质量检查（提交前）
- `task_plan.md`：阶段状态准确，未完成阶段不标 completed。
- `findings.md`：关键结论已记录，避免遗漏。
- `progress.md`：关键操作和结果可追溯。
- 文档路径：符合放置规则，易于检索。

## 常见错误
- 只口头描述计划，未写入文件。
- 文档散落在不一致路径，导致找不到。
- 错误未记录，重复失败。
