const AuthService = require('../services/auth.service');
const UserModel = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const { COOKIE_OPTIONS } = require('../utils/jwt');

const AuthController = {
  async register(req, res) {
    const { name, email, password } = req.body;
    // Public self-registration ALWAYS creates an employee account to prevent privilege escalation.
    const result = await AuthService.register({ name, email, password, role: 'employee' });
    if (result.token) {
      res.cookie('token', result.token, COOKIE_OPTIONS);
    }
    res.status(201).json(result);
  },

  async login(req, res) {
    const { email, password } = req.body;
    const result = await AuthService.login({ email, password });
    if (result.token) {
      res.cookie('token', result.token, COOKIE_OPTIONS);
    }
    res.json(result);
  },

  async logout(_req, res) {
    res.clearCookie('token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
    res.json({ message: 'Tizimdan muvaffaqiyatli chiqildi' });
  },

  // Returns the currently authenticated user with latest DB fields (avatar, position, name, etc.).
  async me(req, res) {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      throw ApiError.unauthorized('Foydalanuvchi topilmadi');
    }
    res.json({
      user: {
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
      },
    });
  },
};

module.exports = AuthController;
