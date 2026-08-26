import { query } from '../db.js';

export async function getPlatformConfig(key) {
  const { rows } = await query('SELECT value FROM platform_config WHERE key = $1', [key]);
  return rows[0]?.value || null;
}

export async function setPlatformConfig(key, value) {
  await query(
    `INSERT INTO platform_config (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value]
  );
}
