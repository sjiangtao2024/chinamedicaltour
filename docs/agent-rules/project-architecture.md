# 项目架构速览（new-cmt + workers）

## 目的
- 快速理解项目结构与关键模块（重点：`new-cmt` 前端、`workers` 后端）。
- 作为 AGENTS.md 的引用文档，便于每次启动快速对齐。

## 仓库顶层概览
- `new-cmt/`：新的前端站点（灰度中），独立 Git 仓库。
- `workers/`：后端 Cloudflare Workers 集合（多子模块）。
- `docs/`：项目文档与流程规范。
- `deploy/`、`scripts/`、`specs/`：部署、脚本、规格相关资源。

## new-cmt（前端）
**技术栈**
- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui + Radix UI
- React Router（前端路由）
- React Query（数据请求/缓存）
- i18next（多语言）

**入口与路由**
- 入口：`new-cmt/src/main.tsx`
- 路由配置：`new-cmt/src/App.tsx`
  - 使用 `BrowserRouter` + `Routes`
  - 默认英文路由 + 多语言前缀路由（如 `/es`, `/de`, `/fr`, `/ar`）

**核心目录**
- `new-cmt/src/pages/`：页面级路由
  - 覆盖首页、内容、支付、会员中心、VIP 服务等
  - `new-cmt/src/pages/admin/`：管理端页面（订单、支付、优惠券等）
- `new-cmt/src/components/`：通用组件（含 `layout/`, `chat/`, `ui/`）
- `new-cmt/src/i18n/`：多语言配置
- `new-cmt/src/hooks/`：自定义 Hooks
- `new-cmt/src/lib/`、`new-cmt/src/data/`：基础库与数据

## workers（后端）
**总体**
- Cloudflare Workers + Wrangler 管理
- 每个子模块独立 `wrangler.jsonc` 与 `package.json`
- 多数模块使用 `nodejs_compat`

**子模块**
1) `workers/members/`
- 入口：`src/index.js`
- 路由域名：`members.chinamedicaltour.org`
- 绑定：D1（`cmt_members`）+ KV（`MEMBERS_KV`）
- 配置包含认证与支付相关环境变量（如 Google、PayPal 回调）

2) `workers/ops/`
- 入口：`src/index.js`
- 路由域名：`ops.chinamedicaltour.org`
- 绑定：R2 + Vectorize + AI
- 用途偏知识/向量数据运维（RAG 相关）

3) `workers/smart-cs/`
- 入口：`src/index.js`
- 路由域名：`api.chinamedicaltour.org`
- 绑定：R2 + Vectorize + AI + D1
- 含定时任务（cron）与 RAG 配置（如模型、TopK、超时）

4) `workers/cmt-translate/`
- 当前仅见 `.wrangler` 目录，未发现源码入口
- 可能为占位或待补全模块

## 规则与约定
- `new-cmt` 是独立仓库，前端修改必须在其 worktree 中完成。
- 重要规范文件位于：
  - `docs/agent-rules/ai-worktrees-protocol.md`
  - `docs/agent-rules/python-script-rules.md`
- 本文档已被列入 `AGENTS.md` 的必读清单，用于启动时快速对齐架构认知。
