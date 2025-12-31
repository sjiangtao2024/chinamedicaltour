import { jsonResponse } from "../lib/response.js";
import { corsHeaders } from "../lib/request.js";

export async function handleHealth({ request, env, url }) {
  if (url.pathname !== "/health") {
    return null;
  }
  return jsonResponse(200, { ok: true }, corsHeaders(request, env));
}
