# ProResume AI

AI-powered professional resume builder.

## Architecture

| Layer | Host | Purpose |
|-------|------|---------|
| **Frontend** | Netlify | Static site - builder, marketing, auth pages |
| **Backend API** | Railway | Auth, cloud resume storage, Stripe billing |
| **Database** | Railway PostgreSQL | Persistent user & resume data |

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

See **[backend/README.md](backend/README.md)** for step-by-step setup:

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

## Auth & cloud save flow

1. User creates account at `/signup.html`
2. Resume auto-saves to PostgreSQL every ~1.2s while editing (when signed in)
3. Credits are enforced server-side for logged-in users
4. Upgrades via Stripe Checkout on `/pricing.html`
