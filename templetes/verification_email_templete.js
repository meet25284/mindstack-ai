export const getVerificationEmailTemplate = (verificationLink, year = new Date().getFullYear()) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Verify Your Email</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f8; font-family: 'Segoe UI', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f8; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:10px; overflow:hidden; box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          
          <!-- Header / Logo -->
          <tr>
            <td align="center" style="background-color:#111827; padding:28px 20px;">
              <span style="font-size:22px; font-weight:700; color:#ffffff; letter-spacing:0.5px;">MindStack <span style="color:#4CAF50;">AI</span></span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px 40px;">
              <h1 style="margin:0 0 16px 0; font-size:20px; color:#111827;">Verify your email address</h1>
              <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#4b5563;">
                Hi there,
              </p>
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#4b5563;">
                Thanks for signing up with MindStack AI! Please confirm your email address by clicking the button below. This helps us keep your account secure.
              </p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td align="center" style="padding:0 40px 28px 40px;">
              <a href="${verificationLink}" target="_blank"
                 style="display:inline-block; padding:14px 32px; background-color:#4CAF50; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:6px;">
                Verify Email
              </a>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:0 40px 28px 40px;">
              <p style="margin:0 0 8px 0; font-size:13px; color:#6b7280;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin:0; font-size:13px; color:#4CAF50; word-break:break-all;">
                ${verificationLink}
              </p>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td style="padding:0 40px 32px 40px;">
              <p style="margin:0; font-size:13px; color:#9ca3af;">
                This link will expire in 24 hours. If you didn't create an account with MindStack AI, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb; padding:20px 40px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#9ca3af;">
                &copy; ${year} MindStack AI. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

export default getVerificationEmailTemplate;
