import { buildRagContext } from "./rag.js";

export async function fetchRagChunks({ env, query, topK }) {
  if (!env.AI || !env.VECTORIZE_INDEX) return [];
  const embedding = await env.AI.run("@cf/baai/bge-base-en-v1.5", { input: query });
  const vector = embedding?.data?.[0]?.embedding || embedding?.data?.[0];
  if (!vector) return [];

  const results = await env.VECTORIZE_INDEX.query(vector, { topK: topK || 3 });
  const matches = results?.matches || [];
  return matches.map((m) => m?.metadata?.preview).filter(Boolean);
}

export function mergeRagIntoSystemPrompt(systemPrompt, chunks) {
  if (!chunks || chunks.length === 0) return systemPrompt;
  return `${systemPrompt}${buildRagContext(chunks)}`;
}
