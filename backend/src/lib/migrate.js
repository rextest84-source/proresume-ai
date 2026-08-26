import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import { getPool } from '../db.js';
import { initStripeCatalog } from '../services/stripe-catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations(retries = 8) {
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  const migrateSql = fs.readFileSync(schemaPath, 'utf8');
  const pool = getPool();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query(migrateSql);
      console.log('Database schema applied');
      return true;
    } catch (err) {
      console.error(`Migration attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) throw err;
      await new Promise(r => setTimeout(r, attempt * 2000));
    }
  }
  return false;
}

export async function bootstrapStripe() {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return;
  try {
    const stripe = new Stripe(key, { apiVersion: '2024-12-18.acacia' });
    await initStripeCatalog(stripe);
  } catch (err) {
    console.error('Stripe bootstrap failed:', err.message);
  }
}
