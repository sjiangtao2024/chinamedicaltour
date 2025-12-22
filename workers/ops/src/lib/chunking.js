export function chunkText(text, { maxChars }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks = [];
  for (const block of blocks) {
    if (block.length <= maxChars) {
      chunks.push(block);
      continue;
    }
    for (let i = 0; i < block.length; i += maxChars) {
      chunks.push(block.slice(i, i + maxChars));
    }
  }
  return chunks;
}
