let redisClient = null;
let pubClient = null;
let subClient = null;

const JOB_CHANNEL = 'proresume:jobs';
const RESUME_SYNC_CHANNEL = 'proresume:resume-sync';

export function isRedisConfigured() {
  return Boolean(process.env.REDIS_URL?.trim());
}

async function getClient() {
  if (!isRedisConfigured()) return null;
  if (redisClient) return redisClient;

  const { default: Redis } = await import('ioredis');
  redisClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
  redisClient.on('error', (err) => console.warn('Redis error:', err.message));
  return redisClient;
}

export async function pingRedis() {
  try {
    const redis = await getClient();
    if (!redis) return { configured: false, ok: false };
    const pong = await redis.ping();
    return { configured: true, ok: pong === 'PONG' };
  } catch (err) {
    return { configured: true, ok: false, error: err.message };
  }
}

/** Wait until Redis answers PING (used on service startup). */
export async function ensureRedisReady({ retries = 8, delayMs = 1500 } = {}) {
  if (!isRedisConfigured()) {
    return { configured: false, ok: false };
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    const status = await pingRedis();
    if (status.ok) {
      console.log('Redis: connected');
      return status;
    }
    console.warn(`Redis: waiting to connect (${attempt}/${retries})…`);
    await new Promise((r) => setTimeout(r, delayMs));
  }
  const msg = 'Redis is configured but unreachable after retries';
  if (process.env.REQUIRE_REDIS === 'true') {
    throw new Error(msg);
  }
  console.error(`Redis: ${msg}`);
  return { configured: true, ok: false, error: msg };
}

export async function publishJobSignal(jobId) {
  try {
    const redis = await getClient();
    if (!redis) return;
    await redis.publish(JOB_CHANNEL, jobId);
  } catch (err) {
    console.warn('Redis publish failed:', err.message);
  }
}

export async function subscribeJobSignals(onSignal) {
  if (!isRedisConfigured()) return null;

  const { default: Redis } = await import('ioredis');
  pubClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
  pubClient.on('error', (err) => console.warn('Redis sub error:', err.message));
  await pubClient.subscribe(JOB_CHANNEL);
  pubClient.on('message', (_channel, jobId) => onSignal(jobId));
  console.log('Redis job subscriber active');
  return pubClient;
}

export async function publishResumeSync(event) {
  try {
    const redis = await getClient();
    if (!redis) return;
    await redis.publish(RESUME_SYNC_CHANNEL, JSON.stringify(event));
  } catch (err) {
    console.warn('Redis resume sync publish failed:', err.message);
  }
}

export async function subscribeResumeSync(onEvent) {
  if (!isRedisConfigured()) {
    console.log('Redis not configured — resume sync is local to this API instance only');
    return null;
  }

  const { default: Redis } = await import('ioredis');
  subClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
  subClient.on('error', (err) => console.warn('Redis resume sync sub error:', err.message));
  await subClient.subscribe(RESUME_SYNC_CHANNEL);
  subClient.on('message', (_channel, raw) => {
    try {
      onEvent(JSON.parse(raw));
    } catch (err) {
      console.warn('Redis resume sync message parse failed:', err.message);
    }
  });
  console.log('Redis resume sync subscriber active');
  return subClient;
}
