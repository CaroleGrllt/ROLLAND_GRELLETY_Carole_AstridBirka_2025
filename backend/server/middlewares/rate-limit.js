const rateLimit = require('express-rate-limit');

module.exports = function buildLimiter(routeName = 'default', opts = {}) {
  const { max = 10, windowMs = 60 * 1000 } = opts;
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: `Trop de requêtes sur ${routeName}. Réessayez plus tard.` }
  });
};
