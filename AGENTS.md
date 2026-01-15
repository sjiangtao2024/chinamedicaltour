# Project Agent Instructions

## Required Reading (Before Any Work)

- Worktree protocol: `docs/agent-rules/ai-worktrees-protocol.md`
  - This is the single source of truth for Multi‑AI worktree rules.
  - Always follow the worktree rules for this repo and `new-cmt`.
- Project architecture: `docs/agent-rules/project-architecture.md`
  - Fast overview of repo structure, `new-cmt`, and `workers`.
- Superpowers: run the bootstrap and follow skill workflows before starting any task.
- Python execution rules: `docs/agent-rules/python-script-rules.md`
- Frontend: Must use `frontend-design:frontend-design` skill for any UI/Frontend implementation.
- Planning files: review `task_plan.md`, `findings.md`, and `progress.md` when starting or resuming complex work.
- Roadmap: `docs/work/roadmap/roadmap-cs.md`
  - Project roadmap and milestones.
- AI planning & docs: `docs/agent-rules/ai-planning-and-documentation.md`
  - How to update plans/progress and place docs.

## Recommended Workflow (Upgrade 2025 Payments)

1. **Setup**: Use `superpowers:using-git-worktrees` to isolate tasks.
2. **UI**: Use `frontend-design:frontend-design` for `new-cmt` pages (Checkout/Profile).
3. **Logic**: Use `superpowers:test-driven-development` for payment logic.
4. **Testing**: Use `document-skills:webapp-testing` for E2E automation.

## Notes

- Front-end work must use the `new-cmt` repo and its worktrees.
- If these rules conflict with other docs, treat the worktree protocol as authoritative.
