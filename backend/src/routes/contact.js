import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { enqueueJob } from '../queue/index.js';
import { isEmailConfigured, sendContactNotification } from '../services/email.js';

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many contact requests. Please try again later.' }
});

/** Deliver immediately from the API — do not rely on a separate worker service. */
export async function deliverContactMessage(message) {
  const { rows: existing } = await query('SELECT status FROM contact_messages WHERE id = $1', [message.id]);
  if (existing[0]?.status === 'sent') return;

  await sendContactNotification(message);
  await query(
    `UPDATE contact_messages SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [message.id]
  );
}

router.post('/', contactLimiter, async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email address.' });
    }

    const allowedSubjects = ['support', 'billing', 'refund', 'sales', 'other'];
    if (!allowedSubjects.includes(subject)) {
      return res.status(400).json({ error: 'Invalid subject.' });
    }

    if (!isEmailConfigured()) {
      return res.status(503).json({
        error: 'Messaging is temporarily unavailable. Email support@aeloriacareer.com directly.'
      });
    }

    const { rows } = await query(
      `INSERT INTO contact_messages (name, email, subject, message, status)
       VALUES ($1, $2, $3, $4, 'queued')
       RETURNING id, name, email, subject, message`,
      [name.trim(), email.trim().toLowerCase(), subject, message.trim()]
    );

    const record = rows[0];

    try {
      await deliverContactMessage(record);
    } catch (emailErr) {
      console.error('contact email failed, queueing retry:', emailErr.message);
      await enqueueJob('contact_message', { messageId: record.id }).catch(() => {});
      return res.status(503).json({
        error: 'Could not deliver your message. Please try again or email support@aeloriacareer.com directly.'
      });
    }

    res.status(201).json({ ok: true, id: record.id, delivered: true });
  } catch (err) {
    console.error('contact:', err);
    res.status(500).json({ error: 'Could not send message. Email support@aeloriacareer.com directly.' });
  }
});

export default router;
