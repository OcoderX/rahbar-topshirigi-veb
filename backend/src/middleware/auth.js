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
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.id, role: payload.role, name: payload.name };
    next();
  } catch (_err) {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/** Restrict a route to one or more roles. Use after authenticate. */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to perform this action'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
