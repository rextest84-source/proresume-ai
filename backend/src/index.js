import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPool, query } from './db.js';
import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resumes.js';
import stripeRoutes, { handleStripeWebhook } from './routes/stripe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

let dbReady = false;
let dbError = null;

const DATA_DIR = process.env.DATA_DIR || '/data';
if (process.env.DATA_DIR) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`Data volume mounted at ${DATA_DIR}`);
}

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:8080')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '2mb' }));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use('/api/', apiLimiter);

/** Liveness — Railway healthcheck must get 2xx quickly */
app.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'proresume-api',
    database: dbReady ? 'connected' : (dbError ? 'error' : 'connecting')
  });
});

/** Readiness — full DB check (optional) */
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

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function runMigrations(retries = 8) {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const migrateSql = fs.readFileSync(schemaPath, 'utf8');
  const pool = getPool();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(migrateSql);
      dbReady = true;
      dbError = null;
      console.log('Database schema applied');
      return;
    } catch (err) {
      dbError = err.message;
      console.error(`Migration attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
}

async function start() {
  const missing = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');

  if (missing.length) {
    console.error('FATAL: Missing required environment variables:', missing.join(', '));
    console.error('Railway: add JWT_SECRET on this service, and link DATABASE_URL from Postgres (Variables → Add Reference).');
    process.exit(1);
  }

  // Start listening immediately so Railway healthcheck passes
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ProResume API listening on port ${PORT}`);
    console.log(`CORS origins: ${allowedOrigins.join(', ')}`);
  });

  runMigrations().catch(err => {
    console.error('Database setup failed (API stays up; fix DATABASE_URL and redeploy):', err.message);
  });
}

start().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});
