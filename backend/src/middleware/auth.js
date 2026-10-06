/**
 * Authentication & authorization middleware.
 *
 *  - authenticate: verifies the Bearer JWT and attaches req.user
 *  - authorize(...roles): allows only the given roles (role-based access)
 */
const { verifyToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(ApiError.unauthorized('Avtorizatsiya sarlavhasi (header) topilmadi yoki noto‘g‘ri'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch (_err) {
    next(ApiError.unauthorized('Token yaroqsiz yoki muddati o‘tgan'));
  }
}

/**
 * Authenticate the native Excel download form. A regular form cannot attach an
 * Authorization header, so this endpoint receives the JWT in the POST body.
 * Keeping it out of the URL prevents it from leaking into browser history and
 * access logs.
 */
function authenticateDownload(req, _res, next) {
  const token = req.body && req.body.download_token;

  if (!token) {
    return next(ApiError.unauthorized('Yuklab olish tokeni topilmadi'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch (_err) {
    next(ApiError.unauthorized('Token yaroqsiz yoki muddati o‘tgan'));
  }
}

/** Restrict a route to one or more roles. Use after authenticate. */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('Ushbu amalni bajarish uchun sizda yetarli ruxsat yo‘q'));
    }
    next();
  };
}

module.exports = { authenticate, authenticateDownload, authorize };
