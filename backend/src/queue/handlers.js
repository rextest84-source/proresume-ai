import { query } from '../db.js';
import { processStoredStripeEvent } from '../services/stripe-events.js';
import { sendContactNotification } from '../services/email.js';
import { cleanupOldJobs } from '../queue/index.js';

export async function runJob(job) {
  const payload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload;

  switch (job.type) {
    case 'stripe_event':
      await processStoredStripeEvent(payload.stripeEventId);
      break;

    case 'contact_message':
      await deliverContactMessage(payload.messageId);
      break;

    case 'maintenance.cleanup':
      await cleanupOldJobs(payload.days || 14);
      await query(
        `DELETE FROM stripe_events
         WHERE status = 'processed' AND processed_at < NOW() - INTERVAL '30 days'`
      );
      break;

    default:
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

async function deliverContactMessage(messageId) {
  const { rows } = await query('SELECT * FROM contact_messages WHERE id = $1', [messageId]);
  if (!rows[0]) throw new Error(`Contact message ${messageId} not found`);
  if (rows[0].status === 'sent') return;

  await sendContactNotification(rows[0]);
  await query(
    `UPDATE contact_messages SET status = 'sent', sent_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [messageId]
  );
}
