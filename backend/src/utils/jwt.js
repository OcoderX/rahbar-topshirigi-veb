/**
 * JWT helpers. Centralizes token creation/verification so the secret
 * and expiry are read in exactly one place.
 */
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'super_secret_change_me_in_production';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { signToken, verifyToken };
