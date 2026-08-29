import 'dotenv/config';
import { applyEnvDefaults, requireCoreEnv, getServicePort } from './lib/env.js';
import { runMigrations } from './lib/migrate.js';
import { startHealthServer } from './lib/health-server.js';
import { enqueueJob, getQueueStats } from './queue/index.js';
import { isRedisConfigured, pingRedis, ensureRedisReady } from './services/redis.js';
import { query } from './db.js';

applyEnvDefaults();

const INTERVAL_MS = parseInt(process.env.CRON_INTERVAL_MS || String(15 * 60 * 1000), 10);
const schedules = [
  { type: 'maintenance.cleanup', payload: { days: 14 }, everyMs: 24 * 60 * 60 * 1000 }
];

let lastRun = {};

async function tick() {
  const now = Date.now();
  for (const schedule of schedules) {
    const prev = lastRun[schedule.type] || 0;
    if (now - prev < schedule.everyMs) continue;
    lastRun[schedule.type] = now;
    await enqueueJob(schedule.type, schedule.payload);
    console.log(`Cron enqueued ${schedule.type}`);
  }

  const { rows } = await query(
    `SELECT COUNT(*)::int AS pending FROM job_queue WHERE status = 'pending' AND run_at <= NOW()`
  );
  if (rows[0]?.pending > 50) {
    console.warn(`Queue backlog: ${rows[0].pending} pending jobs`);
  }
}

async function getStatus() {
  const stats = await getQueueStats();
  let redis = { configured: isRedisConfigured(), ok: false };
  if (isRedisConfigured()) {
    redis = await pingRedis();
  }
  return { ready: true, queue: stats, intervalMs: INTERVAL_MS, redis };
}

async function start() {
  requireCoreEnv();
  await runMigrations();
  await query('SELECT 1');
  await ensureRedisReady();

  startHealthServer({
    service: 'proresume-cron',
    port: getServicePort(3003),
    getStatus
  });

  console.log(`ProResume cron started (every ${INTERVAL_MS}ms)`);
  if (isRedisConfigured()) {
    const redis = await pingRedis();
    console.log(`Redis: ${redis.ok ? 'connected' : 'unreachable'}`);
  } else {
    console.log('Redis: not configured (jobs still enqueue to Postgres)');
  }
  await tick();
  setInterval(() => {
    tick().catch(err => console.error('Cron tick failed:', err.message));
  }, INTERVAL_MS);
}

start().catch(err => {
  console.error('Cron startup failed:', err);
  process.exit(1);
});
