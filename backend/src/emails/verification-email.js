import {
  wrapEmailHtml,
  escapeHtml,
  primaryButtonHtml
} from './email-branding.js';

function siteUrlFromEnv() {
  return (process.env.FRONTEND_URL || 'https://proresume.aeloriacareer.com').replace(/\/$/, '');
}

export function buildVerificationEmailHtml({ name, verifyUrl }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
  const bodyHtml = `
              <p style="margin:0 0 8px;font-size:15px;color:#52525b;">${greeting}</p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#18181b;line-height:1.3;">Verify your email address</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52525b;">
                Thanks for signing up. Confirm your email to activate your account and start building resumes with AI.
              </p>
              ${primaryButtonHtml(verifyUrl, 'Verify email address')}
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#71717a;">
                This link expires in 24 hours. If the button does not work, copy and paste this URL into your browser:
              </p>
              <p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${verifyUrl}" style="color:#059669;text-decoration:none;">${verifyUrl}</a>
              </p>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#71717a;">
                If you did not create an account, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#71717a;">
                Need help? Email <a href="mailto:support@aeloriacareer.com" style="color:#059669;text-decoration:underline;">support@aeloriacareer.com</a>
              </p>`;

  return wrapEmailHtml({ siteUrl: siteUrlFromEnv(), bodyHtml });
}

export function buildVerificationEmailText({ name, verifyUrl }) {
  const greeting = name ? `Hi ${name},` : 'Hi there,';
  return `${greeting}

Verify your ProResume AI account by opening this link (expires in 24 hours):

${verifyUrl}

If you did not create an account, ignore this email.

Questions? support@aeloriacareer.com

— ProResume AI / Aeloria Career Services`;
}
