import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { getPool, query } from './db.js';
import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resumes.js';
import stripeRoutes, { handleStripeWebhook } from './routes/stripe.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// Optional Railway volume for future file uploads (exports, imports)
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

// Stripe webhook needs raw body — register BEFORE json parser
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json({ limit: '2mb' }));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use('/api/', apiLimiter);

app.get('/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({
      ok: true,
      service: 'proresume-api',
      database: 'connected',
      dataDir: process.env.DATA_DIR ? DATA_DIR : null
    });
  } catch {
    res.status(503).json({ ok: false, database: 'disconnected' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/stripe', stripeRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  if (!process.env.JWT_SECRET) {
    console.error('FATAL: JWT_SECRET environment variable is required');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('FATAL: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  // Run migrations on startup
  const pool = getPool();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const migrateSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(migrateSql);
  console.log('Database schema applied');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ProResume API listening on port ${PORT}`);
    console.log(`CORS origins: ${allowedOrigins.join(', ')}`);
  });
}

start().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});
