import { query } from '../db.js';
import { publishJobSignal } from '../services/redis.js';

export async function enqueueJob(type, payload = {}, { runAt = null, maxAttempts = 5 } = {}) {
  const { rows } = await query(
    `INSERT INTO job_queue (type, payload, run_at, max_attempts)
     VALUES ($1, $2, COALESCE($3, NOW()), $4)
     RETURNING id`,
    [type, JSON.stringify(payload), runAt, maxAttempts]
  );
  const jobId = rows[0].id;
  await publishJobSignal(jobId);
  return jobId;
}

export async function claimNextJob(workerId) {
  const { rows } = await query(
    `UPDATE job_queue
     SET status = 'processing',
         locked_by = $1,
         locked_at = NOW(),
         attempts = attempts + 1,
         updated_at = NOW()
     WHERE id = (
       SELECT id FROM job_queue
       WHERE status = 'pending'
         AND run_at <= NOW()
         AND attempts < max_attempts
       ORDER BY run_at ASC
       FOR UPDATE SKIP LOCKED
       LIMIT 1
     )
     RETURNING *`,
    [workerId]
  );
  return rows[0] || null;
}

export async function completeJob(jobId) {
  await query(
    `UPDATE job_queue SET status = 'completed', updated_at = NOW() WHERE id = $1`,
    [jobId]
  );
}

export async function failJob(jobId, errorMessage, { retryDelayMs = 60000 } = {}) {
  const { rows } = await query('SELECT attempts, max_attempts FROM job_queue WHERE id = $1', [jobId]);
  if (!rows[0]) return;

  if (rows[0].attempts >= rows[0].max_attempts) {
    await query(
      `UPDATE job_queue SET status = 'failed', last_error = $2, updated_at = NOW() WHERE id = $1`,
      [jobId, errorMessage]
    );
    return;
  }

  await query(
    `UPDATE job_queue
     SET status = 'pending',
         locked_by = NULL,
         locked_at = NULL,
         last_error = $2,
         run_at = NOW() + ($3 || ' milliseconds')::interval,
         updated_at = NOW()
     WHERE id = $1`,
    [jobId, errorMessage, retryDelayMs]
  );
}

export async function getQueueStats() {
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS count FROM job_queue GROUP BY status`
  );
  const stats = { pending: 0, processing: 0, completed: 0, failed: 0 };
  for (const row of rows) stats[row.status] = row.count;
  return stats;
}

export async function cleanupOldJobs(days = 14) {
  const { rowCount } = await query(
    `DELETE FROM job_queue
     WHERE status IN ('completed', 'failed')
       AND updated_at < NOW() - ($1 || ' days')::interval`,
    [days]
  );
  return rowCount;
}
