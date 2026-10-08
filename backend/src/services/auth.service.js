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
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    position: user.position,
    hierarchy_rank: user.hierarchy_rank,
    territory_type: user.territory_type,
    region: user.region,
    district: user.district,
    avatar: user.avatar,
  };
}

const AuthService = {
  async register({ name, email, password, role, position, hierarchyRank, territoryType, region, district, avatar }) {
    const finalRole = role || 'employee';
    if (!VALID_ROLES.includes(finalRole)) {
      throw ApiError.badRequest(`Rol quyidagilardan biri bo'lishi kerak: ${VALID_ROLES.join(', ')}`);
    }

    const existing = await UserModel.findByEmail(email);
    if (existing) throw ApiError.conflict('Ushbu email allaqachon ro‘yxatdan o‘tgan');

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw ApiError.badRequest('Parol kamida 6 ta belgidan iborat bo‘lishi kerak');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await UserModel.create({
      name,
      email,
      passwordHash,
      role: finalRole,
      position,
      hierarchyRank,
      territoryType,
      region,
      district,
      avatar,
    });

    const token = signToken({
      id: user.id,
      role: user.role,
      name: user.name,
      position: user.position,
      avatar: user.avatar,
    });
    return { user: toPublic(user), token };
  },

  async login({ email, password }) {
    const user = await UserModel.findByEmail(email);
    // Same error whether the email or password is wrong (avoids user enumeration).
    if (!user) throw ApiError.unauthorized('Email yoki parol noto‘g‘ri');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw ApiError.unauthorized('Email yoki parol noto‘g‘ri');

    const token = signToken({
      id: user.id,
      role: user.role,
      name: user.name,
      position: user.position,
      avatar: user.avatar,
    });
    return { user: toPublic(user), token };
  },
};

module.exports = AuthService;
