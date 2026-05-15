import nodemailer from 'nodemailer';

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  if (!smtpConfigured()) {
    return { delivered: false, demoResetUrl: resetUrl };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_PORT) === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Team Task Manager <no-reply@teamtaskmanager.app>',
    to,
    subject: 'Reset your Team Task Manager password',
    text: `Hi ${name},\n\nUse this link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2>Reset your password</h2>
        <p>Hi ${name},</p>
        <p>Click the button below to reset your Team Task Manager password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;">Reset password</a></p>
        <p>If the button does not work, paste this URL into your browser:</p>
        <p>${resetUrl}</p>
      </div>
    `
  });

  return { delivered: true };
}
