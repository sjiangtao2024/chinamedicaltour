# Members Worker Route Split (Incremental) Design

## Goal
Reduce `workers/members/src/index.js` into a thin entrypoint by incrementally
moving request handlers into domain-specific route modules without changing
API behavior.

## Scope
- Split handlers into route files under `workers/members/src/routes/`.
- Keep the existing public API paths, response JSON shapes, and auth rules.
- Preserve current CORS and error handling behavior.

## Non-Goals
- No new features or API changes.
- No auth model changes.
- No database schema changes.

## Current State
`workers/members/src/index.js` contains request parsing, auth checks, CORS,
and all business logic handlers. This makes changes error-prone and hard to
test in isolation.

## Proposed Structure
Entrypoint:
```
workers/members/src/index.js
```
Responsibilities:
- Parse request body.
- Apply CORS.
- Normalize errors via `jsonResponse`.
- Route dispatch to domain handlers.

Routes:
```
workers/members/src/routes/
  admin.js
  auth.js
  health.js
  orders.js
  paypal.js
  profile.js
```
Each route module exports a `handle(request, env, ctx)` (or equivalent) and
returns a `Response`.

## Migration Order (Incremental)
1. `health` and small misc endpoints (low risk, validates router pattern).
2. `admin` routes (isolated logic, low external dependency).
3. `paypal` routes (external integration, contained surface area).
4. `orders` routes (core domain).
5. `profile` routes.
6. `auth` routes (most intertwined).

## Router Strategy
- Keep routing in `index.js` with a simple path/method dispatcher.
- Do not add new dependencies; use a lightweight internal map or switch.
- Each domain module handles its own sub-paths and methods.

## Error and Auth Consistency
- Keep `requireAuth`, `requireAdmin`, `readJson`, and `jsonResponse` intact.
- Each moved route must call the same helpers as before.
- Return identical status codes and error payloads.

## Testing Strategy
For each migration step:
1. Move a single domain to `routes/`.
2. Run existing unit/integration tests for that domain.
3. Manually validate critical endpoints with curl if no tests exist.

## Rollback Plan
Each domain migration is a separate commit. If issues arise, revert that
commit to restore behavior without affecting other domains.

## Success Criteria
- `workers/members/src/index.js` reduced to ~150-250 lines.
- All routes remain backwards compatible.
- Tests pass and production behavior unchanged.
