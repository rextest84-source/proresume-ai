import { STRIPE_CATALOG, STRIPE_WEBHOOK_EVENTS } from '../stripe/catalog.js';
import { getPlatformConfig, setPlatformConfig } from './platform-config.js';

const priceIds = {};
let webhookSecret = null;
let catalogReady = false;
let catalogError = null;

function getApiBaseUrl() {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  return 'https://proresume-ai-production.up.railway.app';
}

export function getStripePriceId(envKey) {
  return process.env[envKey]?.trim() || priceIds[envKey] || null;
}

export function getStripeWebhookSecret() {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || webhookSecret || null;
}

export function getStripeCatalogState() {
  const plans = {};
  const creditPacks = {};
  for (const item of STRIPE_CATALOG) {
    const set = Boolean(getStripePriceId(item.env));
    if (item.plan) plans[item.plan] = set;
    if (item.pack) creditPacks[item.pack] = set;
  }
  const hasKey = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const hasWebhook = Boolean(getStripeWebhookSecret());
  const subscriptionPlansReady = ['starter', 'pro', 'business'].every(p => plans[p]);
  const creditPacksReady = ['pack_25', 'pack_100', 'pack_500'].every(p => creditPacks[p]);
  return {
    catalogReady,
    catalogError,
    configured: hasKey,
    webhook: hasWebhook,
    plans,
    creditPacks,
    subscriptionPlansReady,
    creditPacksReady,
    ready: hasKey && hasWebhook && subscriptionPlansReady && creditPacksReady,
    autoProvisioned: Object.keys(priceIds).length > 0 || Boolean(webhookSecret && !process.env.STRIPE_WEBHOOK_SECRET)
  };
}

async function findProduct(stripe, item) {
  const { data } = await stripe.products.list({ active: true, limit: 100 });
  return data.find(p =>
    (item.plan && p.metadata?.plan === item.plan) ||
    (item.pack && p.metadata?.pack === item.pack)
  );
}

async function findMatchingPrice(stripe, productId, item) {
  const { data } = await stripe.prices.list({ product: productId, active: true, limit: 20 });
  if (item.oneTime) {
    return data.find(p => p.type === 'one_time' && p.unit_amount === item.amount);
  }
  return data.find(p =>
    p.type === 'recurring' &&
    p.unit_amount === item.amount &&
    p.recurring?.interval === item.interval
  );
}

async function ensurePrice(stripe, item) {
  const fromEnv = process.env[item.env]?.trim();
  if (fromEnv) {
    priceIds[item.env] = fromEnv;
    return fromEnv;
  }

  let product = await findProduct(stripe, item);
  if (!product) {
    product = await stripe.products.create({
      name: item.name,
      metadata: { plan: item.plan || '', pack: item.pack || '' }
    });
    console.log(`Stripe: created product ${item.name}`);
  }

  let price = await findMatchingPrice(stripe, product.id, item);
  if (!price) {
    const priceParams = {
      product: product.id,
      unit_amount: item.amount,
      currency: 'usd'
    };
    if (item.oneTime) {
      priceParams.metadata = { pack: item.pack };
    } else {
      priceParams.recurring = { interval: item.interval };
      priceParams.metadata = { plan: item.plan };
    }
    price = await stripe.prices.create(priceParams);
    console.log(`Stripe: created price for ${item.name} → ${price.id}`);
  }

  priceIds[item.env] = price.id;
  return price.id;
}

async function ensureWebhook(stripe) {
  const fromEnv = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (fromEnv) {
    webhookSecret = fromEnv;
    return fromEnv;
  }

  const stored = await getPlatformConfig('stripe_webhook_secret');
  if (stored) {
    webhookSecret = stored;
    return stored;
  }

  const webhookUrl = `${getApiBaseUrl()}/api/stripe/webhook`;
  const { data: endpoints } = await stripe.webhookEndpoints.list({ limit: 100 });
  const existing = endpoints.find(e => e.url === webhookUrl && e.status !== 'disabled');

  if (existing) {
    console.warn(
      'Stripe webhook endpoint exists but signing secret is unknown. ' +
      'Set STRIPE_WEBHOOK_SECRET on Railway or delete the endpoint so we can recreate it.'
    );
    return null;
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: STRIPE_WEBHOOK_EVENTS,
    description: 'ProResume AI Railway auto-provision'
  });

  webhookSecret = endpoint.secret;
  await setPlatformConfig('stripe_webhook_secret', endpoint.secret);
  console.log(`Stripe: created webhook endpoint → ${webhookUrl}`);
  return endpoint.secret;
}

/** Resolve or create Stripe prices + webhook on deploy (no manual price IDs required). */
export async function initStripeCatalog(stripe) {
  if (!stripe) return;

  try {
    for (const item of STRIPE_CATALOG) {
      await ensurePrice(stripe, item);
    }
    await ensureWebhook(stripe);
    catalogReady = true;
    catalogError = null;
    const state = getStripeCatalogState();
    console.log(`Stripe catalog ready: payments=${state.ready}`);
  } catch (err) {
    catalogReady = false;
    catalogError = err.message;
    console.error('Stripe catalog init failed:', err.message);
  }
}
