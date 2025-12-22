# 智能客服开发规划 (Spec-Kit & Superpowers)

本文档基于 [Spec-Kit](https://github.com/github/spec-kit) 方法论和 [Superpowers](https://github.com/obra/superpowers-marketplace) 核心理念编写，旨在规范 China Medical Tour 智能客服系统的开发流程。

## 1. 项目宪法 (Constitution)
> 定义项目的核心价值观、编码标准和“超能力”要求。

### 1.1 核心原则 (Core Principles)
*   **用户至上**: 响应必须快速（流式传输）、准确（基于知识库）、有礼貌（人设一致）。
*   **安全第一**: 严禁泄露 API Key，严禁 AI 产生幻觉导致医疗建议错误（需添加免责声明）。
*   **极简架构**: 坚持使用 Serverless (Cloudflare Workers) 架构，避免不必要的运维负担。

### 1.2 开发超能力 (Development Superpowers)
我们采用 `superpowers-marketplace` 中的核心能力作为开发标准：
*   **TDD (测试驱动开发)**: 在编写 Worker 逻辑前，必须先定义测试用例（如：使用 `vitest` 或简单的 `curl` 脚本验证预期输出）。
*   **Debug-First**: 所有关键路径（API 调用、错误处理）必须包含结构化的日志记录，以便于快速排查问题。
*   **One-Task-Flow**: 每次只专注于一个具体的 Spec 任务，避免上下文切换。

---

## 2. 功能规范 (Specifications)
> 使用 Spec-Kit 的结构定义“做什么”。

### Spec 1: 智能客服核心 API (Smart CS Core)
*   **目标**: 提供一个安全的、流式的、具备上下文记忆的对话接口。
*   **输入**: 
    *   `messages`: JSON 数组，包含历史对话。
    *   `stream`: Boolean，是否开启流式传输。
*   **输出**: 
    *   `text/event-stream` (SSE) 格式的实时回复。
*   **约束**:
    *   必须在 Cloudflare Worker 中运行。
    *   必须轮询使用 API Keys 以避免 Rate Limit。
    *   必须验证 CORS Origin。

### Spec 2: 前端聊天组件 (Chat Widget)
*   **目标**: 这是一个嵌入在 `index.html` 的轻量级 UI 组件。
*   **视觉风格**:
    *   **样式实现**: 由于项目当前是纯静态且无 Tailwind 构建链，Widget 样式**必须使用原生 CSS** 编写 (推荐使用 BEM 命名法，或参考 Tailwind 类名风格但写在 `.css` 文件中)。
    *   **交互**: 右下角悬浮按钮，点击展开。
    *   **反馈**: 错误状态（网络错误、超限）要有清晰的 UI 反馈。

---

## 3. 工具链准备 (Toolchain Setup)

### 3.1 Superpowers (已安装)
*   **状态**: ✅ 已安装
*   **定义**: Superpowers 是 **Claude Code 的插件集合**，提供额外的工具和能力（如 TDD 工作流、高级调试工具等）。
*   **与 Spec-Kit 的关系**: Spec-Kit 负责**制定计划**，Superpowers 负责**提供工具**。当 Spec-Kit 生成任务让 AI 执行时，AI 会调用 Superpowers 里的插件来更高效地完成工作。
*   **本项目用法模板**: `docs/superpowers-inputs-cs.md`（包含 Codex CLI 与 Claude Code 的安装/使用方式）。
*   **使用方式**:
    1.  **在 Claude Code 中安装**: 确保您的 Claude CLI 环境已加载 Superpowers 插件。
        ```bash
        # 在 Claude Code CLI 交互模式下输入:
        /plugin add obra/superpowers-marketplace
        # 或者安装特定的能力插件:
        /plugin install tdd@superpowers-marketplace
        ```
    2.  **自动调用**: 一旦安装，当您使用 `specify implement` 或直接让 Claude 写代码时，它会自动识别并使用这些工具（例如在修改代码后自动运行更智能的测试检查）。无需手动干预。

### 3.2 Spec-Kit (已启用)
*   **状态**: ✅ 已启用
*   **说明**: 本项目采用 Spec-Driven Development (SDD) 模式，利用 spec-kit 将规范转化为可执行代码。
*   **输入模板**: `docs/spec-kit-inputs-cs.md`（Codex CLI + Spec-Kit 的可复制 prompts）。
*   **常用指令**:
    *   `/speckit.constitution`: 建立或更新项目原则（宪法）。
        *   **输入**: 明确描述项目的核心价值、目标、技术约束、开发哲学等。
        *   **示例**: `/speckit.constitution 作为 China Medical Tour 的智能客服系统，我们的核心原则是用户至上、安全第一、极简架构。开发超能力包括 TDD、Debug-First、One-Task-Flow。`
    *   `/speckit.specify`: 描述要构建的功能或模块。
        *   **输入**: 清晰、无歧义地描述一个功能或模块应该“做什么”，包括输入、输出、约束和边界条件。
        *   **示例**: `/speckit.specify 我们需要一个智能客服核心 API，它应该提供一个安全、流式传输且具备上下文记忆的对话接口。输入包括 JSON 格式的消息数组和流式传输的布尔值。输出应为 text/event-stream (SSE) 格式的实时回复。必须在 Cloudflare Worker 中运行，轮询使用 API Key 且验证 CORS Origin。`
    *   `/speckit.plan`: 生成技术实施计划。
        *   **输入**: 基于已有的功能规范，描述预期的技术栈、架构模式、关键技术选型等。
        *   **示例**: `/speckit.plan 基于智能客服核心 API 的 Spec，请生成一份技术实施计划。使用 Cloudflare Workers 作为 Serverless 平台，Longcat AI API 作为后端 AI 服务。考虑 Key 轮询和故障转移策略，以及历史记录截断逻辑。`
    *   `/speckit.tasks`: 将计划分解为可执行的任务列表。
        *   **输入**: 基于技术实施计划，要求分解出具体的、可操作的开发任务列表。
        *   **示例**: `/speckit.tasks 基于已生成的智能客服核心 API 技术实施计划，请分解出 Phase 1 (基础设施)、Phase 2 (后端逻辑) 和 Phase 3 (前端集成) 的具体开发任务。`
    *   `/speckit.implement`: 执行任务并生成代码。
        *   **输入**: 通常是更具体的任务描述，或者要求 AI 实现某个功能、修复某个 bug 等。
        *   **示例**: `/speckit.implement 请根据 Phase 1.1 的任务，初始化 Cloudflare Worker 项目结构，并生成 wrangler.jsonc 文件。`
*   **工作流**: Constitution -> Specify -> Plan -> Tasks -> Implement.

### 3.2.1 在 WSL 环境中使用 Spec-Kit

鉴于本项目 Spec-Kit 部署在 WSL 环境中，您需要直接在 WSL 终端中调用 `specify` CLI 工具。

**Codex CLI（重要）**:

Codex CLI 的自定义 prompts 默认只从 `$CODEX_HOME/prompts/`（默认 `~/.codex/prompts/`）加载，不会自动识别项目内的
`.codex/prompts/`。因此使用 Codex CLI 时，需要将 `CODEX_HOME` 指向本项目的 `.codex` 目录，并使用 `/prompts:<name>`
调用 speckit 工作流（而不是 `/speckit.*`）。

*   **方案 A（推荐：项目级 `CODEX_HOME`）**:
    ```bash
    cd workers/smart-cs
    CODEX_HOME="$PWD/.codex" codex --enable skills
    ```
    进入 Codex 交互界面后，使用：
    *   `/prompts:speckit.constitution ...`
    *   `/prompts:speckit.specify ...`
    *   `/prompts:speckit.plan ...`
    *   `/prompts:speckit.tasks`
    *   `/prompts:speckit.implement`

**基本操作步骤**:

1.  **打开 WSL 终端**: 进入到项目的根目录。
2.  **调用 `specify` 命令**: 根据需要执行不同的指令。

    *   **宪法 (Constitution)**:
        ```bash
        specify constitution
        ```
        **输入内容**: 明确描述项目的核心原则、目标、约束和开发哲学。这将配置 AI 的行为模式。
        **示例**: `specify constitution 作为 China Medical Tour 的智能客服系统，我们的核心原则是用户至上、安全第一、极简架构。开发超能力包括 TDD (Vitest) 和 Debug-First 原则。`

    *   **定义功能 (Specify)**:
        ```bash
        specify specify
        ```
        **输入内容**: 清晰、无歧义地描述一个功能或模块应“做什么”，包括输入、输出、约束和边界条件。
        **示例**: `specify specify 我们需要一个智能客服核心 API，它应该提供一个安全、流式传输且具备上下文记忆的对话接口。输入包括 JSON 格式的消息数组和流式传输的布尔值。输出应为 text/event-stream (SSE) 格式的实时回复。必须在 Cloudflare Worker 中运行，轮询使用 API Key 且验证 CORS Origin。`

    *   **生成计划 (Plan)**:
        ```bash
        specify plan
        ```
        **输入内容**: 基于已有的功能规范，描述预期的技术栈、架构模式、关键技术选型等。
        **示例**: `specify plan 基于智能客服核心 API 的 Spec，请生成一份技术实施计划。使用 Cloudflare Workers 作为 Serverless 平台，Longcat AI API 作为后端 AI 服务。考虑 Key 轮询和故障转移策略，以及历史记录截断逻辑。`

    *   **分解任务 (Tasks)**:
        ```bash
        specify tasks
        ```
        **输入内容**: 基于技术实施计划，要求分解出具体的、可操作的开发任务列表。
        **示例**: `specify tasks 基于已生成的智能客服核心 API 技术实施计划，请分解出 Phase 1 (基础设施)、Phase 2 (后端逻辑) 和 Phase 3 (前端集成) 的具体开发任务。`

    *   **执行实现 (Implement)**:
        ```bash
        specify implement
        ```
        **输入内容**: 提供更具体的任务描述，或者要求 AI 实现某个功能、修复某个 bug 等。
        **示例**: `specify implement 请根据 Phase 1.1 的任务，初始化 Cloudflare Worker 项目结构，并生成 wrangler.jsonc 文件。`

### 3.2.2 Superpowers (超能力) 调用机制

Superpowers (如 TDD, Debug-First, One-Task-Flow) 并非通过显式命令调用，而是**通过 Spec-Kit 的 Constitution 配置被动激活的指导原则**。

*   **激活**: 在执行 `specify constitution` 命令时，通过描述项目的开发原则来“注入”这些超能力。例如，当 AI 知道要遵循 TDD 时，在 `specify implement` 阶段生成代码前，它会优先生成测试用例。
*   **体现**: 这些原则将自动指导 AI 在 `implement` 阶段的行为，例如生成带有详细日志的代码（Debug-First），或先编写测试（TDD）。
*   **您的角色**: 您无需手动“调用”它们，只需确保在宪法中明确了这些原则，AI 就会在执行任务时自动遵循。

---

## 4. 实施计划 (Plan)
> 基于上述 Spec 的分步执行计划。

### Phase 0: 准备工作 (Preparation)
*   [x] **Task 0.1**: 阅读并确认所有 `-cs.md` 文档内容。
*   [x] **Task 0.2**: (已完成) 部署 Spec-Kit。

### Phase 1: 基础设施与原型 (Infrastructure)
*   [ ] **Task 1.1**: 初始化 Cloudflare Worker 项目结构 (`wrangler.jsonc`)。 ✅
*   [ ] **Task 1.2**: 配置本地开发环境 (Wrangler, Secrets)。
    *   **Action 1**: 在 `workers/smart-cs` 目录运行 `npm install`。
    *   **Action 2**: 创建 `.dev.vars` 文件并填入 `LONGCAT_API_KEYS=sk-mock-key`。
    *   **Action 3**: 运行 `npx wrangler login` 确保已登录。
    *   **Action 4**: 运行 `npx wrangler dev`，确认终端输出 "Ready on http://localhost:8787"。
*   [ ] **Task 1.3**: 实现 "Hello World" 接口，验证 CORS 和 HTTPS 通路。
*   [ ] **Task 1.4**: 编写基础的集成测试脚本 (Superpower: TDD)。

### Phase 2: 后端逻辑实现 (Backend Implementation)
*   [ ] **Task 2.1**: 实现多 Key 轮询与故障转移逻辑 (Failover Strategy)。
*   [ ] **Task 2.2**: 集成 Longcat API (非流式)，打通 AI 回复链路。
*   [ ] **Task 2.3**: 升级为 SSE 流式输出 (Streaming)。
*   [ ] **Task 2.4**: 添加系统提示词 (System Prompt) 和上下文处理。

### Phase 3: 前端组件开发 (Frontend Development)
*   [ ] **Task 3.1**: 开发静态 HTML/CSS 聊天窗口 UI。
*   [ ] **Task 3.2**: 实现 `EventSource` 前端逻辑，对接流式 API。
*   [ ] **Task 3.3**: 处理 UI 交互细节（滚动、加载状态、错误提示）。
*   [ ] **Task 3.4**: 集成到主网站 (`index.html`) 并进行端到端测试。

---

## 5. 后续步骤
请按照 Phase 1 的任务列表开始执行。每次执行前，请检查对应的 Spec 和 Constitution 原则。
