# Multi-AI Worktree Protocol

All AI working on this project must follow this protocol.

## 1) AI Identity (Required Before Any Task)

- Every session must declare the AI identity before starting work.
- AI identity uses a fixed short name:
  - `ai-a`, `ai-b`, `ai-c`, etc.
- At session start, the AI must list existing names and ask the user to select one or create a new one.

## 1.1) Module Declaration (Required)

- After selecting the AI name, the session must declare the target module before starting work.
- Multiple AI can work on different modules in parallel, but each module should still have a clear owner.

### Module Selection Prompt (Required)

At the start of every session, the AI must present the current module list
and ask the user to choose one or add a new module. Only after a module is
selected may work begin.

## 1.2) Start-of-Session Checklist

After the module is assigned, run these checks before coding:

```bash
# List active worktrees and their branches
git worktree list

# Show local branches not merged into main
git branch --no-merged main
```

If there are branches not merged into `main`, the AI must notify the owner
and confirm whether to continue on that branch or merge/rebase first.

If the AI worktree does not exist, create it before starting work:

```bash
git worktree add .worktrees/<ai-name> -b ai/<ai-name>
```

If the branch already exists (e.g., continuing work), use:

```bash
git worktree add .worktrees/<ai-name> ai/<ai-name>
```

If the task touches `new-cmt`, repeat the checklist inside that repo:

```bash
cd new-cmt
git worktree list
git branch --no-merged main
```

## 2) Branch + Worktree Rules

- Each AI uses its own worktree; modules are separated by branches.
- AI base branch naming: `ai/<ai-name>` (example: `ai/ai-a`)
- Worktree path: `.worktrees/<ai-name>` (example: `.worktrees/ai-a`)
- Module work happens on branches created from the AI base branch:
  - `mod/<module>/<ai-name>/<date>` (example: `mod/smart-cs/ai-a/2025-01-10`)

## 2.1) Multi-Repo Rule (new-cmt)

- `new-cmt` is a separate Git repository.
- Any front-end work must use a worktree inside `new-cmt`:
  - `new-cmt/.worktrees/<ai-name>` (example: `new-cmt/.worktrees/ai-a`)
- Do not mix `new-cmt` changes into the main repo branches.

## 3) Daily Sync + Merge Policy

- Daily sync window (recommended 17:00): `git fetch` + `git rebase origin/main` (or merge).
- If not merging that day, still rebase/merge to avoid drift.
- Conflicts must be resolved same day.
- Merges should be small, module-scoped, and test-verified.

## 4) Cleanup

- After merge: remove worktree and optionally delete branch.
- If a branch is idle for 3 days, rebase/merge before further changes.

## 5) Known Modules

- smart-cs
- ops
- members
- web
