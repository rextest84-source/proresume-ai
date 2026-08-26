import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../db.js';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { SUBSCRIPTION_PLANS, CREDIT_PACKS } from '../plans.js';
import {
  getStripePriceId,
  getStripeWebhookSecret,
  getStripeCatalogState
} from '../services/stripe-catalog.js';
import { storeStripeEvent } from '../services/stripe-events.js';
import { enqueueJob } from '../queue/index.js';

const router = Router();

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: '2024-12-18.acacia' });
}

/** Public - lets frontend show helpful messages when Stripe isn't configured yet */
router.get('/status', (_req, res) => {
  const state = getStripeCatalogState();
  res.json({
    ...state,
    frontendUrl: process.env.FRONTEND_URL || null
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
      return res.status(503).json({ error: 'Payments are temporarily unavailable. Email support@aeloriacareer.com for help.' });
    }

    const { type, plan, pack } = req.body;
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:8080').replace(/\/$/, '');
    const customerId = await getOrCreateCustomer(stripe, req.user);

    let sessionConfig;

    if (type === 'subscription' && plan && SUBSCRIPTION_PLANS[plan]) {
      const priceId = getStripePriceId(SUBSCRIPTION_PLANS[plan].priceEnv);
      if (!priceId) {
        return res.status(503).json({ error: `The ${plan} plan is temporarily unavailable. Contact support@aeloriacareer.com.` });
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
        return res.status(503).json({ error: 'This credit pack is temporarily unavailable. Contact support@aeloriacareer.com.' });
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
      return res.status(503).json({ error: 'Checkout is temporarily unavailable. Email support@aeloriacareer.com for help.' });
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

/** Webhook - verify, persist, enqueue for worker processing */
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
    const stored = await storeStripeEvent(event);
    if (stored) {
      await enqueueJob('stripe_event', { stripeEventId: event.id });
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook enqueue:', err);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
}

export default router;
