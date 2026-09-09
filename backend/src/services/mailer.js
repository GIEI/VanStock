const nodemailer = require('nodemailer');
const db = require('../db');
const { decrypt } = require('./crypto');

/**
 * Builds a nodemailer transport from the company's stored SMTP settings.
 * Throws if no settings are configured — per product decision the invite
 * fails loudly rather than falling back to a global SMTP.
 */
async function getTransportForCompany(companyId) {
  const res = await db.query(
    `SELECT host, port, secure, username, password_enc, from_email, from_name
     FROM company_smtp_settings
     WHERE company_id = $1`,
    [companyId]
  );
  if (!res.rows.length) {
    const err = new Error('SMTP non configurato per questa company. Contatta l\'amministratore.');
    err.code = 'SMTP_NOT_CONFIGURED';
    throw err;
  }
  const s = res.rows[0];
  const password = decrypt(s.password_enc);
  const transport = nodemailer.createTransport({
    host:   s.host,
    port:   s.port,
    secure: s.secure,
    auth: { user: s.username, pass: password },
  });
  const from = s.from_name ? `"${s.from_name}" <${s.from_email}>` : s.from_email;
  return { transport, from };
}

async function sendCompanyEmail(companyId, { to, subject, html, text }) {
  const { transport, from } = await getTransportForCompany(companyId);
  return transport.sendMail({ from, to, subject, html, text });
}

async function verifyCompanySmtp(companyId) {
  const { transport } = await getTransportForCompany(companyId);
  return transport.verify();
}

module.exports = { sendCompanyEmail, verifyCompanySmtp };
