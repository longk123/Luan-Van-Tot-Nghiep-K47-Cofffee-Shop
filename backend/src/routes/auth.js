// backend/src/routes/auth.js
import { Router } from 'express';
import authController from '../controllers/authController.js';
import { authRequired } from '../middleware/auth.js';
import { authorize } from '../middleware/authorize.js';
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

// Lấy danh sách users (chỉ manager/admin)
router.get('/users', authRequired, authorize(['manager', 'admin']), authController.listUsers);

// Lấy danh sách roles
router.get('/roles', authRequired, authorize(['manager', 'admin']), authController.getRoles);

// Kiểm tra username
router.get('/check-username/:username', authController.checkUsername);

// CRUD users
router.get('/users/:id', authRequired, authorize(['manager', 'admin']), authController.getUserById);
router.post('/users', authRequired, authorize(['manager', 'admin']), authController.createUser);
router.put('/users/:id', authRequired, authorize(['manager', 'admin']), authController.updateUser);
router.delete('/users/:id', authRequired, authorize(['manager', 'admin']), authController.deleteUser);

// Lịch sử ca và thống kê
router.get('/users/:id/shifts', authRequired, authorize(['manager', 'admin']), authController.getUserShifts);
router.get('/users/:id/stats', authRequired, authorize(['manager', 'admin']), authController.getUserStats);

export default router;