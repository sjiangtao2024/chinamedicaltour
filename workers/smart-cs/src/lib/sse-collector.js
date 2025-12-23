function extractDeltaContent(payload) {
  if (!payload || !payload.choices || !payload.choices[0]) return "";
  const choice = payload.choices[0];
  if (choice.delta && typeof choice.delta.content === "string") return choice.delta.content;
  if (choice.message && typeof choice.message.content === "string") return choice.message.content;
  return "";
}

export async function collectSseText(stream, { maxChars = 4000 } = {}) {
  if (!stream) return "";
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let result = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";

    for (const part of parts) {
      const lines = part.split("\n");
      for (const line of lines) {
        const trimmed = line.trimEnd();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const payload = JSON.parse(data);
          const chunk = extractDeltaContent(payload);
          if (chunk) {
            result += chunk;
            if (result.length >= maxChars) return result.slice(0, maxChars);
          }
        } catch {
          // Ignore malformed SSE lines.
        }
      }
    }
  }

  return result;
}
