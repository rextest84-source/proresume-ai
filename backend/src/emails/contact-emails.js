import { wrapEmailHtml, escapeHtml } from './email-branding.js';

const SUBJECT_LABELS = {
  support: 'Customer Support',
  billing: 'Billing & Subscriptions',
  refund: 'Refund Request',
  sales: 'Sales & Enterprise',
  other: 'General Inquiry'
};

function siteUrlFromEnv() {
  return (process.env.FRONTEND_URL || 'https://proresume.aeloriacareer.com').replace(/\/$/, '');
}

export function buildContactReceiptHtml({ name }) {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@aeloriacareer.com';
  const bodyHtml = `
              <p style="margin:0 0 8px;font-size:15px;color:#52525b;">Hi ${escapeHtml(name)},</p>
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#18181b;line-height:1.3;">We received your message</h1>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#52525b;">
                We'll reply within a business day.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#71717a;">
                Reply to this email or write to
                <a href="mailto:${supportEmail}" style="color:#059669;text-decoration:underline;">${escapeHtml(supportEmail)}</a>
                if you need to follow up.
              </p>`;

  return wrapEmailHtml({ siteUrl: siteUrlFromEnv(), bodyHtml });
}

export function buildContactReceiptText({ name }) {
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@aeloriacareer.com';
  return `Hi ${name},

Thanks for contacting ProResume AI. We received your message and will reply within a business day.

Reply to this email or write to ${supportEmail} if you need to follow up.

— Aeloria Career Services`;
}

export function buildContactStaffHtml(message) {
  const subjectLabel = SUBJECT_LABELS[message.subject] || message.subject;
  const bodyHtml = `
              <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#18181b;">New contact form submission</h1>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#3f3f46;">
                <tr><td style="padding:6px 0;color:#71717a;width:88px;">Name</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(message.name)}</td></tr>
                <tr><td style="padding:6px 0;color:#71717a;">Email</td><td style="padding:6px 0;"><a href="mailto:${escapeHtml(message.email)}" style="color:#059669;text-decoration:none;">${escapeHtml(message.email)}</a></td></tr>
                <tr><td style="padding:6px 0;color:#71717a;">Subject</td><td style="padding:6px 0;">${escapeHtml(subjectLabel)}</td></tr>
              </table>
              <p style="margin:20px 0 8px;font-size:13px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.04em;">Message</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#3f3f46;white-space:pre-wrap;">${escapeHtml(message.message)}</p>
              <p style="margin:0;font-size:12px;color:#a1a1aa;">Message ID: ${escapeHtml(message.id)}</p>`;

  return wrapEmailHtml({ siteUrl: siteUrlFromEnv(), bodyHtml });
}

export function buildContactStaffText(message) {
  const subjectLabel = SUBJECT_LABELS[message.subject] || message.subject;
  return [
    'New contact form submission',
    '',
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    `Subject: ${subjectLabel}`,
    '',
    message.message,
    '',
    `Message ID: ${message.id}`
  ].join('\n');
}

export function contactStaffSubject(message) {
  const subjectLabel = SUBJECT_LABELS[message.subject] || message.subject;
  return `[ProResume AI] ${subjectLabel} from ${message.name}`;
}
