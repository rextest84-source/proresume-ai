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

### Step 1 - Stripe on Railway

Add **only** `STRIPE_SECRET_KEY` to Railway (test mode `sk_test_...` is fine).

On deploy, the API **automatically** creates or finds all 6 products/prices and registers the webhook. You do **not** need to copy price IDs manually.

Optional: run `node scripts/create-stripe-products.js` locally if you prefer manual control.

### Step 2 - Webhook

Usually **auto-created on deploy**. If checkout works but credits do not update after payment:

Stripe Dashboard → **Developers → Webhooks** — confirm endpoint exists, or set `STRIPE_WEBHOOK_SECRET` manually.

### Step 3 - Customer portal (for Manage Billing)

Stripe Dashboard → **Settings → Billing → Customer portal → Activate**

Allow: cancel subscription, update payment method, view invoices.

---

## Verify it works

1. Open https://proresume-ai-production.up.railway.app/api/stripe/status  
   → `"ready": true` when all price IDs + webhook secret are set

2. Sign in → https://proresume.aeloriacareer.com/pricing.html  
   → Green banner: "Secure checkout via Stripe is active"

3. Click **Get Pro** → pay with test card `4242 4242 4242 4242`  
   → Redirects to account page → plan and credits update within ~30 seconds

---

## Railway variables (reference)

**Required:**
```
JWT_SECRET
DATABASE_URL
FRONTEND_URL=https://proresume.aeloriacareer.com
CORS_ORIGINS=https://proresume.aeloriacareer.com,https://aeloriacareer.com,https://ai-proresume.netlify.app
```

**Stripe (auto-provision on deploy):**
```
STRIPE_SECRET_KEY
```

Optional overrides: `STRIPE_WEBHOOK_SECRET`, individual `STRIPE_PRICE_*` IDs

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
