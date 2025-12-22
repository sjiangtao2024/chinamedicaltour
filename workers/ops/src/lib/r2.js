export async function writeKnowledge({ bucket, key, content, metadata }) {
  await bucket.put(key, content, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
    customMetadata: metadata || {},
  });
}

export async function writeStatus({ bucket, key, status }) {
  await bucket.put(key, JSON.stringify(status, null, 2), {
    httpMetadata: { contentType: "application/json; charset=utf-8" },
  });
}

export async function readStatus({ bucket, key }) {
  const obj = await bucket.get(key);
  if (!obj) return null;
  return await obj.json();
}
