import { jsonResponse } from "./lib/response.js";

export default {
  fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return jsonResponse(200, { ok: true });
    }
    return jsonResponse(404, { error: "not_found" });
  },
};
