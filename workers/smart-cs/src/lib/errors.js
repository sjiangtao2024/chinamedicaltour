const ERROR_CATALOG = {
  invalid_request: {
    status: 400,
    message: "请求格式有误，请刷新页面重试。",
  },
  rate_limit_exceeded: {
    status: 429,
    message: "咨询人数过多，请稍等片刻。",
  },
  upstream_service_unavailable: {
    status: 503,
    message: "AI 服务暂不可用，请稍后重试。",
  },
  gateway_timeout: {
    status: 504,
    message: "连接超时，请检查网络。",
  },
};

export function errorResponse({ status, error_code, request_id, corsHeaders }) {
  const catalog = ERROR_CATALOG[error_code] || ERROR_CATALOG.upstream_service_unavailable;
  const finalStatus = status || catalog.status;
  const body = {
    error_code,
    message: catalog.message,
    request_id,
  };

  return new Response(JSON.stringify(body), {
    status: finalStatus,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Robots-Tag": "noindex, nofollow, nosnippet",
      ...(corsHeaders || {}),
    },
  });
}
