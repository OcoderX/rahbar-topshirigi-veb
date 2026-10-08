const express = require('express');
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();

// POST /auth/register — Public self-registration (always creates employee account)
router.post(
  '/register',
  registerLimiter,
  validateBody([
    { field: 'name', required: true, type: 'string', maxLength: 100 },
    { field: 'email', required: true, type: 'email' },
    { field: 'password', required: true, type: 'string', minLength: 6, maxLength: 128 },
  ]),
  asyncHandler(AuthController.register)
);

// POST /auth/login — Protected by brute-force rate limiter
router.post(
  '/login',
  loginLimiter,
  validateBody([
    { field: 'email', required: true, type: 'email' },
    { field: 'password', required: true, type: 'string' },
  ]),
  asyncHandler(AuthController.login)
);

// GET /auth/me  (returns current user from token)
router.get('/me', authenticate, asyncHandler(AuthController.me));

// POST /auth/logout  (clears auth cookie)
router.post('/logout', asyncHandler(AuthController.logout));

module.exports = router;
