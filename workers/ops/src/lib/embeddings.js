export async function embedText({ ai, model, input }) {
  const response = await ai.run(model, { input });
  const vector = response?.data?.[0]?.embedding || response?.data?.[0];
  if (!vector) {
    const err = new Error("embedding_failed");
    err.detail = response;
    throw err;
  }
  return vector;
}
