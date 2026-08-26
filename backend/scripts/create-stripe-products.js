/**
 * One-time script: creates Stripe products & prices for ProResume AI.
 *
 * Usage:
 *   cd backend
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-products.js
 *
 * On Railway, the API auto-provisions these on deploy when STRIPE_SECRET_KEY is set.
 * Use this script only for local testing or manual Stripe Dashboard setup.
 */
import Stripe from 'stripe';
import { STRIPE_CATALOG, STRIPE_WEBHOOK_EVENTS } from '../src/stripe/catalog.js';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Set STRIPE_SECRET_KEY=sk_test_... and run again.');
  process.exit(1);
}

const stripe = new Stripe(key);

const FRONTEND = 'https://proresume.aeloriacareer.com';
const API = 'https://proresume-ai-production.up.railway.app';

console.log('\nCreating Stripe products & prices...\n');

const envLines = [`STRIPE_SECRET_KEY=${key}`];

for (const p of STRIPE_CATALOG) {
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
Optional: add these to Railway (auto-provision runs on deploy if omitted)

${envLines.join('\n')}

FRONTEND_URL=${FRONTEND}
CORS_ORIGINS=${FRONTEND},https://aeloriacareer.com,https://ai-proresume.netlify.app

Webhook (auto-created on Railway deploy, or add manually):
  URL: ${API}/api/stripe/webhook
  Events: ${STRIPE_WEBHOOK_EVENTS.join(', ')}

Enable billing portal (Stripe Dashboard → Settings → Billing → Customer portal)

Verify: ${API}/api/stripe/status → ready: true
`);
