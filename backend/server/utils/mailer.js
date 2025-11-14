const nodemailer = require('nodemailer');
require('dotenv').config(); // pas indispensable mais ne fait pas de mal


const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Test au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error('SMTP VERIFY ERROR (Astrid) ➜', error);
  } else {
    console.log('SMTP READY (Astrid) ➜', success);
  }
});

function sendMail({ to, subject, text, html, replyTo, headers, attachments }) {
  return transporter.sendMail({
    from: `"Astrid Birka" <${process.env.SMTP_FROM || 'contact@astridbirka.fr'}>`,
    to,
    subject,
    text,
    html,
    replyTo,
    headers, 
    attachments
  });
}

module.exports = { sendMail };

