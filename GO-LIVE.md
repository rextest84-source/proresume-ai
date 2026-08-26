# Go-live checklist - ProResume AI

Everything you need in one place. The code is ready - connect Stripe on Railway to activate paid plans.

---

## What's already done

| Item | Status |
|------|--------|
| Live site | https://proresume.aeloriacareer.com |
| Support email | support@aeloriacareer.com |
| Railway API | https://proresume-ai-production.up.railway.app |
| PostgreSQL (cloud saves) | Connected |
| Sign up / sign in | `/signup.html`, `/login.html` |
| Resume builder + cloud sync | `/builder.html` (when signed in) |
| Account page + billing portal | `/account.html` |
| Legal pages | Terms, Privacy, Refunds |
| Pricing + Stripe checkout code | `/pricing.html` |

## Stripe account: when can you build checkout?

You need a **Stripe account first** to get API keys. You do not wait for full business verification to start building.

1. **Sign up at stripe.com** (free). You immediately get **test mode** keys (`sk_test_...`).
2. **Build and test checkout** using test keys and test card `4242 4242 4242 4242`.
3. **Submit business verification** in Stripe Dashboard when ready for live payments.
4. After approval, switch Railway to **live keys** (`sk_live_...`) and live price IDs.

Stripe Checkout is **not automatic**. Your site redirects users to Stripe's hosted payment page via the API you integrate (already built in this repo). Stripe handles card entry and security; you must provide products, price IDs, webhooks, and the Customer Portal.

---

### Step 1 - Create products & prices

On your computer, in the project folder:

```bash
cd backend
STRIPE_SECRET_KEY=sk_test_YOUR_KEY node scripts/create-stripe-products.js
```

The script prints **all Railway variables** to copy. Add them in **Railway → Variables**, then redeploy.

### Step 2 - Webhook

Stripe Dashboard → **Developers → Webhooks → Add endpoint**

- **URL:** `https://proresume-ai-production.up.railway.app/api/stripe/webhook`
- **Events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
- Copy signing secret → Railway: `STRIPE_WEBHOOK_SECRET=whsec_...`

### Step 3 - Customer portal (for Manage Billing)

Stripe Dashboard → **Settings → Billing → Customer portal → Activate**

Allow: cancel subscription, update payment method, view invoices.

---

## Verify it works

1. Open https://proresume-ai-production.up.railway.app/api/setup/status  
   → Shows **every** Railway variable, PostgreSQL status, and whether Stripe/xAI keys are valid

2. Open https://proresume-ai-production.up.railway.app/api/stripe/status  
   → `"ready": true` when all price IDs + webhook secret are set

3. Sign in → https://proresume.aeloriacareer.com/pricing.html  
   → Green banner: "Secure checkout via Stripe is active"

4. Click **Get Pro** → pay with test card `4242 4242 4242 4242`  
   → Redirects to account page → plan and credits update within ~30 seconds

---

## Railway services (not just variables)

Your Railway **project** needs these **services**:

| Service | What it does | How to add |
|---------|----------------|------------|
| **API** (Node.js) | Auth, resumes, Stripe, Grok | Deploy from GitHub, root directory `backend` |
| **PostgreSQL** | Cloud saves, user accounts | Project → **+ New** → **Database** → **PostgreSQL** → link `DATABASE_URL` to API |

Optional later: **Volume** mounted at `/data` only if you store uploaded files on disk (`DATA_DIR=/data`). Resume JSON already lives in Postgres.

---

## Current production gaps (check live)

Open `/api/setup/status` on your API URL. As of the last audit, these were the typical blockers:

| Status | Item |
|--------|------|
| Usually OK | PostgreSQL, JWT_SECRET, FRONTEND_URL, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, XAI_API_KEY |
| **Still missing** | All 6 Stripe **price IDs** (see below) |
| Stripe Dashboard | Customer Portal must be **activated** manually |

**Missing price IDs to add in Railway → Variables:**

```
STRIPE_PRICE_STARTER
STRIPE_PRICE_PRO
STRIPE_PRICE_BUSINESS
STRIPE_PRICE_CREDITS_25
STRIPE_PRICE_CREDITS_100
STRIPE_PRICE_CREDITS_500
```

Generate them with:

```bash
cd backend
STRIPE_SECRET_KEY=sk_test_YOUR_KEY node scripts/create-stripe-products.js
```

Copy the six `price_...` lines into Railway, **Redeploy**, then confirm `/api/stripe/status` shows `"ready": true`.

---

## Railway variables (reference)

**Required:**
```
JWT_SECRET
DATABASE_URL
FRONTEND_URL=https://proresume.aeloriacareer.com
CORS_ORIGINS=https://proresume.aeloriacareer.com,https://aeloriacareer.com,https://ai-proresume.netlify.app
```

**Stripe (after running create-stripe-products.js):**
```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_STARTER
STRIPE_PRICE_PRO
STRIPE_PRICE_BUSINESS
STRIPE_PRICE_CREDITS_25
STRIPE_PRICE_CREDITS_100
STRIPE_PRICE_CREDITS_500
```

(CORS also auto-allows `*.netlify.app` and `*.aeloriacareer.com`.)

---

## Stripe account verification

| Field | Value |
|-------|--------|
| **Website** | https://proresume.aeloriacareer.com |
| **Support email** | support@aeloriacareer.com |
| **DBA** | Aeloria Career Services |
| **Product** | SaaS resume builder, $8–$20/mo subscriptions + credit packs |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Signup fails / CORS | Set `FRONTEND_URL` + redeploy Railway |
| Checkout says not configured | Run Stripe script + add all price IDs |
| `/api/stripe/status` ready: false | Missing webhook secret or a price ID |
| Credits don't update after pay | Check webhook events + `STRIPE_WEBHOOK_SECRET` |
| Manage Billing fails | Activate Customer Portal in Stripe Dashboard |

Check API: https://proresume-ai-production.up.railway.app/health  
Check Stripe: https://proresume-ai-production.up.railway.app/api/stripe/status
