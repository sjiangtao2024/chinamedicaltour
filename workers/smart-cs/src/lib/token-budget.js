const DEFAULT_MAX_TOKENS = 1200;
const MAX_TOKENS_LIMIT = 8192;

export function resolveMaxTokens(env) {
  const raw = env?.MAX_TOKENS;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MAX_TOKENS;
  return Math.min(MAX_TOKENS_LIMIT, Math.floor(value));
}
