export function buildRagContext(chunks) {
  if (!chunks || chunks.length === 0) return "";
  return `\n\n[KNOWLEDGE]\n${chunks.map((c, i) => `(${i + 1}) ${c}`).join("\n")}`;
}

export function shouldFallback(ragEnabled, chunks) {
  return !ragEnabled || !chunks || chunks.length === 0;
}
