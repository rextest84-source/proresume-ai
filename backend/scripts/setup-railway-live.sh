#!/usr/bin/env bash
# Provision Redis + worker + cron on Railway and wire live stack variables.
# Requires: RAILWAY_TOKEN, project already linked (or RAILWAY_PROJECT_ID set).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKEND="$ROOT/backend"
cd "$BACKEND"

RAILWAY="npx --yes @railway/cli"
SERVICES=(proresume-ai proresume-worker proresume-cron)

if [[ -z "${RAILWAY_TOKEN:-}" ]]; then
  echo "Error: RAILWAY_TOKEN is not set."
  echo "Create one at https://railway.com/account/tokens and export it, or add to GitHub secrets."
  exit 1
fi

echo "=== Railway live stack setup ==="

link_project() {
  if [[ -n "${RAILWAY_PROJECT_ID:-}" ]]; then
    $RAILWAY link "$RAILWAY_PROJECT_ID"
  elif [[ ! -f .railway/config.json ]]; then
    echo "Linking Railway project (select proresume-ai when prompted)…"
    $RAILWAY link
  fi
}

ensure_redis() {
  echo ""
  echo "--- Redis plugin ---"
  if $RAILWAY variable list --service proresume-ai --json 2>/dev/null | grep -q 'REDIS_URL'; then
    echo "REDIS_URL already referenced on proresume-ai"
    return
  fi
  echo "Adding Redis database to project…"
  $RAILWAY add --database redis || true
  echo "Set REDIS_URL on each Node service in Railway dashboard:"
  echo "  REDIS_URL = \${{Redis.REDIS_URL}}"
  echo "(CLI cannot always resolve \${{Service.VAR}} references — verify in dashboard.)"
}

set_live_variables() {
  local service="$1"
  echo ""
  echo "--- Variables: $service ---"
  $RAILWAY variable set REQUIRE_REDIS=true --service "$service" --skip-deploys || true
  if ! $RAILWAY variable list --service "$service" --json 2>/dev/null | grep -q 'REDIS_URL'; then
    echo "  Link REDIS_URL → \${{Redis.REDIS_URL}} in Railway dashboard for $service"
  fi
}

ensure_service() {
  local name="$1"
  local config="$2"
  echo ""
  echo "--- Service: $name ---"
  if $RAILWAY status --json 2>/dev/null | grep -q "\"$name\""; then
    echo "$name exists"
  else
    echo "Creating $name from repo…"
    $RAILWAY add --service "$name" --repo "${RAILWAY_REPO:-$(git -C "$ROOT" config --get remote.origin.url)}" || {
      echo "Could not auto-create $name — create it manually in Railway:"
      echo "  Root directory: backend"
      echo "  Config: $config"
    }
  fi
}

link_project

ensure_redis
ensure_service "proresume-worker" "services/worker/railway.toml"
ensure_service "proresume-cron" "services/cron/railway.toml"

for svc in "${SERVICES[@]}"; do
  set_live_variables "$svc"
done

echo ""
echo "=== Deploying all services ==="
bash "$BACKEND/scripts/deploy-railway.sh"

echo ""
echo "=== Verify ==="
sleep 15
bash "$BACKEND/scripts/verify-production.sh"
