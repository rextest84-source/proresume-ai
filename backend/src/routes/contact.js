import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { enqueueJob } from '../queue/index.js';

const router = Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many contact requests. Please try again later.' }
});

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

    const { rows } = await query(
      `INSERT INTO contact_messages (name, email, subject, message)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [name.trim(), email.trim().toLowerCase(), subject, message.trim()]
    );

    await enqueueJob('contact_message', { messageId: rows[0].id });

    res.status(201).json({ ok: true, id: rows[0].id });
  } catch (err) {
    console.error('contact:', err);
    res.status(500).json({ error: 'Could not send message. Email support@aeloriacareer.com directly.' });
  }
});

export default router;
