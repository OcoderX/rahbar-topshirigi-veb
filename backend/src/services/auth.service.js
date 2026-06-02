/**
 * Auth service — registration & login business logic.
 * Hashing (bcrypt) and token issuing happen here; controllers stay thin.
 */
const bcrypt = require('bcryptjs');
const UserModel = require('../models/user.model');
const { signToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

const SALT_ROUNDS = 10;
const VALID_ROLES = ['admin', 'employee'];

function toPublic(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

const AuthService = {
  async register({ name, email, password, role }) {
    const finalRole = role || 'employee';
    if (!VALID_ROLES.includes(finalRole)) {
      throw ApiError.badRequest(`role must be one of: ${VALID_ROLES.join(', ')}`);
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) throw ApiError.conflict('Email is already registered');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await UserModel.create({ name, email, passwordHash, role: finalRole });

    const token = signToken({ id: user.id, role: user.role, name: user.name });
    return { user: toPublic(user), token };
  },

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    // Same error whether the email or password is wrong (avoids user enumeration).
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw ApiError.unauthorized('Invalid email or password');

    const token = signToken({ id: user.id, role: user.role, name: user.name });
    return { user: toPublic(user), token };
  },
};

module.exports = AuthService;
