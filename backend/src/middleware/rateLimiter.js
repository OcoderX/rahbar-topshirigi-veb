/**
 * Rate limiting middleware to prevent brute-force attacks and abuse.
 */
const rateLimit = require('express-rate-limit');

/**
 * Login rate limiter: Max 10 attempts per 15 minutes per IP.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 10, // IP boshiga maksimal 10 ta so'rov
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        message: 'Juda ko‘p urinishlar aniqlandi. Xavfsizlik nuqtai nazaridan kirish vaqtincha cheklandi. Iltimos, 15 daqiqadan so‘ng qayta urinib ko‘ring',
      },
    });
  },
});

/**
 * Register rate limiter: Max 5 accounts per hour per IP.
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 soat
  max: 5, // IP boshiga maksimal 5 ta ro'yxatdan o'tish
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        message: 'Ro‘yxatdan o‘tish bo‘yicha so‘rovlar chegarasi oshdi. Iltimos, 1 soatdan so‘ng qayta urinib ko‘ring',
      },
    });
  },
});

module.exports = { loginLimiter, registerLimiter };
