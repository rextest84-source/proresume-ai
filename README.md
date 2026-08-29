# ProResume AI

AI-powered professional resume builder.

## Architecture

| Layer | Host | Purpose |
|-------|------|---------|
| **Frontend** | Netlify | Static site — builder UI, marketing, auth pages (fast CDN) |
| **Backend API** | Railway `proresume-ai` | Auth, resume storage, Stripe, Grok AI, **WebSocket live sync** |
| **Worker** | Railway `proresume-worker` | Stripe webhooks, email queue, background jobs |
| **Cron** | Railway `proresume-cron` | Scheduled maintenance |
| **Database** | Railway PostgreSQL | Permanent user & resume data |
| **Redis** | Railway Redis (recommended) | Worker signals + multi-instance realtime sync |

### Static Netlify vs Railway “taking charge”

The **UI files** (HTML/CSS/JS) stay on Netlify by design — that is normal for a JAMstack app. Railway already owns everything dynamic:

- Sign up / login / JWT sessions
- Resume saves to PostgreSQL (~1.2s debounce + instant sync to other tabs via WebSocket)
- Server-side credits and Stripe billing
- Live Grok AI when `XAI_API_KEY` is set
- Background jobs via worker + cron

You do **not** need to move the frontend to Railway for persistence or realtime. Optional: serve static files from Express and use one Railway domain — see **[backend/RAILWAY-SERVICES.md](backend/RAILWAY-SERVICES.md)**.

### Live sync

Signed-in builder clients connect to `wss://<api>/ws` and receive `resume:updated` events when any tab or device saves. Data is always stored in Postgres; WebSocket keeps UIs in sync.

## Deploy frontend (Netlify)

1. Connect repo at [app.netlify.com](https://app.netlify.com)
2. Build command: *(empty)* · Publish directory: `.`
3. After deploying the Railway API, set your API URL in `js/config.js`:

```js
window.PRORESUME_CONFIG = {
  apiUrl: 'https://YOUR-SERVICE.up.railway.app'
};
```

## Deploy backend (Railway)

See **[backend/RAILWAY-SERVICES.md](backend/RAILWAY-SERVICES.md)** for worker, Redis, cron, and WebSocket setup.

See **[backend/README.md](backend/README.md)** for API env vars and local dev:

1. New Railway project → deploy from GitHub, root directory `backend`
2. Add **PostgreSQL** plugin (resume data persists here - no app volume required)
3. Set env vars: `JWT_SECRET`, `FRONTEND_URL`, `CORS_ORIGINS`, Stripe keys
4. Configure Stripe webhook → `/api/stripe/webhook`

> **Volumes:** PostgreSQL handles durable storage for resumes. Only add a Railway **volume** if you later store uploaded files on disk (`DATA_DIR=/data`).

## Local preview

**Frontend:**
```bash
npx serve .
```

**Backend:**
```bash
cd backend && cp .env.example .env && npm install && npm run dev
```

Requires PostgreSQL - see `backend/.env.example`.

## Auth, cloud save & live sync

1. User creates account at `/signup.html` (default resume row created in PostgreSQL)
2. While editing signed in, resume auto-saves to PostgreSQL every ~1.2s
3. WebSocket pushes updates to other tabs/devices in real time
4. Credits enforced server-side; upgrades via Stripe Checkout on `/pricing.html`
5. Guest users: local browser storage only — sign in to persist in the cloud
