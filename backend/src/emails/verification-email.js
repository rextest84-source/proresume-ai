/**
 * Dark-themed verification email HTML for Resend.
 */
export function buildVerificationEmailHtml({ name, verifyUrl }) {
  const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background-color:#09090b;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background-color:#18181b;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06);">
              <div style="display:inline-block;width:40px;height:40px;background:linear-gradient(135deg,#10b981,#059669);border-radius:10px;line-height:40px;font-size:18px;color:#fff;font-weight:700;">P</div>
              <p style="margin:16px 0 0;font-size:20px;font-weight:700;color:#fafafa;letter-spacing:-0.02em;">ProResume AI</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#a1a1aa;">${greeting}</p>
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#fafafa;line-height:1.3;">Verify your email address</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#a1a1aa;">
                Thanks for signing up. Confirm your email to activate your account and start building resumes with AI.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:12px;background-color:#10b981;">
                    <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">
                      Verify email address
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#71717a;">
                This link expires in 24 hours. If the button does not work, copy and paste this URL into your browser:
              </p>
              <p style="margin:0 0 28px;font-size:12px;line-height:1.5;word-break:break-all;">
                <a href="${verifyUrl}" style="color:#34d399;text-decoration:none;">${verifyUrl}</a>
              </p>
              <p style="margin:0 0 12px;font-size:13px;line-height:1.5;color:#52525b;">
                If you did not create an account, you can safely ignore this email.
              </p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#52525b;">
                Need help? Email <a href="mailto:support@aeloriacareer.com" style="color:#71717a;text-decoration:underline;">support@aeloriacareer.com</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:12px;color:#52525b;">
                Aeloria Career Services · ProResume AI<br>
                <a href="https://proresume.aeloriacareer.com" style="color:#71717a;text-decoration:none;">proresume.aeloriacareer.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
