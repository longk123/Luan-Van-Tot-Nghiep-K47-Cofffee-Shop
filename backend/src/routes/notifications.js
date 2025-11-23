/**
 * Routes: Notifications
 */

import express from 'express';
import notificationController from '../controllers/notificationController.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

// Tất cả routes đều cần authentication
router.use(authRequired);

// GET /api/v1/notifications - Lấy danh sách notifications
router.get('/', notificationController.getNotifications);

// GET /api/v1/notifications/unread-count - Lấy số lượng chưa đọc
router.get('/unread-count', notificationController.getUnreadCount);

// POST /api/v1/notifications/:id/read - Đánh dấu đã đọc
router.post('/:id/read', notificationController.markAsRead);

// POST /api/v1/notifications/read-all - Đánh dấu tất cả đã đọc
router.post('/read-all', notificationController.markAllAsRead);

// DELETE /api/v1/notifications/:id - Xóa notification
router.delete('/:id', notificationController.deleteNotification);

export default router;

