/** Shared env defaults for all Railway services (api, worker, cron). */
export function applyEnvDefaults() {
  if (!process.env.CORS_ORIGINS?.trim() && process.env.FRONTEND_URL?.trim()) {
    process.env.CORS_ORIGINS = [
      process.env.FRONTEND_URL.trim(),
      'https://aeloriacareer.com',
      'https://ai-proresume.netlify.app'
    ].join(',');
  }
}

export function requireCoreEnv() {
  const missing = [];
  if (!process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (!process.env.DATABASE_URL) missing.push('DATABASE_URL');
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export function getServicePort(defaultPort = 3001) {
  return parseInt(process.env.PORT || String(defaultPort), 10);
}
