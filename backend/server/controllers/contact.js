const { sendMail } = require('../utils/mailer');
const { sanitizeText, sanitizeSoft, validateEmail, escapeHtml } = require('../utils/security');
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.sendContact = async (req, res) => {
  try {
    const raw = req.body || {};
    const website  = (raw.website || '').trim(); // honeypot

    if (website) return res.status(200).json({ ok: true, message: 'Message reçu.' });

    const firstName = sanitizeText(raw.firstName || '');
    const lastName  = sanitizeText(raw.lastName  || '');
    const email     = (validateEmail(raw.email || '') || '');
    const message   = sanitizeSoft(raw.message   || '');

    if (!firstName) return res.status(400).json({ ok: false, message: 'Le prénom est requis.' });
    if (!lastName)  return res.status(400).json({ ok: false, message: 'Le nom est requis.' });
    if (!email || !EMAIL_RE.test(email)) return res.status(400).json({ ok: false, message: 'Adresse e-mail invalide.' });
    if (!message)  return res.status(400).json({ ok: false, message: 'Le message est requis.' });

    const subject = `Nouveau message — ${firstName} ${lastName}`;
    const text = [
      `Prénom: ${firstName}`,
      `Nom: ${lastName}`,
      `Email: ${email}`,
      '',
      'Message:',
      message
    ].join('\n');

    const html = `
      <p><strong>Prénom :</strong> ${escapeHtml(firstName)}</p>
      <p><strong>Nom :</strong> ${escapeHtml(lastName)}</p>
      <p><strong>Email :</strong> ${escapeHtml(email)}</p>
      <p><strong>Message :</strong></p>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    `;

    const TO = process.env.CONTACT_TO || 'contact@astridbirka.fr';

    await sendMail({
      to: TO,
      subject,
      text,
      html,
      replyTo: email,
      headers: { 'X-Contact-Form': 'public' }
    });

    // Accusé de réception (non bloquant)
    sendMail({
      to: email,
      subject: 'Nous avons bien reçu votre message',
      text: `Bonjour ${firstName},\n\n` +
            `Merci pour votre message. Nous revenons vers vous rapidement.\n\n` +
            `Rappel de votre message :\n` +
            `${message}\n\n` +
            `— Astrid Birka`,
      html:  `
        <p>Bonjour ${escapeHtml(firstName)},</p>
        <p>Merci pour votre message. Nous revenons vers vous rapidement.</p>
        <p><strong>Rappel de votre message :</strong></p>
        <p style="white-space:pre-wrap; border-left:4px solid #eee; padding-left:8px;">
            ${escapeHtml(message)}
        </p>
        <p>— Astrid Birka</p>
        `,
      headers: { 'X-Contact-Ack': '1' }
    }).catch(() => {});

    return res.status(200).json({ ok: true, message: 'Message envoyé.' });
  } catch (err) {
    console.error('sendContact failed:', err);
    return res.status(500).json({ message: 'Erreur serveur. Réessayez plus tard.' });
  }
};