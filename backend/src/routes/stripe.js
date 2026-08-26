import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../db.js';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { SUBSCRIPTION_PLANS, CREDIT_PACKS, getPlanLimits } from '../plans.js';
import {
  getStripePriceId,
  getStripeWebhookSecret,
  getStripeCatalogState
} from '../services/stripe-catalog.js';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' });
}

function planFromSession(session) {
  return session.metadata?.planType || session.metadata?.plan || 'starter';
}

function planFromSubscription(sub) {
  return sub.metadata?.plan ||
    sub.items?.data?.[0]?.price?.metadata?.plan ||
    'starter';
}

async function recordCreditTransaction(userId, amount, reason, balanceAfter) {
  await query(
    `INSERT INTO credit_transactions (user_id, amount, reason, balance_after)
     VALUES ($1, $2, $3, $4)`,
    [userId, amount, reason, balanceAfter]
  );
}

/** Public - lets frontend show helpful messages when Stripe isn't configured yet */
router.get('/status', (_req, res) => {
  const state = getStripeCatalogState();
  res.json({
    ...state,
    frontendUrl: process.env.FRONTEND_URL || null,
    missing: [
      !state.configured && 'STRIPE_SECRET_KEY',
      !state.webhook && 'STRIPE_WEBHOOK_SECRET',
      ...Object.entries(state.plans).filter(([, ok]) => !ok).map(([k]) => `STRIPE_PRICE_${k.toUpperCase()}`),
      ...Object.entries(state.creditPacks).filter(([, ok]) => !ok).map(([k]) => `STRIPE_PRICE_CREDITS_${k.replace('pack_', '')}`)
    ].filter(Boolean)
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
      return res.status(503).json({ error: 'Payments not configured yet. Email support@aeloriacareer.com for help.' });
    }

    const { type, plan, pack } = req.body;
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');
    const customerId = await getOrCreateCustomer(stripe, req.user);

    let sessionConfig;

    if (type === 'subscription' && plan && SUBSCRIPTION_PLANS[plan]) {
      const priceId = getStripePriceId(SUBSCRIPTION_PLANS[plan].priceEnv);
      if (!priceId) {
        return res.status(503).json({ error: `The ${plan} plan is not available yet. Try again soon or contact support@aeloriacareer.com.` });
      }
      sessionConfig = {
        mode: 'subscription',
        customer: customerId,
        client_reference_id: req.userId,
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${frontendUrl}/account.html?checkout=success&plan=${plan}`,
        cancel_url: `${frontendUrl}/pricing.html?checkout=cancelled`,
        metadata: { userId: req.userId, planType: plan },
        subscription_data: { metadata: { userId: req.userId, plan } }
      };
    } else if (type === 'credits' && pack && CREDIT_PACKS[pack]) {
      const priceId = getStripePriceId(CREDIT_PACKS[pack].priceEnv);
      if (!priceId) {
        return res.status(503).json({ error: 'This credit pack is not available yet. Contact support@aeloriacareer.com.' });
      }
      sessionConfig = {
        mode: 'payment',
        customer: customerId,
        client_reference_id: req.userId,
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
    const msg = err?.message || '';
    if (msg.includes('No such price')) {
      return res.status(503).json({ error: 'This plan price ID is invalid on Stripe. Re-run create-stripe-products.js and update Railway variables.' });
    }
    res.status(500).json({ error: err.message || 'Failed to create checkout session. Try again or contact support@aeloriacareer.com.' });
  }
});

/** Stripe Customer Portal for managing subscription */
router.post('/create-portal-session', requireAuth, loadUser, async (req, res) => {
  try {
    const stripe = getStripe();
    if (!stripe || !req.user.stripe_customer_id) {
      return res.status(400).json({ error: 'No billing account found. Subscribe from the pricing page first.' });
    }
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');
    const session = await stripe.billingPortal.sessions.create({
      customer: req.user.stripe_customer_id,
      return_url: `${frontendUrl}/account.html`
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('portal:', err);
    res.status(500).json({ error: 'Billing portal unavailable. Contact support@aeloriacareer.com.' });
  }
});

async function activateSubscription(userId, plan, subscriptionId) {
  const limits = getPlanLimits(plan);
  const { rows } = await query(
    `UPDATE users SET plan = $1, credits = credits + $2,
     stripe_subscription_id = $3, subscription_status = 'active', updated_at = NOW()
     WHERE id = $4 RETURNING credits`,
    [plan, limits.monthlyCredits, subscriptionId, userId]
  );
  if (rows[0]) {
    await recordCreditTransaction(userId, limits.monthlyCredits, `subscription_${plan}`, rows[0].credits);
  }
}

async function addCreditPack(userId, credits) {
  const { rows } = await query(
    'UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2 RETURNING credits',
    [credits, userId]
  );
  if (rows[0]) {
    await recordCreditTransaction(userId, credits, 'credit_pack_purchase', rows[0].credits);
  }
}

/** Webhook - mount with raw body in index.js */
export async function handleStripeWebhook(req, res) {
  const stripe = getStripe();
  if (!stripe) return res.status(503).send('Stripe not configured');

  const sig = req.headers['stripe-signature'];
  const secret = getStripeWebhookSecret();
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
        const userId = session.metadata?.userId || session.client_reference_id;
        if (!userId) break;

        if (session.mode === 'subscription' && session.subscription) {
          const plan = planFromSession(session);
          await activateSubscription(userId, plan, session.subscription);
        } else if (session.metadata?.credits) {
          const credits = parseInt(session.metadata.credits, 10);
          if (credits > 0) await addCreditPack(userId, credits);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        const plan = planFromSubscription(sub);
        if (userId && sub.status === 'active') {
          await query(
            `UPDATE users SET plan = $1, subscription_status = 'active',
             stripe_subscription_id = $2, updated_at = NOW() WHERE id = $3`,
            [plan, sub.id, userId]
          );
        } else if (userId && ['canceled', 'unpaid', 'past_due'].includes(sub.status)) {
          await query(
            `UPDATE users SET subscription_status = $1, updated_at = NOW() WHERE id = $2`,
            [sub.status, userId]
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
        } else {
          await query(
            `UPDATE users SET plan = 'free', subscription_status = 'cancelled',
             stripe_subscription_id = NULL, updated_at = NOW()
             WHERE stripe_subscription_id = $1`,
            [sub.id]
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
            const { rows: updated } = await query(
              'UPDATE users SET credits = credits + $1, updated_at = NOW() WHERE id = $2 RETURNING credits',
              [limits.monthlyCredits, rows[0].id]
            );
            if (updated[0]) {
              await recordCreditTransaction(
                rows[0].id,
                limits.monthlyCredits,
                'subscription_renewal',
                updated[0].credits
              );
            }
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
