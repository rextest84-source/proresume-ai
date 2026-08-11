/**
 * ProResume AI — API configuration
 * Set apiUrl to your Railway deployment URL before go-live.
 */
window.PRORESUME_CONFIG = window.PRORESUME_CONFIG || {
  apiUrl: (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    // Replace with your Railway public URL after deploy:
    return 'https://proresume-ai-production.up.railway.app';
  })()
};
