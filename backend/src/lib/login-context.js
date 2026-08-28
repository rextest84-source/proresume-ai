/**
 * Parse device / network context for login security emails.
 */

const PRIVATE_IP =
  /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|fc00:|fd)/;

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'Unknown';
}

export function parseLoginDevice(userAgent = '') {
  const ua = String(userAgent || '');

  let browser = 'Unknown browser';
  if (/Edg\//i.test(ua)) browser = 'Microsoft Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';

  let os = 'Unknown OS';
  let deviceType = 'Desktop';

  if (/iPhone/i.test(ua)) {
    os = 'iOS';
    deviceType = 'iPhone';
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS';
    deviceType = 'iPad';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    deviceType = /Mobile/i.test(ua) ? 'Android phone' : 'Android tablet';
  } else if (/Mac OS X|Macintosh/i.test(ua)) {
    os = 'macOS';
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows';
  } else if (/CrOS/i.test(ua)) {
    os = 'ChromeOS';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
  }

  const label =
    deviceType === 'Desktop'
      ? `${browser} on ${os}`
      : `${browser} on ${deviceType}`;

  return { browser, os, deviceType, label };
}

export function formatLoginTimestamp(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  }).format(date);
}

export async function lookupApproxLocation(ip) {
  if (!ip || ip === 'Unknown' || PRIVATE_IP.test(ip)) {
    return 'Local network';
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,country`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return 'Unknown location';
    const data = await res.json();
    if (data.status !== 'success') return 'Unknown location';
    const parts = [data.city, data.regionName, data.country].filter(Boolean);
    return parts.length ? parts.join(', ') : 'Unknown location';
  } catch {
    return 'Unknown location';
  }
}

export async function buildLoginContext(req) {
  const ip = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';
  const device = parseLoginDevice(userAgent);
  const location = await lookupApproxLocation(ip);
  const time = formatLoginTimestamp(new Date());

  return {
    ip,
    userAgent,
    device,
    location,
    time
  };
}
