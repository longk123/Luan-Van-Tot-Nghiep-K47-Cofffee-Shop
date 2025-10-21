// backend/src/routes/auth.js
import { Router } from 'express';
import authController from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';
import { validateLogin, validateRegister } from '../validators/auth.js';
import { authRateLimit } from '../middleware/rateLimit.js';

const router = Router();

// Tắt rate limit cho auth routes để dễ test
// router.use(authRateLimit);

// Đăng ký
router.post('/register', validateRegister, authController.register);

// Đăng nhập
router.post('/login', validateLogin, authController.login);

// Lấy thông tin bản thân
router.get('/me', authRequired, authController.getMe);

// Verify token (cho testing)
router.get('/verify', authController.verifyToken);

export default router;