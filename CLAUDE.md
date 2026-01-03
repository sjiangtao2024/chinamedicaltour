# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Main Repository (Smart CS & Workers)
- **Install dependencies**: `npm install`
- **Development**: `npm run dev` (likely starts Cloudflare Workers locally)
- **Deploy**: `npm run deploy`

### Frontend Repository (`new-cmt`)
Note: `new-cmt` is a nested git repository. Always `cd new-cmt` before running these commands.

- **Install dependencies**: `npm install`
- **Start Dev Server**: `npm run dev` (Vite, http://localhost:8080)
- **Build**: `npm run build`
- **Lint**: `npm run lint` (ESLint)
- **Test**: `npm run test` (Vitest)
- **Run Single Test**: `npx vitest -t "test name"`

## Architecture & Structure

This project consists of two main parts:
1. **Root**: Contains Cloudflare Workers (backend), documentation, and specs.
2. **`new-cmt`**: A nested React/Vite/TypeScript frontend application.

### Key Components
- **`specs/` & `docs/`**: Comprehensive documentation, including architecture (`docs/architecture-design-cs.md`), plans, and API contracts. Read these before starting major features.
- **`workers/`**: Cloudflare Workers code (Smart CS backend).
- **`new-cmt/src/`**: Frontend source code.
  - **`components/`**: React components (shadcn/ui).
  - **`hooks/`**: Custom React hooks.
  - **`lib/`**: Utilities (e.g., `utils.ts` for `cn`).
  - **`pages/`**: Application routes/pages.
  - **`i18n/`**: Internationalization.

### Smart CS Architecture (Backend)
- **Platform**: Cloudflare Workers + Longcat API.
- **Data Flow**: User -> Worker -> (Load Balancer/Auth) -> Longcat API -> Stream back to User.
- **Key Strategy**: Key rotation with health checks (Active/Cooldown) and failover.
- **Protocol**: SSE (Server-Sent Events) for streaming responses.

### Frontend Architecture (`new-cmt`)
- **Stack**: Vite, React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, React Router, Zod.
- **State**: React Query for server state.
- **I18n**: i18next.

## Worktree Protocol & Agents
This project uses a strict Multi-AI Worktree Protocol (`docs/ai-worktrees-protocol.md`).
- **Identity**: Every session must declare an AI identity (e.g., `ai-a`) and target module.
- **Isolation**: Work happens in dedicated git worktrees (`.worktrees/<ai-name>`).
- **Frontend**: Frontend work must happen in `new-cmt/.worktrees/<ai-name>`.
- **Workflow**:
  1. `superpowers:using-git-worktrees` for setup.
  2. `frontend-design:frontend-design` for UI work.
  3. `superpowers:test-driven-development` for logic.

## Skills & Superpowers
- **Mandatory**: Use `Skill` tool with `superpowers:using-superpowers` at start of session.
- **Frontend**: Must use `frontend-design:frontend-design` skill.
- **Agents**: See `AGENTS.md` for agent-specific instructions.

## Language
- **Output Language**: Always communicate in Chinese (Simplified), unless the user explicitly requests another language.
- **Documentation**: Generated documentation must be written in Chinese, unless it is specifically intended for AI consumption (e.g., prompts, system instructions).
