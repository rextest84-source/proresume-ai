let redisClient = null;
let pubClient = null;

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

export async function publishJobSignal(jobId) {
  try {
    const redis = await getClient();
    if (!redis) return;
    await redis.publish('proresume:jobs', jobId);
  } catch (err) {
    console.warn('Redis publish failed:', err.message);
  }
}

export async function subscribeJobSignals(onSignal) {
  if (!isRedisConfigured()) return null;

  const { default: Redis } = await import('ioredis');
  pubClient = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
  pubClient.on('error', (err) => console.warn('Redis sub error:', err.message));
  await pubClient.subscribe('proresume:jobs');
  pubClient.on('message', (_channel, jobId) => onSignal(jobId));
  console.log('Redis job subscriber active');
  return pubClient;
}
