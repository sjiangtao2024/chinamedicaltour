export function sseHeaders() {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "X-Robots-Tag": "noindex, nofollow, nosnippet",
  };
}

export function serializeSseData(obj) {
  return `data: ${JSON.stringify(obj)}\n\n`;
}
