# Go-live checklist — ProResume AI

Everything you need in one place. Most of this is **already built** — a few steps need your Stripe account.

---

## What's already done

| Item | Status |
|------|--------|
| Railway API | https://proresume-ai-production.up.railway.app |
| PostgreSQL (cloud saves) | Connected |
| Sign up / sign in | `/signup.html`, `/login.html` |
| Resume builder + cloud sync | `/builder.html` (when signed in) |
| Account page | `/account.html` |
| Legal pages (Stripe wants these) | Terms, Privacy, Refunds |
| Pricing page + Stripe checkout code | `/pricing.html` |

---

## Your 3 remaining steps

### Step 1 — Confirm Netlify redeployed (automatic)

Push to `main` triggers Netlify. The site now points at your Railway API automatically.

**Quick test:**
1. Open **https://ai-proresume.netlify.app/signup.html**
2. Create account → `/builder.html` → type your name → refresh
3. Still there? **Cloud save works.**

**Railway variable (recommended):**
```
FRONTEND_URL=https://ai-proresume.netlify.app
CORS_ORIGINS=https://ai-proresume.netlify.app
```
(CORS also auto-allows any `*.netlify.app` site.)

### Step 2 — Stripe products (one-time, ~10 min)

On your computer, in the project folder:

```bash
cd backend
STRIPE_SECRET_KEY=sk_test_YOUR_KEY node scripts/create-stripe-products.js
```

It prints lines like:
```
STRIPE_PRICE_STARTER=price_xxxxx
STRIPE_PRICE_PRO=price_xxxxx
...
```

Copy each into **Railway → proresume-ai service → Variables**.

Also add:
- `STRIPE_SECRET_KEY` = your `sk_test_...` key

### Step 3 — Stripe webhook

Stripe Dashboard → **Developers → Webhooks → Add endpoint**

- **URL:** `https://proresume-ai-production.up.railway.app/api/stripe/webhook`
- **Events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`
- Copy signing secret → Railway variable `STRIPE_WEBHOOK_SECRET`

**Test checkout:** Sign in → `/pricing.html` → Get Pro → card `4242 4242 4242 4242`

---

## Stripe account verification

When Stripe asks about your business, point them to:

- **Website:** https://ai-proresume.netlify.app
- **Product:** SaaS resume builder with subscriptions ($8–$20/mo)
- **Policies:** `/terms-of-service.html`, `/privacy-policy.html`, `/refund-policy.html`
- **Support:** https://ai-proresume.netlify.app/contact.html (contact form — no domain email required)
- **Checkout:** live on `/pricing.html` (test mode is fine for review)

### Legal business name vs product name

**ProResume AI** is the **product/brand** on the site. Your **Stripe legal entity** must be your **real registered business name** (LLC, sole prop, etc.).

That is normal. Stripe allows:
- **Legal name:** your actual company (what's on your tax/bank docs)
- **DBA / statement descriptor:** can show "ProResume" or similar on card statements

**What must match:** the name on your site's **Terms, Privacy, and footer** should be your **registered DBA** (business trade name) — **not your personal legal name**.

Example: your DBA **Aeloria Career Services** appears on Terms, Privacy, and footer. Product brand **ProResume AI** stays on the app and marketing. No LLC suffix unless you registered as an LLC.

**No domain yet?** Use the Netlify contact form for support. Stripe accepts that for verification.

---

## Railway variables (reference)

**Required (you already have these):**
- `JWT_SECRET`
- `DATABASE_URL` (from Postgres reference)

**Optional (CORS auto-allows `*.netlify.app` now):**
- `FRONTEND_URL` — your Netlify URL
- `CORS_ORIGINS` — same URL

**For payments:**
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`
- `STRIPE_PRICE_CREDITS_25`, `STRIPE_PRICE_CREDITS_100`, `STRIPE_PRICE_CREDITS_500`

**Ignore:** `DATA_DIR` (not needed)

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Signup fails | Check browser console; API must be reachable |
| CORS error | Redeploy Railway after this update (auto-allows Netlify) |
| Checkout says not configured | Run Stripe script + add price IDs to Railway |
| Credits don't update after pay | Add webhook + `STRIPE_WEBHOOK_SECRET` |

Check API: https://proresume-ai-production.up.railway.app/health  
Check Stripe: https://proresume-ai-production.up.railway.app/api/stripe/status
