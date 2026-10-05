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

module.exports = { authenticate, authorize };
