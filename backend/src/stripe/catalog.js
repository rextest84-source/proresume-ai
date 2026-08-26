/** Stripe product catalog - shared by deploy script and runtime auto-provision. */
export const STRIPE_CATALOG = [
  { env: 'STRIPE_PRICE_STARTER', name: 'ProResume AI Starter', amount: 800, interval: 'month', plan: 'starter' },
  { env: 'STRIPE_PRICE_PRO', name: 'ProResume AI Pro', amount: 1500, interval: 'month', plan: 'pro' },
  { env: 'STRIPE_PRICE_BUSINESS', name: 'ProResume AI Business', amount: 2000, interval: 'month', plan: 'business' },
  { env: 'STRIPE_PRICE_CREDITS_25', name: 'ProResume AI | 25 Credits', amount: 499, oneTime: true, pack: 'pack_25' },
  { env: 'STRIPE_PRICE_CREDITS_100', name: 'ProResume AI | 100 Credits', amount: 1499, oneTime: true, pack: 'pack_100' },
  { env: 'STRIPE_PRICE_CREDITS_500', name: 'ProResume AI | 500 Credits', amount: 1999, oneTime: true, pack: 'pack_500' }
];

export const STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid'
];
