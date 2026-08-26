import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { query } from '../db.js';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { getPlanLimits } from '../plans.js';
import { isEmailConfigured, sendVerificationEmail } from '../services/email.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many attempts. Try again later.' }
});

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

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
    emailVerified: row.email_verified !== false,
    createdAt: row.created_at
  };
}

function createVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function issueVerification(user) {
  const token = createVerificationToken();
  const expires = new Date(Date.now() + VERIFY_TTL_MS);
  await query(
    `UPDATE users SET email_verified = false,
     email_verification_token = $1,
     email_verification_expires = $2,
     updated_at = NOW()
     WHERE id = $3`,
    [token, expires, user.id]
  );
  await sendVerificationEmail({ email: user.email, name: user.name, token });
  return token;
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
    const emailConfigured = isEmailConfigured();
    const verificationToken = emailConfigured ? createVerificationToken() : null;
    const verificationExpires = emailConfigured ? new Date(Date.now() + VERIFY_TTL_MS) : null;

    const { rows } = await query(
      `INSERT INTO users (email, password_hash, name, credits, plan, email_verified,
       email_verification_token, email_verification_expires)
       VALUES ($1, $2, $3, $4, 'free', $5, $6, $7)
       RETURNING id, email, name, plan, credits, subscription_status, email_verified, created_at`,
      [
        normalized,
        hash,
        (name || '').trim(),
        getPlanLimits('free').credits,
        !emailConfigured,
        verificationToken,
        verificationExpires
      ]
    );
    const user = rows[0];

    await query(
      `INSERT INTO resumes (user_id, title, data, is_default)
       VALUES ($1, 'My Resume', $2, true)`,
      [user.id, JSON.stringify(getEmptyResume())]
    );

    if (emailConfigured) {
      await sendVerificationEmail({
        email: user.email,
        name: user.name,
        token: verificationToken
      });
      return res.status(201).json({
        needsVerification: true,
        email: user.email,
        message: 'Check your email for a verification link.'
      });
    }

    const token = signToken(user);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('register:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/verify-email', authLimiter, async (req, res) => {
  try {
    const token = (req.body?.token || req.query?.token || '').trim();
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const { rows } = await query(
      `SELECT id, email, name, plan, credits, subscription_status, email_verified, created_at,
              email_verification_expires
       FROM users WHERE email_verification_token = $1`,
      [token]
    );
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: 'This verification link is invalid or has already been used.' });
    }
    if (user.email_verified) {
      const jwtToken = signToken(user);
      return res.json({ token: jwtToken, user: sanitizeUser(user), alreadyVerified: true });
    }
    if (user.email_verification_expires && new Date(user.email_verification_expires) < new Date()) {
      return res.status(400).json({ error: 'This verification link has expired. Request a new one.' });
    }

    const { rows: updated } = await query(
      `UPDATE users SET email_verified = true,
       email_verification_token = NULL,
       email_verification_expires = NULL,
       updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, name, plan, credits, subscription_status, email_verified, created_at`,
      [user.id]
    );

    const jwtToken = signToken(updated[0]);
    res.json({ token: jwtToken, user: sanitizeUser(updated[0]) });
  } catch (err) {
    console.error('verify-email:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Email is not configured on the server.' });
    }
    const email = (req.body?.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { rows } = await query(
      `SELECT id, email, name, email_verified FROM users WHERE email = $1`,
      [email]
    );
    const user = rows[0];
    if (!user) {
      return res.json({ ok: true, message: 'If an account exists, a verification email was sent.' });
    }
    if (user.email_verified) {
      return res.json({ ok: true, message: 'This email is already verified. You can sign in.' });
    }

    await issueVerification(user);
    res.json({ ok: true, message: 'Verification email sent.' });
  } catch (err) {
    console.error('resend-verification:', err);
    res.status(500).json({ error: 'Could not send verification email' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const { rows } = await query(
      `SELECT id, email, name, plan, credits, password_hash, subscription_status,
              email_verified, created_at
       FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    if (isEmailConfigured() && !user.email_verified) {
      return res.status(403).json({
        error: 'Please verify your email before signing in.',
        needsVerification: true,
        email: user.email
      });
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
       RETURNING id, email, name, plan, credits, subscription_status, email_verified, created_at`,
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
