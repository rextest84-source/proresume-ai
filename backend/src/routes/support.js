import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { requireAuth, loadUser } from '../middleware/auth.js';
import { isEmailConfigured, sendEmail } from '../services/email.js';
import { buildContactStaffHtml, buildContactStaffText, contactStaffSubject } from '../emails/contact-emails.js';

const router = Router();

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Too many messages. Please wait a moment.' }
});

const WELCOME_MESSAGE =
  'Ask us about billing, your account, or using the builder. We usually reply within a business day.';

function mapRow(row) {
  return {
    id: row.id,
    role: row.role,
    body: row.body,
    createdAt: row.created_at
  };
}

async function ensureWelcomeMessage(userId) {
  const { rows } = await query(
    'SELECT id FROM support_chat_messages WHERE user_id = $1 LIMIT 1',
    [userId]
  );
  if (rows.length) return;
  await query(
    `INSERT INTO support_chat_messages (user_id, role, body) VALUES ($1, 'system', $2)`,
    [userId, WELCOME_MESSAGE]
  );
}

router.get('/messages', requireAuth, loadUser, async (req, res) => {
  try {
    await ensureWelcomeMessage(req.userId);
    const { rows } = await query(
      `SELECT id, role, body, created_at
       FROM support_chat_messages
       WHERE user_id = $1
       ORDER BY created_at ASC
       LIMIT 200`,
      [req.userId]
    );
    res.json({ messages: rows.map(mapRow) });
  } catch (err) {
    console.error('support messages list:', err);
    res.status(500).json({ error: 'Could not load chat' });
  }
});

router.post('/messages', chatLimiter, requireAuth, loadUser, async (req, res) => {
  try {
    const body = (req.body?.body || '').trim();
    if (!body) {
      return res.status(400).json({ error: 'Message is required' });
    }
    if (body.length > 4000) {
      return res.status(400).json({ error: 'Message is too long (max 4000 characters)' });
    }

    await ensureWelcomeMessage(req.userId);

    const { rows } = await query(
      `INSERT INTO support_chat_messages (user_id, role, body)
       VALUES ($1, 'user', $2)
       RETURNING id, role, body, created_at`,
      [req.userId, body]
    );
    const message = mapRow(rows[0]);

    if (isEmailConfigured()) {
      const payload = {
        id: message.id,
        name: req.user.name || req.user.email,
        email: req.user.email,
        subject: 'support',
        message: `[Support chat]\n\n${body}`
      };
      sendEmail({
        to: process.env.SUPPORT_EMAIL || 'support@aeloriacareer.com',
        subject: contactStaffSubject(payload),
        text: buildContactStaffText(payload),
        html: buildContactStaffHtml(payload),
        replyTo: req.user.email
      }).catch((err) => console.error('support chat email:', err.message));
    }

    res.status(201).json({ message });
  } catch (err) {
    console.error('support message send:', err);
    res.status(500).json({ error: 'Could not send message' });
  }
});

export default router;
