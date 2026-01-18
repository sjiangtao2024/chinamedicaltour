# Findings

- Worktrees present:
  - members: `/home/yukun/dev/chinamedicaltour/.worktrees/ai-a` on `mod/members/ai-a/2026-01-18`
  - web: `/home/yukun/dev/chinamedicaltour/new-cmt/.worktrees/ai-a` on `mod/web/ai-a/2026-01-18`
- No unmerged branches vs main in both repos.
- Requirements implemented:
  - Pre-consultation: non-refundable once paid; one free revision if first report unsatisfactory.
  - Enforce `checkup_date` required in backend/profile and UI.
  - Admin refund UI tooltip with policy guidance.
- Backend TDD updates ensure INTELLECTUAL refund policy is always not_refundable.
