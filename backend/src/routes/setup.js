import { Router } from 'express';
import Stripe from 'stripe';
import { getPool } from '../db.js';
import { isGrokConfigured, getGrokModel } from '../services/grok.js';
import { SUBSCRIPTION_PLANS, CREDIT_PACKS } from '../plans.js';

const router = Router();

const CORE_VARS = [
  { key: 'DATABASE_URL', label: 'PostgreSQL connection', required: true },
  { key: 'JWT_SECRET', label: 'Auth signing secret', required: true },
  { key: 'FRONTEND_URL', label: 'Public site URL for redirects', required: true },
  { key: 'CORS_ORIGINS', label: 'Allowed browser origins', required: true }
];

const STRIPE_VARS = [
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe API secret key', required: true },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe webhook signing secret', required: true },
  ...Object.entries(SUBSCRIPTION_PLANS).map(([plan, cfg]) => ({
    key: cfg.priceEnv,
    label: `${plan} subscription price ID`,
    required: true
  })),
  ...Object.entries(CREDIT_PACKS).map(([pack, cfg]) => ({
    key: cfg.priceEnv,
    label: `${pack.replace('pack_', '')} credit pack price ID`,
    required: true
  }))
];

const AI_VARS = [
  { key: 'XAI_API_KEY', label: 'xAI Grok API key', required: false },
  { key: 'XAI_MODEL', label: 'Grok model override', required: false }
];

function envStatus(key) {
  const value = process.env[key];
  const set = Boolean(value?.trim());
  return { key, set, required: undefined };
}

async function checkDatabase() {
  try {
    const pool = getPool();
    await pool.query('SELECT 1');
    return { connected: true, error: null };
  } catch (err) {
    return { connected: false, error: err.message };
  }
}

async function checkStripeKey() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return { set: false, valid: null, error: 'STRIPE_SECRET_KEY not set' };
  try {
    const stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
    await stripe.products.list({ limit: 1 });
    return { set: true, valid: true, error: null };
  } catch (err) {
    return { set: true, valid: false, error: err.message };
  }
}

async function checkGrokKey() {
  if (!isGrokConfigured()) {
    return { set: false, valid: null, error: 'XAI_API_KEY not set' };
  }
  try {
    const res = await fetch('https://api.x.ai/v1/models', {
      headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` }
    });
    if (res.ok) return { set: true, valid: true, error: null, model: getGrokModel() };
    const data = await res.json().catch(() => ({}));
    const msg = data.error?.message || data.error || res.statusText;
    return { set: true, valid: false, error: msg, model: getGrokModel() };
  } catch (err) {
    return { set: true, valid: false, error: err.message, model: getGrokModel() };
  }
}

function buildVarSection(defs) {
  return defs.map(({ key, label, required }) => ({
    key,
    label,
    required,
    set: Boolean(process.env[key]?.trim())
  }));
}

/** Public - full Railway / env checklist for admins */
router.get('/status', async (_req, res) => {
  const core = buildVarSection(CORE_VARS);
  const stripeVars = buildVarSection(STRIPE_VARS);
  const ai = buildVarSection(AI_VARS);

  const [database, stripeKey, grok] = await Promise.all([
    checkDatabase(),
    checkStripeKey(),
    checkGrokKey()
  ]);

  const missingCore = core.filter(v => v.required && !v.set).map(v => v.key);
  const missingStripe = stripeVars.filter(v => v.required && !v.set).map(v => v.key);
  const missingAi = ai.filter(v => v.required && !v.set).map(v => v.key);

  const stripePricesReady = stripeVars
    .filter(v => v.key.startsWith('STRIPE_PRICE_'))
    .every(v => v.set);

  const paymentsReady =
    stripeKey.set &&
    stripeKey.valid === true &&
    stripeVars.find(v => v.key === 'STRIPE_WEBHOOK_SECRET')?.set &&
    stripePricesReady;

  res.json({
    ok: missingCore.length === 0 && database.connected,
    railway: {
      services: [
        {
          id: 'postgresql',
          label: 'PostgreSQL database',
          required: true,
          status: database.connected ? 'connected' : 'missing_or_error',
          error: database.error,
          hint: database.connected
            ? null
            : 'Railway project → + New → Database → PostgreSQL → link DATABASE_URL to the API service'
        },
        {
          id: 'api',
          label: 'Node.js API (this service)',
          required: true,
          status: 'running',
          url: process.env.RAILWAY_PUBLIC_DOMAIN
            ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
            : null
        }
      ]
    },
    variables: {
      core: { items: core, missing: missingCore, ready: missingCore.length === 0 },
      stripe: {
        items: stripeVars,
        missing: missingStripe,
        ready: paymentsReady,
        keyValid: stripeKey.valid,
        keyError: stripeKey.error
      },
      ai: {
        items: ai,
        missing: missingAi,
        configured: grok.set,
        keyValid: grok.valid,
        keyError: grok.error,
        model: grok.model || null
      }
    },
    missing: [...missingCore, ...missingStripe, ...missingAi],
    paymentsReady,
    liveAiReady: grok.set && grok.valid === true,
    nextSteps: buildNextSteps({
      missingCore,
      missingStripe,
      stripeKey,
      stripePricesReady,
      grok,
      database
    })
  });
});

function buildNextSteps(ctx) {
  const steps = [];

  if (!ctx.database.connected) {
    steps.push('Add PostgreSQL in Railway and link DATABASE_URL to the API service.');
  }
  if (ctx.missingCore.length) {
    steps.push(`Set core variables on the API service: ${ctx.missingCore.join(', ')}`);
  }
  if (!ctx.stripeKey.set) {
    steps.push('Add STRIPE_SECRET_KEY from Stripe Dashboard → Developers → API keys (test mode sk_test_... is fine to start).');
  } else if (ctx.stripeKey.valid === false) {
    steps.push(`Replace invalid STRIPE_SECRET_KEY on Railway (Stripe error: ${ctx.stripeKey.error}).`);
  }
  if (ctx.missingStripe.includes('STRIPE_WEBHOOK_SECRET')) {
    steps.push('Create webhook at /api/stripe/webhook in Stripe Dashboard and add STRIPE_WEBHOOK_SECRET to Railway.');
  }
  if (!ctx.stripePricesReady) {
    steps.push('Run: cd backend && STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-products.js');
    steps.push('Copy all six STRIPE_PRICE_* values into Railway Variables, then redeploy.');
  }
  if (!ctx.grok.set) {
    steps.push('Optional: add XAI_API_KEY from console.x.ai for live AI (offline fallback works without it).');
  } else if (ctx.grok.valid === false) {
    steps.push(`Replace invalid XAI_API_KEY on Railway (xAI error: ${ctx.grok.error}).`);
  }
  if (ctx.stripePricesReady && ctx.stripeKey.valid) {
    steps.push('Activate Stripe Customer Portal: Dashboard → Settings → Billing → Customer portal.');
  }

  return steps;
}

export default router;
