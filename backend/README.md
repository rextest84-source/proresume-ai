# ProResume AI - Backend API

Node.js API for user accounts, cloud resume storage, and Stripe billing. Deploy on [Railway](https://railway.app).

## What this provides

- **User auth** - register, login, JWT sessions
- **Cloud resume storage** - PostgreSQL (data survives redeploys)
- **Server-side credits** - prevents client tampering
- **Stripe Checkout** - subscriptions and credit packs
- **Optional volume** - `DATA_DIR` for future file uploads

## Railway setup (baby steps)

### 1. Create project

1. [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub** → select this repo
3. Set **Root Directory** to `backend`

### 2. Add PostgreSQL

1. In your Railway project → **+ New** → **Database** → **PostgreSQL**
2. Railway injects `DATABASE_URL` into your API service automatically (link the variable reference)

> **Note on volumes:** Resume data lives in **PostgreSQL**, not the app container. Postgres on Railway is persistent by default - you do **not** need a volume for saves. Add a volume later only if you store uploaded PDFs on disk (`DATA_DIR=/data`).

### 3. Environment variables

Set these on the **API service**:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Auto-linked from PostgreSQL plugin |
| `JWT_SECRET` | Yes | Random string, e.g. `openssl rand -hex 32` |
| `FRONTEND_URL` | Yes | Your Netlify URL, e.g. `https://yoursite.netlify.app` |
| `CORS_ORIGINS` | Yes | Same as frontend URL (comma-separated if multiple) |
| `STRIPE_SECRET_KEY` | For payments | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | For payments | From Stripe webhook endpoint |
| `STRIPE_PRICE_STARTER` | Optional | Stripe Price ID for Starter plan |
| `STRIPE_PRICE_PRO` | Optional | Stripe Price ID for Pro plan |
| `STRIPE_PRICE_BUSINESS` | Optional | Stripe Price ID for Business plan |
| `STRIPE_PRICE_CREDITS_25` | Optional | One-time credit pack price IDs |
| `STRIPE_PRICE_CREDITS_100` | Optional | |
| `STRIPE_PRICE_CREDITS_500` | Optional | |
| `XAI_API_KEY` | For live AI | xAI API key from [console.x.ai](https://console.x.ai) |
| `XAI_MODEL` | Optional | Default `grok-4.20-0309-non-reasoning` (cheaper text model) |
| `DATA_DIR` | Optional | e.g. `/data` if you mount a Railway volume |

### 4. Stripe webhook

In Stripe Dashboard → **Developers → Webhooks**:

- URL: `https://YOUR-RAILWAY-API.up.railway.app/api/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
- Copy the signing secret → `STRIPE_WEBHOOK_SECRET`

### 5. Point frontend at API

Edit `js/config.js` on the static site:

```js
window.PRORESUME_CONFIG = {
  apiUrl: 'https://YOUR-RAILWAY-API.up.railway.app'
};
```

Redeploy Netlify after changing config.

## Local development

```bash
cd backend
cp .env.example .env   # fill in values
npm install
npm run dev
```

Run Postgres locally (Docker):

```bash
docker run -d --name proresume-pg -e POSTGRES_PASSWORD=dev -e POSTGRES_DB=proresume -p 5432:5432 postgres:16
# DATABASE_URL=postgresql://postgres:dev@localhost:5432/proresume
```

Serve frontend:

```bash
npx serve .. -p 8080
```

## API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check |
| POST | `/api/auth/register` | No | Create account |
| POST | `/api/auth/login` | No | Login |
| GET | `/api/auth/me` | Yes | Current user |
| POST | `/api/auth/use-credits` | Yes | Deduct credits |
| GET | `/api/resumes` | Yes | List resumes |
| GET | `/api/resumes/:id` | Yes | Get resume |
| PUT | `/api/resumes/:id` | Yes | Save resume |
| POST | `/api/resumes` | Yes | Create resume |
| POST | `/api/stripe/create-checkout-session` | Yes | Start Stripe checkout |
| POST | `/api/stripe/create-portal-session` | Yes | Manage subscription |
| GET | `/api/ai/status` | No | Live Grok availability |
| POST | `/api/ai/generate` | Yes | Grok-powered suggestions (deducts credits) |
