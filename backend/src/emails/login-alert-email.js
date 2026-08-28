import {
  wrapDarkEmailHtml,
  escapeHtml,
  darkPrimaryButtonHtml,
  securityDetailsTableHtml
} from './email-branding.js';

function siteUrlFromEnv() {
  return (process.env.FRONTEND_URL || 'https://proresume.aeloriacareer.com').replace(/\/$/, '');
}

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@aeloriacareer.com';

export function buildLoginAlertEmailHtml({ name, email, context }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
  const siteUrl = siteUrlFromEnv();
  const accountUrl = `${siteUrl}/account.html`;
  const contactUrl = `${siteUrl}/contact.html?subject=support`;
  const maskedEmail = escapeHtml(email);

  const details = securityDetailsTableHtml([
    ['Account', maskedEmail],
    ['Device', escapeHtml(context.device.label)],
    ['Time', escapeHtml(context.time)],
    ['Location', escapeHtml(context.location)],
    ['IP address', escapeHtml(context.ip)]
  ]);

  const bodyHtml = `
              <p style="margin:0 0 8px;font-size:15px;color:#a1a1aa;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">${greeting}</p>
              <h1 style="margin:0 0 12px;font-size:24px;font-weight:700;color:#fafafa;line-height:1.3;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">New sign-in to your account</h1>
              <p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:#a1a1aa;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                Your ProResume AI account <strong style="color:#fafafa;font-weight:600;">${maskedEmail}</strong> was just signed in to.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#71717a;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                Here are the details of this sign-in:
              </p>
              ${details}
              <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#a1a1aa;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                <strong style="color:#fafafa;font-weight:600;">If this was you</strong>, you can safely ignore this email. No further action is needed.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#a1a1aa;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                <strong style="color:#fafafa;font-weight:600;">If you don't recognize this activity</strong>, secure your account right away and contact our support team.
              </p>
              ${darkPrimaryButtonHtml(contactUrl, 'Contact support')}
              <p style="margin:20px 0 0;font-size:13px;line-height:1.5;color:#52525b;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                You can review your plan and saved resumes anytime from your
                <a href="${accountUrl}" style="color:#34d399;text-decoration:underline;">account page</a>.
              </p>`;

  return wrapDarkEmailHtml({
    siteUrl,
    preheader: `New sign-in from ${context.device.label} · ${context.location}`,
    bodyHtml
  });
}

export function buildLoginAlertEmailText({ name, email, context }) {
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  const siteUrl = siteUrlFromEnv();

  return `${greeting}

New sign-in to your ProResume AI account

Your account (${email}) was just signed in to.

Account: ${email}
Device: ${context.device.label}
Time: ${context.time}
Location: ${context.location}
IP address: ${context.ip}

If this was you, you can ignore this email.

If you don't recognize this activity, contact us immediately at ${SUPPORT_EMAIL} or ${siteUrl}/contact.html

— ProResume AI Security · Aeloria Career Services`;
}
