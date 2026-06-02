/**
 * Lightweight body validation without pulling in a schema library.
 * Each rule: { field, required, type, enum, maxLength }
 */
const ApiError = require('../utils/ApiError');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateBody(rules) {
  return (req, _res, next) => {
    const errors = [];
    const body = req.body || {};

    for (const rule of rules) {
      const value = body[rule.field];
      const present = value !== undefined && value !== null && value !== '';

      if (rule.required && !present) {
        errors.push(`${rule.field} is required`);
        continue;
      }
      if (!present) continue;

      if (rule.type === 'email' && !EMAIL_RE.test(value)) {
        errors.push(`${rule.field} must be a valid email`);
      }
      if (rule.type === 'string' && typeof value !== 'string') {
        errors.push(`${rule.field} must be a string`);
      }
      if (rule.enum && !rule.enum.includes(value)) {
        errors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
      }
      if (rule.maxLength && String(value).length > rule.maxLength) {
        errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
      }
    }

    if (errors.length) return next(ApiError.badRequest('Validation failed', errors));
    next();
  };
}

module.exports = { validateBody };
