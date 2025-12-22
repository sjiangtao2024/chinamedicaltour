import { chunkText } from "./chunking.js";
import { embedText } from "./embeddings.js";
import { upsertVectors } from "./vectorize.js";

export async function rebuildIndex({
  ai,
  index,
  text,
  model,
  maxChars,
  namespace,
  metadata,
}) {
  const chunks = chunkText(text, { maxChars });
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
