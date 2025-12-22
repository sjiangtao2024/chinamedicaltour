export async function upsertVectors({ index, namespace, vectors }) {
  if (!vectors || vectors.length === 0) return { upserted: 0 };
  const payload = vectors.map((vector, i) => ({
    id: `${namespace}-${i}`,
    values: vector.values,
    metadata: vector.metadata,
  }));
  await index.upsert(payload);
  return { upserted: payload.length };
}
