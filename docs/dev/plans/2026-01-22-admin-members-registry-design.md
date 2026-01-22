# Admin Members Registry: Dashboard Summary + Full List Page

Date: 2026-01-22  
Owner: ai-a (web)

## Background
The admin dashboard currently renders the full Member registry table with search and pagination. As member count grows, the table will dominate the dashboard and push other modules (Smart-CS daily summary, Orders, Payments) below the fold.

## Goals
- Keep the admin dashboard compact and focused on high-level signals.
- Provide a dedicated members page with full search + pagination.
- Preserve current API behavior (`/api/admin/members`) and reuse access control.

## Non-goals
- No backend API changes in this phase.
- No new filters beyond search.
- No redesign of non-members admin cards.

## Proposed IA / UX
### Admin dashboard
- Keep the “Member registry” card but make it a summary:
  - Show only the most recent 5–10 members.
  - Remove pagination + search from the dashboard card.
  - Add a prominent “View all members” button linking to `/admin/members`.
  - Display total member count for context.

### New page: `/admin/members`
- Full members table with:
  - Search by email/phone/ID (`q`).
  - Server-side pagination (`limit`, `offset`).
  - Standard loading / empty / error states.
- Reuse admin access gating (`useAdminAccess`) and session token.

## Data Flow
### Dashboard card
- Request: `GET /api/admin/members?limit=10&offset=0`
- Render top 10 rows and total count.

### Members page
- Default: `limit=20` (or 50), `offset=0`.
- Search submits `q`, resets to page 1.

## UI States
- Loading: show a single “Loading…” row; disable actions.
- Empty (no members): show “No members found.”
- Empty (search): show “No results for ‘{q}’.”
- Error: surface server error message if provided.

## Performance Notes
- Dashboard avoids large tables; keeps fold short.
- Members page remains server-paginated to avoid large payloads.

## Open Questions
- Should the members list include “last active” or “last order” columns?
- Desired default page size for the members list (20 vs 50)?

