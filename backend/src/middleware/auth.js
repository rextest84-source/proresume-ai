import jwt from 'jsonwebtoken';
import { query } from '../db.js';

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    req.userEmail = payload.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export async function loadUser(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id, email, name, plan, credits, subscription_status, stripe_customer_id,
              email_verified, created_at
       FROM users WHERE id = $1`,
      [req.userId]
    );
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    req.user = rows[0];
    next();
  } catch (err) {
    console.error('loadUser:', err);
    res.status(500).json({ error: 'Failed to load user' });
  }
}
