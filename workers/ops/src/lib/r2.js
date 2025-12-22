export async function writeKnowledge({ bucket, key, content, metadata }) {
  await bucket.put(key, content, {
    httpMetadata: { contentType: "text/markdown; charset=utf-8" },
    customMetadata: metadata || {},
  });
}
