# BabelDOC Batch Merge Translation Design

## Goal

Reduce LLM request count by batching adjacent text segments while preserving PDF layout and structure. The change must not alter page geometry, element ordering, or render flow.

## Constraints

- Do not merge across page boundaries.
- Do not merge structural blocks (tables, lists, code, formulas, etc.).
- Preserve original segment ordering and per-segment coordinates.
- Ensure correctness when the model drops or alters separators.

## Approach

Introduce a segment batching layer between "segment extraction" and "LLM call":

1. **Eligible segments**: Only normal paragraph-like segments. Structural blocks are excluded.
2. **Batching rule**: Accumulate adjacent eligible segments on the same page up to a max length threshold (3000–4000 chars).
3. **Separator**: Join batched segments with a rare, unique delimiter token, e.g. `<<<BDOC_SPLIT_{n}>>>`, and instruct the model to keep it verbatim.
4. **Post-translation split**: Split the translated output by delimiter and map each piece back to its original segment.
5. **Fallback**: If delimiter count or segment count mismatches, re-translate those segments individually for that batch only.

## Error Handling

- **Delimiter mismatch**: fallback to per-segment translation for that batch.
- **Empty or suspicious segment output**: fallback per segment.
- **Timeout/429**: existing retry/rotation logic still applies.

## Quality Safeguards

- Use a strong delimiter and explicit instruction to preserve it.
- Validate segment count and non-empty outputs.
- Keep batches small enough to avoid model truncation.

## Testing

- Unit tests for:
  - Successful batch -> split -> map.
  - Delimiter missing -> batch fallback.
  - Structural blocks excluded from batching.
  - No cross-page merges.
  - OCR-heavy tiny segments merged correctly under threshold.
- Integration test:
  - Run a scanned PDF and record request count before/after (expect significant reduction).

## Expected Outcome

- Fewer LLM calls (especially for OCR-heavy scans).
- No change to PDF structure or layout.
- Graceful fallback on delimiter issues.
