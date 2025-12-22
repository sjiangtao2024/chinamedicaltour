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

export async function deleteVectors({ index, namespace, count }) {
  if (!count || count <= 0) return { deleted: 0 };
  if (typeof index.delete !== "function") {
    return { deleted: 0, skipped: true };
  }
  const ids = Array.from({ length: count }, (_, i) => `${namespace}-${i}`);
  await index.delete(ids);
  return { deleted: ids.length };
}
