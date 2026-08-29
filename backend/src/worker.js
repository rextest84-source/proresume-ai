import 'dotenv/config';
import { randomUUID } from 'crypto';
import { applyEnvDefaults, requireCoreEnv, getServicePort } from './lib/env.js';
import { runMigrations } from './lib/migrate.js';
import { startHealthServer } from './lib/health-server.js';
import { claimNextJob, completeJob, failJob, getQueueStats } from './queue/index.js';
import { runJob } from './queue/handlers.js';
import { isRedisConfigured, pingRedis, subscribeJobSignals } from './services/redis.js';
import { query } from './db.js';

applyEnvDefaults();

const WORKER_ID = process.env.RAILWAY_REPLICA_ID || process.env.HOSTNAME || randomUUID();
const POLL_MS = parseInt(process.env.WORKER_POLL_MS || '3000', 10);
let running = true;
let activeJob = null;

async function processOneJob() {
  const job = await claimNextJob(WORKER_ID);
  if (!job) return false;

  activeJob = job.id;
  try {
    await runJob(job);
    await completeJob(job.id);
  } catch (err) {
    console.error(`Job ${job.id} (${job.type}) failed:`, err.message);
    await failJob(job.id, err.message);
  } finally {
    activeJob = null;
  }
  return true;
}

async function drainPendingJobs(maxJobs = 50) {
  let processed = 0;
  while (processed < maxJobs) {
    const didProcess = await processOneJob();
    if (!didProcess) break;
    processed += 1;
  }
  if (processed) {
    console.log(`Worker drained ${processed} queued job(s) on startup`);
  }
}

async function workerLoop() {
  while (running) {
    const processed = await processOneJob();
    if (!processed) {
      await new Promise(r => setTimeout(r, POLL_MS));
    }
  }
}

async function getStatus() {
  const stats = await getQueueStats();
  let redis = { configured: isRedisConfigured(), ok: false };
  if (isRedisConfigured()) {
    redis = await pingRedis();
  }
  return {
    ready: true,
    workerId: WORKER_ID,
    activeJob,
    queue: stats,
    redis
  };
}

async function start() {
  requireCoreEnv();
  await runMigrations();
  await query('SELECT 1');

  startHealthServer({
    service: 'proresume-worker',
    port: getServicePort(3002),
    getStatus
  });

  await subscribeJobSignals(async () => {
    if (!activeJob) await processOneJob();
  });

  console.log(`ProResume worker started (${WORKER_ID})`);
  if (isRedisConfigured()) {
    console.log('Redis: job signals enabled');
  } else {
    console.log('Redis: not configured — polling queue every', POLL_MS, 'ms');
  }

  await drainPendingJobs();
  await workerLoop();
}

process.on('SIGTERM', () => { running = false; });
process.on('SIGINT', () => { running = false; });

start().catch(err => {
  console.error('Worker startup failed:', err);
  process.exit(1);
});
