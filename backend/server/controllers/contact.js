// controllers/contact.js
const { sendMail } = require('../utils/mailer');
const { sanitizeText, sanitizeSoft, validateEmail, escapeHtml } = require('../utils/security');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.sendContact = async (req, res) => {
  try {
    const raw = req.body || {};
    const website = (raw.website || '').trim(); // honeypot anti-spam

    // Si le honeypot est rempli => on fait comme si tout s'était bien passé
    if (website) {
      return res.status(200).json({ ok: true, message: 'Message reçu.' });
    }

    // Mapping des champs du formulaire
    const firstName = sanitizeText(raw.firstName || '');
    const lastName  = sanitizeText(raw.name || raw.lastName || '');
    const email     = validateEmail(raw.email || '') || '';
    const phone     = sanitizeText(raw.phone || '');
    const subject   = sanitizeText(raw.subject || '');
    const message   = sanitizeSoft(raw.message || '');
    const consent   =
      String(raw.consent) === 'true' ||
      raw.consent === true ||
      raw.consent === 'on';

    // Validations
    if (!firstName) {
      return res.status(400).json({ ok: false, message: 'Le prénom est requis.' });
    }
    if (!lastName) {
      return res.status(400).json({ ok: false, message: 'Le nom est requis.' });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ ok: false, message: 'Adresse e-mail invalide.' });
    }
    if (!subject) {
      return res.status(400).json({ ok: false, message: 'Le sujet est requis.' });
    }
    if (!message) {
      return res.status(400).json({ ok: false, message: 'Le message est requis.' });
    }
    if (!consent) {
      return res.status(400).json({ ok: false, message: 'Le consentement est requis.' });
    }

    const TO = process.env.CONTACT_TO || 'contact@astridbirka.fr';

    // --------- Mail pour Astrid ---------
    const adminSubject = `Nouveau message — ${firstName} ${lastName} — ${subject}`;

    const adminTextLines = [
      'Nouveau message envoyé depuis le formulaire de contact :',
      '',
      `Prénom : ${firstName}`,
      `Nom : ${lastName}`,
      `Email : ${email}`,
      `Téléphone : ${phone || 'Non renseigné'}`,
      `Sujet : ${subject}`,
      `Consentement RGPD : ${consent ? 'Oui' : 'Non'}`,
      '',
      'Message :',
      message
    ];

    const adminText = adminTextLines.join('\n');

    const adminHtml = `
      <p><strong>Nouveau message envoyé depuis le formulaire de contact :</strong></p>
      <p><strong>Prénom :</strong> ${escapeHtml(firstName)}</p>
      <p><strong>Nom :</strong> ${escapeHtml(lastName)}</p>
      <p><strong>Email :</strong> ${escapeHtml(email)}</p>
      <p><strong>Téléphone :</strong> ${escapeHtml(phone || 'Non renseigné')}</p>
      <p><strong>Sujet :</strong> ${escapeHtml(subject)}</p>
      <p><strong>Consentement RGPD :</strong> ${consent ? 'Oui' : 'Non'}</p>
      <p><strong>Message :</strong></p>
      <p style="white-space:pre-wrap">${escapeHtml(message)}</p>
    `;

    await sendMail({
      to: TO,
      subject: adminSubject,
      text: adminText,
      html: adminHtml,
      replyTo: email,
      headers: { 'X-Contact-Form': 'public' }
    });

    // --------- Accusé de réception pour l'utilisatrice (non bloquant) ---------
    const userSubject = 'Nous avons bien reçu votre message';

    const userText =
      `Bonjour ${firstName},\n\n` +
      `Merci pour votre message, que j'ai bien reçu.\n` +
      `Je reviens vers vous dès que possible.\n\n` +
      `Rappel de votre message :\n` +
      `${message}\n\n` +
      `— Astrid Birka`;

    const userHtml = `
      <p>Bonjour ${escapeHtml(firstName)},</p>
      <p>Merci pour votre message, je l'ai bien reçu et je reviens vers vous dès que possible.</p>
      <p><strong>Rappel de votre message :</strong></p>
      <p style="white-space:pre-wrap; border-left:4px solid #eee; padding-left:8px;">
        ${escapeHtml(message)}
      </p>
      <p>— Astrid Birka</p>
    `;

    sendMail({
      to: email,
      subject: userSubject,
      text: userText,
      html: userHtml,
      headers: { 'X-Contact-Ack': '1' }
    }).catch(() => {
      // On ne bloque pas la réponse utilisateur si l'accusé échoue
    });

    return res.status(200).json({
      ok: true,
      message: 'Merci, votre message a bien été envoyé.'
    });
  } catch (err) {
    console.error('sendContact failed:', err);
    return res.status(500).json({
      ok: false,
      message: 'Erreur serveur. Réessayez plus tard.'
    });
  }
};
