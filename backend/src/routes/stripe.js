import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../db.js';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { SUBSCRIPTION_PLANS, CREDIT_PACKS, getPlanLimits } from '../plans.js';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' });
}

/** Public — lets frontend show helpful messages when Stripe isn't configured yet */
router.get('/status', (_req, res) => {
  const plans = {};
  for (const [key, cfg] of Object.entries(SUBSCRIPTION_PLANS)) {
    plans[key] = !!process.env[cfg.priceEnv];
  }
  const creditPacks = {};
  for (const [key, cfg] of Object.entries(CREDIT_PACKS)) {
    creditPacks[key] = !!process.env[cfg.priceEnv];
  }
  res.json({
    configured: !!process.env.STRIPE_SECRET_KEY,
    webhook: !!process.env.STRIPE_WEBHOOK_SECRET,
    plans,
    creditPacks,
    ready: !!process.env.STRIPE_SECRET_KEY &&
      Object.values(plans).some(Boolean)
  });
});

async function getOrCreateCustomer(stripe, user) {
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: { userId: user.id }
  });
  await query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customer.id, user.id]);
  return customer.id;
}

/** Create Stripe Checkout session for subscription or credit pack */
router.post('/create-checkout-session', requireAuth, loadUser, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(503).json({ error: 'Payments not configured yet. Contact support.' });
    }

    const { type, plan, pack } = req.body;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const customerId = await getOrCreateCustomer(stripe, req.user);

    let sessionConfig;

    if (type === 'subscription' && plan && SUBSCRIPTION_PLANS[plan]) {
      const priceId = process.env[SUBSCRIPTION_PLANS[plan].priceEnv];
      if (!priceId) {
        return res.status(503).json({ error: `Subscription plan "${plan}" is not configured yet.` });
      }
      sessionConfig = {
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${frontendUrl}/account.html?checkout=success`,
        cancel_url: `${frontendUrl}/pricing.html?checkout=cancelled`,
        metadata: { userId: req.userId, planType: plan },
        subscription_data: { metadata: { userId: req.userId, plan } }
      };
    } else if (type === 'credits' && pack && CREDIT_PACKS[pack]) {
      const priceId = process.env[CREDIT_PACKS[pack].priceEnv];
      if (!priceId) {
        return res.status(503).json({ error: `Credit pack "${pack}" is not configured yet.` });
      }
      sessionConfig = {
        mode: 'payment',
        customer: customerId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${frontendUrl}/account.html?checkout=success&pack=${pack}`,
        cancel_url: `${frontendUrl}/pricing.html?checkout=cancelled`,
        metadata: { userId: req.userId, pack, credits: String(CREDIT_PACKS[pack].credits) }
      };
    } else {
      return res.status(400).json({ error: 'Invalid checkout type. Use subscription+plan or credits+pack.' });
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('checkout:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/** Stripe Customer Portal for managing subscription */
router.post('/create-portal-session', requireAuth, loadUser, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe || !req.user.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found' });
    }
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripe_customer_id,
      return_url: `${frontendUrl}/account.html`
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('portal:', err);
    res.status(500).json({ error: 'Failed to open billing portal' });
  }
});

/** Webhook — mount with raw body in index.js */
export async function handleStripeWebhook(req, res) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).send('Stripe not configured');

  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return res.status(503).send('Webhook secret not configured');

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.userId;
        if (!userId) break;

        if (session.mode === 'subscription') {
          const plan = session.metadata?.planType || 'starter';
          const limits = getPlanLimits(plan);
          await query(
            `UPDATE users SET plan = $1, credits = credits + $2,
             stripe_subscription_id = $3, subscription_status = 'active', updated_at = NOW()
             WHERE id = $4`,
            [plan, limits.monthlyCredits, session.subscription, userId]
          );
        } else if (session.metadata?.credits) {
          const credits = parseInt(session.metadata.credits, 10);
          const { rows } = await query(
            'UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2 RETURNING credits',
            [credits, userId]
          );
          if (rows[0]) {
            await query(
              `INSERT INTO credit_transactions (user_id, amount, reason, balance_after)
               VALUES ($1, $2, 'credit_pack_purchase', $3)`,
              [userId, credits, rows[0].credits]
            );
          }
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        const plan = sub.metadata?.plan || 'starter';
        if (userId && sub.status === 'active') {
          await query(
            `UPDATE users SET plan = $1, subscription_status = 'active', updated_at = NOW() WHERE id = $2`,
            [plan, userId]
          );
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (userId) {
          await query(
            `UPDATE users SET plan = 'free', subscription_status = 'cancelled',
             stripe_subscription_id = NULL, updated_at = NOW() WHERE id = $1`,
            [userId]
          );
        }
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        if (invoice.billing_reason !== 'subscription_cycle') break;
        const subId = invoice.subscription;
        const { rows } = await query(
          'SELECT id, plan FROM users WHERE stripe_subscription_id = $1',
          [subId]
        );
        if (rows[0]) {
          const limits = getPlanLimits(rows[0].plan);
          if (limits.monthlyCredits < 999999) {
            await query(
              'UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2',
              [limits.monthlyCredits, rows[0].id]
            );
          }
        }
        break;
      }
      default:
        break;
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

export default router;
