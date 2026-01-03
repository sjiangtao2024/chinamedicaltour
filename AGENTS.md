# Project Agent Instructions

## Required Reading (Before Any Work)

- Worktree protocol: `docs/ai-worktrees-protocol.md`
  - This is the single source of truth for Multi‑AI worktree rules.
  - Always follow the worktree rules for this repo and `new-cmt`.
- Superpowers: run the bootstrap and follow skill workflows before starting any task.
- Frontend: Must use `frontend-design:frontend-design` skill for any UI/Frontend implementation.

## Recommended Workflow (Upgrade 2025 Payments)

1. **Setup**: Use `superpowers:using-git-worktrees` to isolate tasks.
2. **UI**: Use `frontend-design:frontend-design` for `new-cmt` pages (Checkout/Profile).
3. **Logic**: Use `superpowers:test-driven-development` for payment logic.
4. **Testing**: Use `document-skills:webapp-testing` for E2E automation.

## Notes

- Front-end work must use the `new-cmt` repo and its worktrees.
- If these rules conflict with other docs, treat the worktree protocol as authoritative.
