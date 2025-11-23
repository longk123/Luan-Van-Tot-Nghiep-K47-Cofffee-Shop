// backend/src/routes/admin.js
import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { adminOnly } from '../middleware/authorize.js';
import adminController from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authRequired);
router.use(adminOnly);

// System Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

// System Logs
router.get('/logs', adminController.getLogs);

// System Health
router.get('/health', adminController.getHealth);

export default router;

