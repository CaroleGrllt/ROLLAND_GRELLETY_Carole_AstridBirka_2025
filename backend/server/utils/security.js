// utils/security.js
// Utilitaires de sécurité utilisés par les formulaires (contact + subscribe)

/* --------------------------
 * 1) Sanitizers génériques
 * ------------------------ */

const CONTROL_CHARS_RE = /[\x00-\x1F\x7F]/g;

/**
 * Nettoie une chaîne texte courte :
 * - normalise (NFC si dispo)
 * - supprime balises HTML
 * - neutralise < >
 * - supprime caractères de contrôle
 * - compacte les espaces
 */
function sanitizeText(input) {
  if (typeof input !== 'string') return '';
  let s = input;

  if (typeof s.normalize === 'function') {
    try { s = s.normalize('NFC'); } catch { /* noop */ }
  }

  s = s
    .replace(/<[^>]*>/g, '')  // supprime balises
    .replace(/[<>]/g, '')     // neutralise chevrons restants
    .replace(CONTROL_CHARS_RE, '')
    .replace(/\s+/g, ' ')     // compacte
    .trim();

  return s;
}

/**
 * Nettoyage “soft” pour les messages longs :
 * - garde les chevrons (pratique si la personne tape <3 ou autre)
 * - supprime caractères de contrôle
 * - compacte les espaces
 */
function sanitizeSoft(input) {
  if (typeof input !== 'string') return '';
  let s = input;

  if (typeof s.normalize === 'function') {
    try { s = s.normalize('NFC'); } catch { /* noop */ }
  }

  s = s
    .replace(CONTROL_CHARS_RE, '')
    .replace(/\s+/g, ' ')
    .trim();

  return s;
}

/**
 * Escape HTML pour affichage dans les emails HTML
 */
function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* --------------------------
 * 2) Validation d’e-mail
 * ------------------------ */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

function normalizeEmail(input) {
  const s = sanitizeText(input);
  return s ? s.toLowerCase() : '';
}

/**
 * Retourne l’email normalisé si valide, sinon ''.
 */
function validateEmail(input) {
  const v = normalizeEmail(input);
  return EMAIL_RE.test(v) ? v : '';
}

module.exports = {
  sanitizeText,
  sanitizeSoft,
  escapeHtml,
  validateEmail,
  normalizeEmail,
  EMAIL_RE,
};
