/**
 * ProResume AI — API configuration
 */
window.PRORESUME_CONFIG = window.PRORESUME_CONFIG || {
  apiUrl: (() => {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    return 'https://proresume-ai-production.up.railway.app';
  })()
};
