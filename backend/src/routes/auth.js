import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { getPlanLimits } from '../plans.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts. Try again later.' }
});

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function sanitizeUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    plan: row.plan,
    credits: row.credits,
    subscriptionStatus: row.subscription_status,
    createdAt: row.created_at
  };
}

router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    const normalized = email.trim().toLowerCase();
    const existing = await query('SELECT id FROM users WHERE email = $1', [normalized]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name, credits, plan)
       VALUES ($1, $2, $3, $4, 'free')
       RETURNING id, email, name, plan, credits, subscription_status, created_at`,
      [normalized, hash, (name || '').trim(), getPlanLimits('free').credits]
    );
    const user = rows[0];

    // Create default empty resume
    await query(
      `INSERT INTO resumes (user_id, title, data, is_default)
       VALUES ($1, 'My Resume', $2, true)`,
      [user.id, JSON.stringify(getEmptyResume())]
    );

    const token = signToken(user);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('register:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const { rows } = await query(
      `SELECT id, email, name, plan, credits, password_hash, subscription_status, created_at
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const token = signToken(user);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('login:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, loadUser, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

router.patch('/me', requireAuth, loadUser, async (req, res) => {
  try {
    const { name } = req.body;
    const { rows } = await query(
      `UPDATE users SET name = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, name, plan, credits, subscription_status, created_at`,
      [(name || '').trim(), req.userId]
    );
    res.json({ user: sanitizeUser(rows[0]) });
  } catch (err) {
    console.error('patch me:', err);
    res.status(500).json({ error: 'Update failed' });
  }
});

/** Deduct credits server-side (prevents localStorage tampering) */
router.post('/use-credits', requireAuth, loadUser, async (req, res) => {
  try {
    const { amount, reason } = req.body;
    const cost = parseInt(amount, 10);
    if (!cost || cost < 1) {
      return res.status(400).json({ error: 'Invalid credit amount' });
    }
    const limits = getPlanLimits(req.user.plan);
    if (limits.credits >= 999999) {
      return res.json({ credits: req.user.credits, unlimited: true });
    }
    if (req.user.credits < cost) {
      return res.status(402).json({
        error: 'Insufficient credits',
        credits: req.user.credits,
        required: cost
      });
    }
    const newBalance = req.user.credits - cost;
    await query('UPDATE users SET credits = $1, updated_at = NOW() WHERE id = $2', [newBalance, req.userId]);
    await query(
      `INSERT INTO credit_transactions (user_id, amount, reason, balance_after)
       VALUES ($1, $2, $3, $4)`,
      [req.userId, -cost, reason || 'feature_use', newBalance]
    );
    res.json({ credits: newBalance, deducted: cost });
  } catch (err) {
    console.error('use-credits:', err);
    res.status(500).json({ error: 'Credit deduction failed' });
  }
});

function getEmptyResume() {
  return {
    name: '', title: '', email: '', phone: '', location: '',
    summary: '',
    experience: [{ company: '', role: '', dates: '', description: '' }],
    education: [{ school: '', degree: '', year: '' }],
    skills: '',
    template: 'modern'
  };
}

export default router;
