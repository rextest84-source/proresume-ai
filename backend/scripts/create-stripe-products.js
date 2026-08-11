/**
 * One-time script: creates Stripe products & prices for ProResume AI.
 *
 * Usage:
 *   cd backend
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-products.js
 *
 * Copy the printed env vars into Railway Variables.
 */
import Stripe from 'stripe';

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error('Set STRIPE_SECRET_KEY=sk_test_... and run again.');
  process.exit(1);
}

const stripe = new Stripe(key);

const PRODUCTS = [
  { env: 'STRIPE_PRICE_STARTER', name: 'ProResume AI Starter', amount: 800, interval: 'month', plan: 'starter' },
  { env: 'STRIPE_PRICE_PRO', name: 'ProResume AI Pro', amount: 1500, interval: 'month', plan: 'pro' },
  { env: 'STRIPE_PRICE_BUSINESS', name: 'ProResume AI Business', amount: 2000, interval: 'month', plan: 'business' },
  { env: 'STRIPE_PRICE_CREDITS_25', name: 'ProResume AI — 25 Credits', amount: 499, oneTime: true, pack: 'pack_25' },
  { env: 'STRIPE_PRICE_CREDITS_100', name: 'ProResume AI — 100 Credits', amount: 1499, oneTime: true, pack: 'pack_100' },
  { env: 'STRIPE_PRICE_CREDITS_500', name: 'ProResume AI — 500 Credits', amount: 1999, oneTime: true, pack: 'pack_500' }
];

console.log('\nCreating Stripe products & prices...\n');

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
  console.log(`${p.env}=${price.id}  (${p.name})`);
}

console.log(`
Done! Add these to Railway → Variables:

  STRIPE_SECRET_KEY=${key.startsWith('sk_') ? '(already set)' : key}

Plus each price ID above.

Webhook (Stripe Dashboard → Developers → Webhooks):
  URL: https://proresume-ai-production.up.railway.app/api/stripe/webhook
  Events: checkout.session.completed, customer.subscription.updated,
          customer.subscription.deleted, invoice.paid

Test card: 4242 4242 4242 4242
`);
