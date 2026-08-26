import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { query } from '../db.js';
import { getPlanLimits } from '../plans.js';
import { getAiCreditCost } from '../ai/costs.js';
import { runAiAction } from '../ai/handlers.js';
import { getGrokModel, isGrokConfigured } from '../services/grok.js';

const router = Router();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many AI requests. Please wait a moment.' }
});

/** Public - lets the builder know live Grok is available */
router.get('/status', (_req, res) => {
  res.json({
    configured: isGrokConfigured(),
    model: isGrokConfigured() ? getGrokModel() : null,
    provider: 'xai'
  });
});

async function deductCredits(user, amount, reason) {
  const limits = getPlanLimits(user.plan);
  if (limits.credits >= 999999) {
    return { credits: user.credits, unlimited: true, deducted: 0 };
  }
  if (user.credits < amount) {
    const err = new Error('Insufficient credits');
    err.status = 402;
    err.credits = user.credits;
    err.required = amount;
    throw err;
  }
  const newBalance = user.credits - amount;
  await query('UPDATE users SET credits = $1, updated_at = NOW() WHERE id = $2', [newBalance, user.id]);
  await query(
    `INSERT INTO credit_transactions (user_id, amount, reason, balance_after)
     VALUES ($1, $2, $3, $4)`,
    [user.id, -amount, reason || 'ai_feature', newBalance]
  );
  return { credits: newBalance, unlimited: false, deducted: amount };
}

async function refundCredits(userId, amount, balanceAfter) {
  if (!amount) return;
  const restored = balanceAfter + amount;
  await query('UPDATE users SET credits = $1, updated_at = NOW() WHERE id = $2', [restored, userId]);
  await query(
    `INSERT INTO credit_transactions (user_id, amount, reason, balance_after)
     VALUES ($1, $2, 'ai_refund', $3)`,
    [userId, amount, restored]
  );
}

/** Live Grok generation - auth required, credits deducted atomically */
router.post('/generate', aiLimiter, requireAuth, loadUser, async (req, res) => {
  if (!isGrokConfigured()) {
    return res.status(503).json({ error: 'AI suggestions are temporarily unavailable. Offline suggestions still work.' });
  }

  const { action, resume, jobText, experienceIndex, regenerate } = req.body;
  const cost = getAiCreditCost(action);
  if (!cost) {
    return res.status(400).json({ error: 'Invalid AI action' });
  }

  let deducted = 0;
  let creditsAfter = req.user.credits;

  try {
    const billing = await deductCredits(req.user, cost, action);
    creditsAfter = billing.credits;
    deducted = billing.deducted;

    const result = await runAiAction(action, {
      resume: resume || {},
      jobText,
      experienceIndex: typeof experienceIndex === 'number' ? experienceIndex : parseInt(experienceIndex, 10),
      regenerate: !!regenerate
    });

    res.json({
      action,
      result,
      credits: creditsAfter,
      unlimited: billing.unlimited,
      source: 'grok',
      model: getGrokModel()
    });
  } catch (err) {
    if (deducted && !err.status) {
      try {
        await refundCredits(req.user.id, deducted, creditsAfter);
        creditsAfter += deducted;
      } catch (refundErr) {
        console.error('AI credit refund failed:', refundErr);
      }
    }

    if (err.status === 402) {
      return res.status(402).json({
        error: 'Insufficient credits',
        credits: err.credits,
        required: err.required
      });
    }
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }

    console.error('AI generate:', err);
    const detail = err.message?.includes('Grok') ? err.message : 'Live AI request failed';
    res.status(502).json({
      error: `${detail}. Credits were refunded if charged.`,
      credits: creditsAfter
    });
  }
});

export default router;
