// backend/src/middleware/rateLimit.js
// Giới hạn tần suất cho /auth

import rateLimit from 'express-rate-limit';

// Rate limit cho authentication routes
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5, // Tối đa 5 requests per windowMs
  message: {
    error: 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Chỉ đếm failed requests
});

// Rate limit cho general API
const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 100, // Tối đa 100 requests per windowMs
  message: {
    error: 'Quá nhiều requests. Vui lòng thử lại sau 15 phút.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export {
  authRateLimit,
  generalRateLimit
};
