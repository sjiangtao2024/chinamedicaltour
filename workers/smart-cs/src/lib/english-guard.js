import { serializeSseData } from "./sse.js";

const CJK_REGEX = /[\u4e00-\u9fff]/;

export function containsCjk(text) {
  if (!text) return false;
  return CJK_REGEX.test(text);
}

export function englishFallbackText() {
  return "Sorry, I can only respond in English. Please ask again in English.";
}

export function guardEnglishStream({ upstreamBody, fallbackText }) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const reader = upstreamBody.getReader();
  let aborted = false;

  return new ReadableStream({
    async pull(controller) {
      if (aborted) {
        controller.close();
        return;
      }
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      const chunkText = decoder.decode(value, { stream: true });
      if (containsCjk(chunkText)) {
        aborted = true;
        controller.enqueue(
          encoder.encode(
            serializeSseData({ choices: [{ delta: { content: fallbackText } }] }),
          ),
        );
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        reader.cancel();
        return;
      }
      controller.enqueue(value);
    },
    cancel() {
      reader.cancel();
    },
  });
}
