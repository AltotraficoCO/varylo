import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  lang: string = 'es'
) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';
  const resetUrl = `${baseUrl}/${lang}/reset-password?token=${token}`;

  const isEs = lang === 'es';

  const subject = isEs
    ? 'Restablecer tu contraseña — Varylo'
    : 'Reset your password — Varylo';

  const heading = isEs ? 'Restablecer contraseña' : 'Reset your password';
  const bodyText = isEs
    ? 'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón de abajo para crear una nueva contraseña.'
    : 'We received a request to reset your account password. Click the button below to create a new password.';
  const buttonText = isEs ? 'Restablecer contraseña' : 'Reset password';
  const expiryText = isEs
    ? 'Este enlace expira en 1 hora. Si no solicitaste este cambio, ignora este email.'
    : 'This link expires in 1 hour. If you didn\'t request this, ignore this email.';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="background-color:#10b981;padding:24px;text-align:center">
          <span style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">Varylo</span>
        </td></tr>
        <tr><td style="padding:32px 32px 24px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#18181b">${heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52525b">${bodyText}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px">
              <a href="${resetUrl}" style="display:inline-block;padding:12px 32px;background-color:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">${buttonText}</a>
            </td></tr>
          </table>
          <p style="margin:0;font-size:13px;line-height:1.5;color:#a1a1aa">${expiryText}</p>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f4f4f5;text-align:center">
          <p style="margin:0;font-size:12px;color:#a1a1aa">&copy; ${new Date().getFullYear()} Varylo</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendMail(email, subject, html);
}

export async function sendWelcomeEmail(
  email: string,
  name: string,
  companyName: string,
  lang: string = 'es'
) {
  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000';
  const loginUrl = `${baseUrl}/${lang}/login`;

  const isEs = lang === 'es';

  const subject = isEs
    ? 'Bienvenido a Varylo'
    : 'Welcome to Varylo';

  const heading = isEs ? `Hola, ${name}` : `Hi, ${name}`;
  const bodyText = isEs
    ? 'Tu cuenta ha sido creada exitosamente. Ya puedes iniciar sesión y comenzar a gestionar tus conversaciones con IA.'
    : 'Your account has been created successfully. You can now log in and start managing your conversations with AI.';
  const buttonText = isEs ? 'Iniciar sesión' : 'Log in';

  const detailsTitle = isEs ? 'Datos de tu cuenta' : 'Your account details';
  const nameLabel = isEs ? 'Nombre' : 'Name';
  const emailLabel = isEs ? 'Correo' : 'Email';
  const companyLabel = isEs ? 'Empresa' : 'Company';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <tr><td style="background-color:#10b981;padding:24px;text-align:center">
          <span style="font-size:28px;font-weight:700;color:#ffffff;letter-spacing:-0.5px">Varylo</span>
        </td></tr>
        <tr><td style="padding:32px 32px 24px">
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#18181b">${heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#52525b">${bodyText}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border-radius:8px;margin-bottom:24px">
            <tr><td style="padding:16px 20px">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#18181b">${detailsTitle}</p>
              <p style="margin:0 0 4px;font-size:14px;color:#52525b"><strong>${nameLabel}:</strong> ${name}</p>
              <p style="margin:0 0 4px;font-size:14px;color:#52525b"><strong>${emailLabel}:</strong> ${email}</p>
              <p style="margin:0;font-size:14px;color:#52525b"><strong>${companyLabel}:</strong> ${companyName}</p>
            </td></tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding:8px 0 24px">
              <a href="${loginUrl}" style="display:inline-block;padding:12px 32px;background-color:#10b981;color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600">${buttonText}</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;border-top:1px solid #f4f4f5;text-align:center">
          <p style="margin:0;font-size:12px;color:#a1a1aa">&copy; ${new Date().getFullYear()} Varylo</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await sendMail(email, subject, html);
}

async function sendMail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    throw new Error('SMTP not configured: missing SMTP_HOST, SMTP_USER, or SMTP_PASSWORD');
  }

  await transporter.sendMail({
    from: `Varylo <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}
