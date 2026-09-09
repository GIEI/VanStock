const nodemailer = require('nodemailer');

/**
 * Creates a nodemailer transporter based on environment variables.
 * Returns null if SMTP_HOST is not configured.
 */
function createTransporter() {
  if (!process.env.SMTP_HOST) return null;
  
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Shared utility to send email.
 * Logs to console if transporter is not available.
 */
async function sendEmail({ to, subject, text, html }) {
  const transporter = createTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@stocksimple.app';

  if (!transporter) {
    console.warn('[MAILER] SMTP not configured. Printing email content to console:');
    console.log('--- EMAIL START ---');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${text}`);
    if (html) console.log(`HTML: ${html}`);
    console.log('--- EMAIL END ---');
    return { sent: false, method: 'console' };
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
  
  return { sent: true, method: 'smtp' };
}

module.exports = {
  createTransporter,
  sendEmail,
};
