import { jsonResponse } from "./lib/response.js";
import { buildRespond, corsHeaders } from "./lib/request.js";
import { handleAdmin } from "./routes/admin.js";
import { handleAuth } from "./routes/auth.js";
import { handleHealth } from "./routes/health.js";
import { handleLibrary } from "./routes/library.js";
import { handleOrders } from "./routes/orders.js";
import { handlePaypal } from "./routes/paypal.js";
import { handleProfile } from "./routes/profile.js";
import { handleAgreements } from "./routes/agreements.js";

const ROUTES = [
  handleAuth,
  handleProfile,
  handleAdmin,
  handleOrders,
  handleAgreements,
  handlePaypal,
  handleHealth,
  handleLibrary,
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const respond = buildRespond(request, env);

    try {
      if (request.method === "OPTIONS" && url.pathname.startsWith("/api/")) {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      }

      for (const handler of ROUTES) {
        const response = await handler({ request, env, ctx, url, respond });
        if (response) {
          return response;
        }
      }

      return jsonResponse(404, { error: "not_found" }, corsHeaders(request, env));
    } catch (error) {
      return respond(500, {
        ok: false,
        error: error?.message || "internal_error",
      });
    }
  },
};
