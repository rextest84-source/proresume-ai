import { query } from '../db.js';
import { getPlanLimits } from '../plans.js';

async function recordCreditTransaction(userId, amount, reason, balanceAfter) {
  await query(
    `INSERT INTO credit_transactions (user_id, amount, reason, balance_after)
     VALUES ($1, $2, $3, $4)`,
    [userId, amount, reason, balanceAfter]
  );
}

function planFromSession(session) {
  return session.metadata?.planType || session.metadata?.plan || 'starter';
}

function planFromSubscription(sub) {
  return sub.metadata?.plan ||
    sub.items?.data?.[0]?.price?.metadata?.plan ||
    'starter';
}

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

export async function processStripeEvent(event) {
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
}

export async function storeStripeEvent(event) {
  const { rows } = await query(
    `INSERT INTO stripe_events (stripe_event_id, type, payload, status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING id, status`,
    [event.id, event.type, JSON.stringify(event)]
  );
  return rows[0] || null;
}

export async function markStripeEventProcessed(stripeEventId) {
  await query(
    `UPDATE stripe_events SET status = 'processed', processed_at = NOW() WHERE stripe_event_id = $1`,
    [stripeEventId]
  );
}

export async function markStripeEventFailed(stripeEventId, errorMessage) {
  await query(
    `UPDATE stripe_events SET status = 'failed', last_error = $2, updated_at = NOW() WHERE stripe_event_id = $1`,
    [stripeEventId, errorMessage]
  );
}

export async function processStoredStripeEvent(stripeEventId) {
  const { rows } = await query(
    `SELECT payload, status FROM stripe_events WHERE stripe_event_id = $1`,
    [stripeEventId]
  );
  if (!rows[0]) throw new Error(`Stripe event ${stripeEventId} not found`);
  if (rows[0].status === 'processed') return;

  const event = typeof rows[0].payload === 'string'
    ? JSON.parse(rows[0].payload)
    : rows[0].payload;

  await processStripeEvent(event);
  await markStripeEventProcessed(stripeEventId);
}
