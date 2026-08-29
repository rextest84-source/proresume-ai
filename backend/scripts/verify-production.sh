#!/usr/bin/env bash
# Quick production stack check (run after Railway deploy).
set -euo pipefail

API="${PRORESUME_API_URL:-https://proresume-ai-production.up.railway.app}"

echo "=== ProResume API health ==="
HEALTH=$(curl -sS "$API/health")
echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
echo ""

echo "=== WebSocket endpoint (HTTP/1.1 required — HTTP/2 returns 404 at Railway edge) ==="
HTTP_CODE=$(curl -sS --http1.1 -o /dev/null -w "%{http_code}" \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "$API/ws?token=test" || true)
if [[ "$HTTP_CODE" == "101" || "$HTTP_CODE" == "401" || "$HTTP_CODE" == "4401" ]]; then
  echo "OK — /ws is live (HTTP $HTTP_CODE)"
else
  echo "WARN — /ws returned HTTP $HTTP_CODE (expected 101, 401, or 4401)"
fi
echo ""

REDIS_OK=$(echo "$HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); print('yes' if d.get('redis',{}).get('ok') else 'no')" 2>/dev/null || echo "no")
WORKER=$(echo "$HEALTH" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('stack',{}).get('worker','unknown'))" 2>/dev/null || echo "unknown")

if [[ "$REDIS_OK" != "yes" ]]; then
  echo "TODO: Add Redis plugin in Railway and link REDIS_URL on all Node services."
fi
if [[ "$WORKER" == "likely_down" ]]; then
  echo "TODO: Deploy proresume-worker (pending jobs are not being processed)."
fi
echo ""
echo "Full setup: npm run setup:railway (requires RAILWAY_TOKEN)"
echo "See backend/RAILWAY-SERVICES.md"
