/**
 * Auth controller — thin HTTP layer over AuthService.
 */
const AuthService = require('../services/auth.service');

const AuthController = {
  async register(req, res) {
    const { name, email, password } = req.body;
    // Public self-registration ALWAYS creates an employee account to prevent privilege escalation.
    const result = await AuthService.register({ name, email, password, role: 'employee' });
    res.status(201).json(result);
  },

  async login(req, res) {
    const { email, password } = req.body;
    const result = await AuthService.login({ email, password });
    res.json(result);
  },

  // Returns the currently authenticated user (from the JWT).
  async me(req, res) {
    res.json({ user: req.user });
  },
};

module.exports = AuthController;
