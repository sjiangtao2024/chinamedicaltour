# Smart CS RAG + Ops Upload Design

## Context
The current smart customer service Worker (`workers/smart-cs`) uses a large system prompt in `workers/smart-cs/src/lib/knowledge-base.js`. This is functional but hard for non-technical staff to update and increases token usage per request. The site is already live on `https://chinamedicaltour.org` and calls `https://api.chinamedicaltour.org/api/chat`.

## Goals
- Let non-technical staff update the knowledge base without code changes.
- Keep the live chat flow unchanged for end users.
- Reduce token overhead by using retrieval to inject only relevant knowledge.
- Maintain operational safety with a simple admin token gate.

## Non-goals
- Replace the longcat model in the short term.
- Build a complex authentication system (SSO, roles, etc.).
- Introduce multi-channel channels (WeChat, etc.).

## Constraints
- Use Cloudflare services (Workers, R2, Vectorize, Workers AI embeddings).
- Use a single shared admin token for initial access.
- Keep deployment small and clear: separate ops Worker and chat Worker.

## Proposed Architecture
- **smart-cs Worker** (public):
  - Receives chat requests from `chinamedicaltour.org`.
  - Generates query embedding with Workers AI.
  - Retrieves top-K chunks from Vectorize.
  - Builds a compact prompt (rules + retrieved chunks).
  - Sends to longcat API for response.
- **ops Worker** (private):
  - Exposes a login page at `ops.chinamedicaltour.org`.
  - Validates a shared admin token.
  - Provides a simple editor that converts content to Markdown.
  - Uploads the Markdown to R2 (fixed key, e.g. `knowledge/knowledge.md`).
- **R2 event pipeline**:
  - R2 object update triggers a Worker/Workflow to rebuild the vector index.
  - The pipeline fetches Markdown, cleans and splits into chunks, embeds, and upserts into Vectorize with metadata.

## Data Flow
1. Admin logs in at `ops.chinamedicaltour.org` with a shared token.
2. Admin edits content and submits.
3. Frontend converts to Markdown and uploads to R2.
4. R2 event triggers rebuild:
   - Parse Markdown -> chunks.
   - Generate embeddings with Workers AI (embedding model).
   - Upsert vectors to Vectorize.
5. User chat request:
   - smart-cs embeds the user query.
   - Vectorize returns top-K chunks.
   - smart-cs builds final prompt and calls longcat.

## Content Format
- Preferred upload format: Markdown.
- Metadata stored in Vectorize: section title, source, updated_at, language.
- Chunk size: 500-800 tokens (tunable).

## Error Handling
- Upload failures show clear error to admin and keep local draft.
- Rebuild failures log the error and keep the previous Vectorize index.
- smart-cs falls back to a minimal prompt if Vectorize is unavailable.

## Security
- Ops access is guarded by a shared admin token.
- Token is validated server-side on every upload.
- Token rotation is manual but documented.
- Ops Worker is on a separate subdomain and logs all uploads.

## Observability
- Add structured logs for:
  - Upload events (user, time, content version).
  - Rebuild stats (chunks, embedding calls, duration).
  - Chat retrieval stats (top-K, latency).

## Limits and Free Tier Notes
- Workers AI free allocation: 10,000 neurons/day.
- Vectorize free allocation:
  - 30 million queried vector dimensions/month.
  - 5 million stored vector dimensions.
- Current content size is small, so Vectorize should stay within free limits.
- Workers AI embeddings should be monitored daily; chat generation remains on longcat.

## Rollout Plan
1. Keep current system prompt as a fallback.
2. Add ops Worker + R2 upload flow.
3. Enable R2-triggered rebuild to Vectorize.
4. Switch smart-cs to RAG for knowledge injection.
5. Monitor quality and latency, adjust chunking and top-K.

## Open Questions
- Preferred embedding model and dimension size.
- Top-K default value and fallback strategy.
- Whether to allow multiple knowledge files or a single canonical file.
