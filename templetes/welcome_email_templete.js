export const getWelcomeEmailTemplate = (name = "there", year = new Date().getFullYear()) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Welcome to MindStack AI</title>
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
              <h1 style="margin:0 0 16px 0; font-size:20px; color:#111827;">Welcome to MindStack AI! 🎉</h1>
              <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#4b5563;">
                Hi ${name},
              </p>
              <p style="margin:0 0 16px 0; font-size:15px; line-height:1.6; color:#4b5563;">
                We're thrilled to have you on board! MindStack AI helps you organize, search, and interact with your knowledge like never before.
              </p>
              <p style="margin:0 0 24px 0; font-size:15px; line-height:1.6; color:#4b5563;">
                Explore your dashboard and get started with creating your first stack today.
              </p>
            </td>
          </tr>

          <!-- Button -->
          <tr>
            <td align="center" style="padding:0 40px 28px 40px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}" target="_blank"
                 style="display:inline-block; padding:14px 32px; background-color:#4CAF50; color:#ffffff; font-size:15px; font-weight:600; text-decoration:none; border-radius:6px;">
                Get Started
              </a>
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

export default getWelcomeEmailTemplate;
