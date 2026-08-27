import {
  buildVerificationEmailHtml,
  buildVerificationEmailText
} from '../emails/verification-email.js';

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@aeloriacareer.com';
const FROM_EMAIL = process.env.FROM_EMAIL || `ProResume AI <${SUPPORT_EMAIL}>`;
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
  const subjectLabels = {
    support: 'Customer Support',
    billing: 'Billing & Subscriptions',
    refund: 'Refund Request',
    sales: 'Sales & Enterprise',
    other: 'General Inquiry'
  };
  const subjectLabel = subjectLabels[message.subject] || message.subject;
  const text = [
    `New contact form submission`,
    '',
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    `Subject: ${subjectLabel}`,
    '',
    message.message,
    '',
    `Message ID: ${message.id}`
  ].join('\n');

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[ProResume AI] ${subjectLabel} from ${message.name}`,
    text
  });

  await sendEmail({
    to: message.email,
    subject: 'We received your message - ProResume AI',
    text: `Hi ${message.name},\n\nThanks for contacting ProResume AI. We received your message and will respond within 1 business day.\n\nReply to this email or write to ${SUPPORT_EMAIL} if you need to follow up.\n\n— Aeloria Career Services`
  });
}
