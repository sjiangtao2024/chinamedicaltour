#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8787}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-http://127.0.0.1:5500}"
FORBIDDEN_ORIGIN="${FORBIDDEN_ORIGIN:-https://evil.example}"

echo "== Preflight (allowed origin) =="
curl -i -X OPTIONS "$BASE_URL/api/chat" \
  -H "Origin: $ALLOWED_ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"

echo
echo "== CORS (forbidden origin) =="
curl -i -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Origin: $FORBIDDEN_ORIGIN" \
  -d '{"messages":[{"role":"user","content":"ping"}],"stream":true}'

echo
echo "== SSE (no Origin; curl allowed) =="
curl -N -v -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"messages":[{"role":"user","content":"ping"}],"stream":true}'

echo
echo "== SSE (allowed Origin) =="
curl -N -v -X POST "$BASE_URL/api/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -H "Origin: $ALLOWED_ORIGIN" \
  -d '{"messages":[{"role":"user","content":"ping"}],"stream":true}'

