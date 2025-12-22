export function parseUpload(body) {
  if (!body || typeof body.content_markdown !== "string") {
    throw new Error("invalid_request");
  }
  return {
    content_markdown: body.content_markdown,
    note: typeof body.note === "string" ? body.note : null,
    version: typeof body.version === "string" ? body.version : null,
  };
}
