# Railway services setup

ProResume AI runs as **four Railway components** in one project. The Netlify site stays static; Railway handles auth, storage, billing, email, background jobs, and live resume sync.

## Architecture

```
Netlify (static HTML/JS/CSS)
        │  HTTPS REST + WSS
        ▼
┌───────────────────────────────────────────────────┐
│  Railway project                                   │
│  ┌─────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ proresume-ai│  │ Postgres │  │ Redis (opt.) │  │
│  │ API + /ws   │──│ resumes  │──│ pub/sub      │  │
│  └──────┬──────┘  │ users    │  └──────┬───────┘  │
│         │         └──────────┘         │          │
│  ┌──────▼──────┐              ┌───────▼───────┐  │
│  │proresume-   │              │ proresume-    │  │
│  │worker       │              │ cron          │  │
│  └─────────────┘              └───────────────┘  │
└───────────────────────────────────────────────────┘
```

## Services to deploy

| Service | Start command | Required | Purpose |
|---------|---------------|----------|---------|
| **proresume-ai** | `node src/index.js` | **Yes** | REST API, WebSocket `/ws` live resume sync, Stripe webhooks |
| **PostgreSQL** | (plugin) | **Yes** | Permanent storage — accounts, resumes, credits, queue |
| **proresume-worker** | `node src/worker.js` | **Strongly recommended** | Processes Stripe events, queued emails, maintenance jobs |
| **proresume-cron** | `node src/cron.js` | Recommended | Schedules daily maintenance (queue cleanup) |
| **Redis** | (plugin) | Recommended | Instant worker wake-up + cross-instance WebSocket sync |

All three Node services use **root directory `backend`** and the matching `services/*/railway.toml` config per service.

## Step-by-step in Railway

### 1. PostgreSQL (required)

1. Project → **+ New** → **Database** → **PostgreSQL**
2. On **proresume-ai**, **worker**, and **cron**, add variable reference:  
   `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`

### 2. Redis (recommended — required for full realtime + instant worker)

1. Project → **+ New** → **Database** → **Redis**
2. On **all three Node services**, add:  
   `REDIS_URL` → `${{Redis.REDIS_URL}}`
3. On **all three Node services**, add:  
   `REQUIRE_REDIS=true`  
   (services log a warning if Redis is configured but unreachable; with `REQUIRE_REDIS=true` they fail startup until Redis is linked)

Without Redis:
- Worker polls the Postgres queue every 3s (still works)
- WebSocket sync only reaches clients on the **same API instance**

### 3. API service — `proresume-ai`

- Root directory: `backend`
- Config: `services/api/railway.toml`
- Public domain: e.g. `proresume-ai-production.up.railway.app`

**Required variables:**

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<openssl rand -hex 32>
FRONTEND_URL=https://proresume.aeloriacareer.com
CORS_ORIGINS=https://proresume.aeloriacareer.com,https://aeloriacareer.com,https://ai-proresume.netlify.app
REDIS_URL=${{Redis.REDIS_URL}}
RESEND_API_KEY=re_...
FROM_EMAIL=ProResume AI <noreply@aeloriacareer.com>
SUPPORT_EMAIL=support@aeloriacareer.com
REPLY_TO_EMAIL=support@aeloriacareer.com
STRIPE_SECRET_KEY=sk_...
XAI_API_KEY=xai-...
```

### 4. Worker — `proresume-worker`

- Same repo, root directory `backend`
- Config: `services/worker/railway.toml`
- **No public domain required** (health check on internal port)
- Share the same `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, email vars as API

On startup the worker **drains pending queue jobs** then listens for Redis signals (or polls).

### 5. Cron — `proresume-cron`

- Same repo, root directory `backend`
- Config: `services/cron/railway.toml`
- Share `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- Runs maintenance enqueue every 15 minutes (`CRON_INTERVAL_MS` to override)

## One-command live stack (CLI)

With `RAILWAY_TOKEN` exported:

```bash
cd backend
npm run setup:railway   # add Redis, worker, cron, set REQUIRE_REDIS, deploy all
npm run verify:production
```

Manual dashboard steps may still be needed to link `REDIS_URL=${{Redis.REDIS_URL}}` on each service.

## Verify deployment

```bash
cd backend && npm run verify:production
```

Expected health:

```json
{
  "ok": true,
  "database": "connected",
  "redis": { "configured": true, "ok": true },
  "realtime": { "connections": 0, "rooms": 0 },
  "stack": { "websocket": "ok", "redis": "connected", "worker": "idle" }
}
```

WebSocket check must use **HTTP/1.1** (Railway edge returns 404 for WS upgrade over HTTP/2):

```bash
curl --http1.1 -sS -o /dev/null -w "%{http_code}\n" \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  "https://proresume-ai-production.up.railway.app/ws?token=test"
# Expected: 101 (or 4401 with invalid token)
```

## GitHub Actions deploy

Push to `main` under `backend/` or `services/` triggers `.github/workflows/railway-services.yml` when `RAILWAY_TOKEN` is set. It deploys all three Node services.

## Live resume sync (WebSocket)

- Endpoint: `wss://<api-host>/ws?token=<JWT>`
- Client subscribes to a resume ID after login
- Every cloud save broadcasts `resume:updated` to other tabs/devices
- Data persists in Postgres even if WebSocket disconnects

## If Railway “takes charge” instead of Netlify

Railway already handles all dynamic behavior. Netlify only serves static assets from a CDN.

**Optional:** Serve static files from Express and use one Railway domain. Not required for persistence or realtime sync.
