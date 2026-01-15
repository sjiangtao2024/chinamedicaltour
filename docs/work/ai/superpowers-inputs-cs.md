# Superpowers（本项目使用指南 / Inputs）（Smart CS）

本文档说明如何在 China Medical Tour 智能客服（Smart CS）项目中使用 [Superpowers](https://github.com/obra/superpowers)。

> 重要前提：Superpowers 是 **Claude Code 插件生态**中的工作流与技能库；在 **Codex CLI** 下是“实验性支持”，需要按官方
> Codex 安装方式进行配置，然后通过运行 `superpowers-codex` 工具来加载/注入技能。

## 1. 适用范围与定位

- **Superpowers Marketplace**：用于在 Claude Code 中安装插件市场（`obra/superpowers-marketplace`）。
- **Superpowers Core**：核心技能库（TDD、调试、协作工作流等）。
- **本项目现状**：你当前在 WSL 使用 **Codex CLI** + 项目级 `CODEX_HOME`（见 `docs/development-specs-cs.md`）。
  - 因此本项目的 Superpowers 用法以 **Codex 方式**为主；同时保留 Claude Code 安装方式供团队成员参考。

## 2. Claude Code（可选）安装方式（官方 Marketplace）

在 Claude Code 交互模式下执行：

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

验证（Claude Code）：

```text
/help
```

预期能看到类似：
- `/superpowers:brainstorm`
- `/superpowers:write-plan`
- `/superpowers:execute-plan`

## 3. Codex CLI（推荐）安装与配置方式（适配本项目）

官方说明来源：
- superpowers-marketplace：`/plugin marketplace add ...`（仅 Claude Code）
- superpowers（Codex）：`.codex/INSTALL.md` 与 `docs/README.codex.md`

### 3.1 安装 Superpowers（一次即可，全局）

在 WSL 里执行：

```bash
mkdir -p ~/.codex/superpowers
git clone https://github.com/obra/superpowers.git ~/.codex/superpowers
mkdir -p ~/.codex/skills
```

### 3.2 与本项目的 `CODEX_HOME` 兼容（关键点）

你在本项目通常用项目级 `CODEX_HOME` 启动 Codex（示例）：

```bash
cd workers/smart-cs
CODEX_HOME="$PWD/.codex" codex --enable skills
```

Superpowers 官方安装说明要求在 `~/.codex/AGENTS.md` 写入引导块；当你使用项目级 `CODEX_HOME` 时，建议把同一段内容写进：

`workers/smart-cs/.codex/AGENTS.md`

内容如下（原样复制即可）：

```markdown
## Superpowers System

<EXTREMELY_IMPORTANT>
You have superpowers. Superpowers teach you new skills and capabilities. RIGHT NOW run: `~/.codex/superpowers/.codex/superpowers-codex bootstrap` and follow the instructions it returns.
</EXTREMELY_IMPORTANT>
```

### 3.3 验证安装（Codex）

在 WSL 终端运行：

```bash
~/.codex/superpowers/.codex/superpowers-codex bootstrap
```

或在 Codex 对话中输入（推荐在 Codex 内执行，便于它把 skill 内容注入上下文）：

```text
Run ~/.codex/superpowers/.codex/superpowers-codex bootstrap
```

### 3.4 常用“输入模板”（Codex 对话里直接粘贴）

**A) 查看有哪些 skills：**

```text
Run ~/.codex/superpowers/.codex/superpowers-codex find-skills
```

**B) 加载一个 skill（建议先从 brainstorming / writing-plans / test-driven-development 开始）：**

```text
Run ~/.codex/superpowers/.codex/superpowers-codex use-skill superpowers:brainstorming
```

```text
Run ~/.codex/superpowers/.codex/superpowers-codex use-skill superpowers:writing-plans
```

```text
Run ~/.codex/superpowers/.codex/superpowers-codex use-skill superpowers:test-driven-development
```

**C) 建议的本项目工作流（Smart CS）**

将技能加载后，按本项目文档来源推进（`docs/plan-cs.md`、`docs/architecture-design-cs.md`、`docs/deployment-guide-cs.md`）：

1) 先加载 brainstorming，要求它对齐接口契约与约束，产出“可验收”的 spec（避免拍脑袋）  
2) 再加载 writing-plans，把工作拆到可执行任务（文件路径 + 验证命令）  
3) 实施时遵循 test-driven-development：先写可重复验证（curl/脚本），再写 Worker/前端代码  

示例输入（一次性粘贴）：

```text
Run ~/.codex/superpowers/.codex/superpowers-codex use-skill superpowers:brainstorming
Then, based on docs/plan-cs.md and docs/architecture-design-cs.md, help me refine the Smart CS v1 scope and acceptance criteria.
After I confirm, run ~/.codex/superpowers/.codex/superpowers-codex use-skill superpowers:writing-plans and produce a step-by-step plan with exact file paths and verification commands.
```

## 4. 注意事项（Codex 与 Claude Code 差异）

- Claude Code：Superpowers 以插件形式提供 `/superpowers:*` 命令。
- Codex CLI：Superpowers 以 `superpowers-codex` 工具加载技能；不保证出现同名 slash command。
- 本项目已采用 Spec‑Kit（见 `docs/spec-kit-inputs-cs.md`）；Superpowers 更适合做“过程约束”（TDD、调试、审查），两者可叠加使用。

