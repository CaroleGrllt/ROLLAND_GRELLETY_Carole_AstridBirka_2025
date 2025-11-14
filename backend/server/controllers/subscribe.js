const { sendMail } = require('../utils/mailer');
const { sanitizeText, validateEmail, escapeHtml } = require('../utils/security');

exports.handleSubscribe = async (req, res) => {
  try {
    const raw = req.body || {};
    const website = (raw.website || '').trim(); // honeypot

    if (website) return res.status(200).json({ ok: true });

    const firstName = sanitizeText(raw.first_name || raw.firstName || '');
    const email     = (validateEmail(raw.email || '') || '');
    const consent   = String(raw.consent) === 'true' || raw.consent === true || raw.consent === 'on';

    if (!firstName) return res.status(400).json({ ok: false, message: 'Le prénom est requis.' });
    if (!email)     return res.status(400).json({ ok: false, message: 'Adresse e-mail invalide.' });
    if (!consent)   return res.status(400).json({ ok: false, message: 'Le consentement est requis.' });

    const guideUrl = process.env.GUIDE_URL;
    const consentLabel = consent ? 'oui' : 'non';

    // 1) Mail à l'utilisateur avec le guide (pièce jointe + lien)
    if (guideUrl) {
      await sendMail({
        to: email,
        subject: 'Astrid Birka | Votre guide "5 étapes pour prendre LA décision"',
        text:
          `Bonjour ${firstName},\n\n` +
          `Merci pour votre confiance.\n\n` +
          `Vous trouverez votre guide en pièce jointe.\n` +
          `Vous pouvez télécharger votre guide ici :\n${guideUrl}\n\n` +
          `Bonne lecture,\nAstrid`,
        html: `
          <p>Bonjour ${escapeHtml(firstName)},</p>
          <p>Merci pour votre confiance.</p>
          <p>Vous trouverez votre guide en pièce jointe.</p>
          <p>Vous pouvez télécharger votre guide en cliquant sur ce lien :</p>
          <p><a href="${escapeHtml(guideUrl)}">${escapeHtml(guideUrl)}</a></p>
          <p>Bonne lecture,<br>Astrid</p>
        `,
        headers: { 'X-Subscribe': '1' },
        attachments: [
          {
            filename: 'ebook-5-etapes-pour-prendre-LA-decision.pdf',
            path: guideUrl,                  // Nodemailer va télécharger le PDF depuis cette URL
            contentType: 'application/pdf'
          }
        ]
      });
    }

    // 2) Notification interne pour toi (non bloquante)
    const internalTo = process.env.CONTACT_TO || 'contact@astridbirka.fr';
    const internalSubject = 'Nouveau téléchargement du guide – Astrid Birka';
    const internalText = [
      'Un nouvel utilisateur a téléchargé le guide.',
      '',
      `Prénom : ${firstName}`,
      `Adresse email : ${email}`,
      `Consentement à la politique de confidentialité : ${consentLabel}`,
    ].join('\n');

    const internalHtml = `
      <p>Un nouvel utilisateur a téléchargé le guide.</p>
      <ul>
        <li><strong>Prénom :</strong> ${escapeHtml(firstName)}</li>
        <li><strong>Adresse email :</strong> ${escapeHtml(email)}</li>
        <li><strong>Consentement à la politique de confidentialité :</strong> ${escapeHtml(consentLabel)}</li>
      </ul>
    `;

    // on ne bloque pas la réponse si ce mail échoue
    sendMail({
      to: internalTo,
      subject: internalSubject,
      text: internalText,
      html: internalHtml,
      headers: { 'X-Subscribe-Notification': '1' }
    }).catch(err => {
      console.error('Internal subscribe notification failed:', err);
    });

    return res.status(200).json({
      ok: true,
      message: 'Merci ! Le guide vous a été envoyé par e-mail.'
    });
  } catch (err) {
    console.error('handleSubscribe failed:', err);
    return res.status(500).json({ ok: false, message: 'Erreur serveur. Réessayez plus tard.' });
  }
};
