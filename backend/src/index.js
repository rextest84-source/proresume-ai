import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import { applyEnvDefaults, requireCoreEnv, getServicePort } from './lib/env.js';
import { runMigrations, bootstrapStripe } from './lib/migrate.js';
import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resumes.js';
import stripeRoutes, { handleStripeWebhook } from './routes/stripe.js';
import aiRoutes from './routes/ai.js';
import contactRoutes, { deliverContactMessage } from './routes/contact.js';
import supportRoutes from './routes/support.js';
import { isGrokConfigured, getGrokModel } from './services/grok.js';
import { isRedisConfigured } from './services/redis.js';
import { isEmailConfigured } from './services/email.js';
import { getQueueStats } from './queue/index.js';
import { query } from './db.js';

applyEnvDefaults();

const app = express();
// Railway reverse proxy sets X-Forwarded-For (required for express-rate-limit)
app.set('trust proxy', 1);
const PORT = getServicePort(3001);

let dbReady = false;
let dbError = null;

if (process.env.DATA_DIR) {
  fs.mkdirSync(process.env.DATA_DIR, { recursive: true });
  console.log(`Data volume mounted at ${process.env.DATA_DIR}`);
}

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)*netlify\.app$/i.test(origin)) return true;
  if (/^https:\/\/([a-z0-9-]+\.)*aeloriacareer\.com$/i.test(origin)) return true;
  if (origin === 'http://localhost:8080' || origin === 'http://127.0.0.1:8080') return true;
  return false;
}

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(cors({
  origin(origin, cb) {
    cb(null, isAllowedOrigin(origin));
  },
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use('/api/', apiLimiter);

app.get('/health', async (_req, res) => {
  let queue = null;
  if (dbReady) {
    try { queue = await getQueueStats(); } catch { /* ignore */ }
  }
  res.status(200).json({
    ok: true,
    service: 'proresume-api',
    database: dbReady ? 'connected' : (dbError ? 'error' : 'connecting'),
    redis: isRedisConfigured(),
    queue
  });
});

app.get('/health/ready', async (_req, res) => {
  if (!dbReady) {
    return res.status(503).json({ ok: false, database: dbError || 'connecting' });
  }
  try {
    await query('SELECT 1');
    res.json({ ok: true, database: 'connected' });
  } catch (err) {
    res.status(503).json({ ok: false, database: 'disconnected', error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/support', supportRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function drainQueuedContactMessages() {
  if (!isEmailConfigured()) return;
  try {
    const { rows } = await query(
      `SELECT id, name, email, subject, message
       FROM contact_messages
       WHERE status IS DISTINCT FROM 'sent'
       ORDER BY created_at ASC
       LIMIT 25`
    );
    for (const message of rows) {
      try {
        await deliverContactMessage(message);
        console.log(`Delivered queued contact message ${message.id}`);
      } catch (err) {
        console.error(`Queued contact ${message.id} failed:`, err.message);
      }
    }
  } catch (err) {
    console.error('Contact message drain failed:', err.message);
  }
}

async function start() {
  requireCoreEnv();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ProResume API listening on port ${PORT}`);
    console.log(`CORS: configured origins + *.netlify.app + *.aeloriacareer.com`);
    if (isGrokConfigured()) {
      console.log(`Grok AI: enabled (${getGrokModel()})`);
    } else {
      console.log('Grok AI: not configured (set XAI_API_KEY for live suggestions)');
    }
    if (isRedisConfigured()) {
      console.log('Redis: configured for job queue signals');
    }
    if (isEmailConfigured()) {
      console.log('Email: Resend configured for transactional mail');
    } else {
      console.log('Email: not configured (set RESEND_API_KEY on API service)');
    }
  });

  try {
    await runMigrations();
    dbReady = true;
    dbError = null;
    await bootstrapStripe();
    await drainQueuedContactMessages();
  } catch (err) {
    dbError = err.message;
    console.error('Database setup failed:', err.message);
  }
}

start().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});
