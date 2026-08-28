import {
  buildVerificationEmailHtml,
  buildVerificationEmailText
} from '../emails/verification-email.js';
import {
  buildContactReceiptHtml,
  buildContactReceiptText,
  buildContactStaffHtml,
  buildContactStaffText,
  contactStaffSubject
} from '../emails/contact-emails.js';
import {
  buildLoginAlertEmailHtml,
  buildLoginAlertEmailText
} from '../emails/login-alert-email.js';
import { getEmailLogoAttachment } from '../emails/email-branding.js';
import { buildLoginContext } from '../lib/login-context.js';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@aeloriacareer.com';
const FROM_EMAIL = process.env.FROM_EMAIL || 'ProResume AI <noreply@aeloriacareer.com>';
const REPLY_TO = process.env.REPLY_TO_EMAIL || SUPPORT_EMAIL;

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() || process.env.SMTP_URL?.trim());
}

export async function sendEmail({ to, subject, text, html, replyTo = REPLY_TO }) {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const payload = {
      from: FROM_EMAIL,
      to: [to],
      subject,
      text,
      html: html || text.replace(/\n/g, '<br>')
    };
    if (replyTo) payload.reply_to = replyTo;
    if (html) {
      payload.attachments = [getEmailLogoAttachment()];
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || data.error || `Resend error ${res.status}`);
    }
    return { provider: 'resend', id: data.id };
  }

  console.log(`[email stub] To: ${to} | Subject: ${subject}\n${text}`);
  return { provider: 'log', id: null };
}

function frontendUrl() {
  return (process.env.FRONTEND_URL || 'https://proresume.aeloriacareer.com').replace(/\/$/, '');
}

export async function sendVerificationEmail({ email, name, token }) {
  const verifyUrl = `${frontendUrl()}/verify-email.html?token=${encodeURIComponent(token)}`;
  const subject = 'Verify your ProResume AI account';

  return sendEmail({
    to: email,
    subject,
    text: buildVerificationEmailText({ name, verifyUrl }),
    html: buildVerificationEmailHtml({ name, verifyUrl })
  });
}

export async function sendContactNotification(message) {
  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: contactStaffSubject(message),
    text: buildContactStaffText(message),
    html: buildContactStaffHtml(message),
    replyTo: message.email
  });

  await sendEmail({
    to: message.email,
    subject: 'We received your message - ProResume AI',
    text: buildContactReceiptText({ name: message.name }),
    html: buildContactReceiptHtml({ name: message.name })
  });
}

/** Security alert after successful sign-in (non-blocking for auth handlers). */
export async function sendLoginAlertEmail({ email, name, req }) {
  const context = await buildLoginContext(req);
  const subject = 'New sign-in to your ProResume AI account';

  return sendEmail({
    to: email,
    subject,
    text: buildLoginAlertEmailText({ name, email, context }),
    html: buildLoginAlertEmailHtml({ name, email, context })
  });
}

export function queueLoginAlertEmail({ email, name, req }) {
  if (!isEmailConfigured()) return;
  sendLoginAlertEmail({ email, name, req }).catch((err) => {
    console.error('login alert email:', err.message);
  });
}
