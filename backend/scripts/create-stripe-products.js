/**
 * One-time script: creates Stripe products & prices for ProResume AI.
 *
 * Usage:
 *   cd backend
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-products.js
 *
 * Copy the printed env vars into Railway Variables, then add the webhook.
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Set STRIPE_SECRET_KEY=sk_test_... and run again.');
  process.exit(1);
}

const stripe = new Stripe(key);

const FRONTEND = 'https://proresume.aeloriacareer.com';
const API = 'https://proresume-ai-production.up.railway.app';

const PRODUCTS = [
  { env: 'STRIPE_PRICE_STARTER', name: 'ProResume AI Starter', amount: 800, interval: 'month', plan: 'starter' },
  { env: 'STRIPE_PRICE_PRO', name: 'ProResume AI Pro', amount: 1500, interval: 'month', plan: 'pro' },
  { env: 'STRIPE_PRICE_BUSINESS', name: 'ProResume AI Business', amount: 2000, interval: 'month', plan: 'business' },
  { env: 'STRIPE_PRICE_CREDITS_25', name: 'ProResume AI — 25 Credits', amount: 499, oneTime: true, pack: 'pack_25' },
  { env: 'STRIPE_PRICE_CREDITS_100', name: 'ProResume AI — 100 Credits', amount: 1499, oneTime: true, pack: 'pack_100' },
  { env: 'STRIPE_PRICE_CREDITS_500', name: 'ProResume AI — 500 Credits', amount: 1999, oneTime: true, pack: 'pack_500' }
];

console.log('\nCreating Stripe products & prices...\n');

const envLines = [`STRIPE_SECRET_KEY=${key}`];

for (const p of PRODUCTS) {
  const product = await stripe.products.create({
    name: p.name,
    metadata: { plan: p.plan || '', pack: p.pack || '' }
  });

  const priceParams = {
    product: product.id,
    unit_amount: p.amount,
    currency: 'usd'
  };

  if (p.oneTime) {
    priceParams.metadata = { pack: p.pack };
  } else {
    priceParams.recurring = { interval: p.interval };
    priceParams.metadata = { plan: p.plan };
  }

  const price = await stripe.prices.create(priceParams);
  envLines.push(`${p.env}=${price.id}`);
  console.log(`${p.env}=${price.id}  (${p.name})`);
}

console.log(`
══════════════════════════════════════════════════════════════
Add these to Railway → Variables (then redeploy):

${envLines.join('\n')}

FRONTEND_URL=${FRONTEND}
CORS_ORIGINS=${FRONTEND},https://aeloriacareer.com,https://ai-proresume.netlify.app

After adding prices, create the webhook:
  Stripe Dashboard → Developers → Webhooks → Add endpoint
  URL: ${API}/api/stripe/webhook
  Events:
    - checkout.session.completed
    - customer.subscription.updated
    - customer.subscription.deleted
    - invoice.paid

Copy the signing secret → Railway variable:
  STRIPE_WEBHOOK_SECRET=whsec_...

Enable billing portal (for "Manage Billing" on account page):
  Stripe Dashboard → Settings → Billing → Customer portal → Activate

Verify setup:
  ${API}/api/stripe/status  → ready: true

Test checkout:
  1. Sign in at ${FRONTEND}/login.html
  2. ${FRONTEND}/pricing.html → Get Pro
  3. Card: 4242 4242 4242 4242 · any future expiry · any CVC
  4. Account page should show plan + credits within ~30 seconds
`);
