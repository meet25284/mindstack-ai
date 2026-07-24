export const getOTPEmailTemplate = (otp, year = new Date().getFullYear()) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Your OTP Verification Code</title>
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
              <h1 style="margin:0 0 16px 0; font-size:20px; color:#111827;">Your Verification Code</h1>
              <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#4b5563;">
                Hi there,
              </p>
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#4b5563;">
                Use the following One-Time Password (OTP) to complete your verification process:
              </p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding:0 40px 28px 40px;">
              <div style="display:inline-block; padding:16px 36px; background-color:#f3f4f6; border:2px dashed #4CAF50; border-radius:8px; font-size:28px; font-weight:700; color:#111827; letter-spacing:6px;">
                ${otp}
              </div>
            </td>
          </tr>

          <!-- Expiry note -->
          <tr>
            <td style="padding:0 40px 32px 40px;">
              <p style="margin:0; font-size:13px; color:#9ca3af;">
                This OTP is valid for a limited time. If you didn't request this code, please ignore this email.
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

export default getOTPEmailTemplate;
