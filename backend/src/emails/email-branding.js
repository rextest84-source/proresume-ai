import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_CID = 'proresume-logo';

/** Inline logo attachment for Resend (cid: — works in Gmail, Apple Mail, Outlook). */
export function getEmailLogoAttachment() {
  const logoPath = path.join(__dirname, 'logo-email.png');
  const content = fs.readFileSync(logoPath).toString('base64');
  return {
    filename: 'logo.png',
    content,
    content_id: LOGO_CID,
    content_type: 'image/png'
  };
}

export function emailLogoHtml() {
  return `<img src="cid:${LOGO_CID}" width="48" height="48" alt="ProResume AI" style="display:block;margin:0 auto;border:0;outline:none;text-decoration:none;" />`;
}

export function emailHeaderHtml() {
  return `
          <tr>
            <td style="padding:28px 32px 20px;text-align:center;border-bottom:1px solid #e4e4e7;background-color:#ffffff;">
              ${emailLogoHtml()}
              <p style="margin:14px 0 0;font-size:20px;font-weight:700;color:#18181b;letter-spacing:-0.02em;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">ProResume AI</p>
            </td>
          </tr>`;
}

export function emailFooterHtml(siteUrl = 'https://proresume.aeloriacareer.com') {
  const url = siteUrl.replace(/\/$/, '');
  return `
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e4e4e7;text-align:center;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                Aeloria Career Services · ProResume AI<br>
                <a href="${url}" style="color:#059669;text-decoration:none;">proresume.aeloriacareer.com</a>
              </p>
            </td>
          </tr>`;
}

/** Light, client-safe shell — renders correctly in Gmail mobile (dark-only templates often invert poorly). */
export function wrapEmailHtml({ siteUrl, bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>ProResume AI</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:16px;overflow:hidden;">
          ${emailHeaderHtml()}
          <tr>
            <td style="padding:32px;background-color:#ffffff;">
              ${bodyHtml}
            </td>
          </tr>
          ${emailFooterHtml(siteUrl)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function primaryButtonHtml(href, label) {
  return `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:12px;background-color:#059669;">
                    <a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
                      ${label}
                    </a>
                  </td>
                </tr>
              </table>`;
}
