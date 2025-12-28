import { chunkText } from "./chunking.js";
import { embedText } from "./embeddings.js";
import { deleteVectors, upsertVectors } from "./vectorize.js";

export async function rebuildIndex({
  ai,
  index,
  text,
  model,
  maxChars,
  namespace,
  metadata,
  previousCount,
}) {
  const chunks = chunkText(text, { maxChars });
  await deleteVectors({ index, namespace, count: previousCount });
  const vectors = [];
  for (const chunk of chunks) {
    const values = await embedText({ ai, model, input: chunk });
    vectors.push({
      values,
      metadata: {
        ...metadata,
        preview: chunk.slice(0, 200),
      },
    });
  }
  const result = await upsertVectors({ index, namespace, vectors });
  return { chunks: chunks.length, upserted: result.upserted };
}

export function resolveDeleteCount(previousCount, deleteUpTo) {
  const prev = Number.isFinite(previousCount) ? previousCount : 0;
  const cap = Number.isFinite(deleteUpTo) ? deleteUpTo : 0;
  return Math.max(prev, cap);
}
