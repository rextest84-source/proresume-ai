#!/usr/bin/env bash
# Deploy all ProResume Railway services (API, worker, cron).
# Requires: RAILWAY_TOKEN env var, services already created in Railway project.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND="$ROOT/backend"

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  echo "Error: RAILWAY_TOKEN is not set."
  exit 1
fi

cd "$BACKEND"

RAILWAY="npx --yes @railway/cli"

deploy_service() {
  local service="$1"
  local config="$2"
  echo "=== Deploying $service ==="
  cp "$ROOT/$config" railway.toml
  $RAILWAY link --service "$service" 2>/dev/null || $RAILWAY link
  $RAILWAY up --detach
  echo "=== $service deploy triggered ==="
}

deploy_service "proresume-ai" "services/api/railway.toml"
deploy_service "proresume-worker" "services/worker/railway.toml"
deploy_service "proresume-cron" "services/cron/railway.toml"

echo ""
echo "All deploys triggered. Verify:"
echo "  curl https://proresume-ai-production.up.railway.app/health"
echo ""
echo "Ensure REDIS_URL is linked on all three services and REQUIRE_REDIS=true is set."
