/**
 * Controller: Notifications
 */

import { notificationRepository } from '../repositories/notificationRepository.js';
import { asyncHandler } from '../middleware/error.js';

class NotificationController {
  /**
   * GET /api/v1/notifications
   * Lấy danh sách notifications của user hiện tại
   */
  getNotifications = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const { limit = 50, offset = 0, unreadOnly = false } = req.query;
    
    const notifications = await notificationRepository.getByUserId(userId, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      unreadOnly: unreadOnly === 'true'
    });
    
    const unreadCount = await notificationRepository.countUnread(userId);
    
    res.json({
      ok: true,
      count: notifications.length,
      unreadCount,
      data: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data,
        read: n.read,
        createdAt: n.created_at
      }))
    });
  });

  /**
   * POST /api/v1/notifications/:id/read
   * Đánh dấu notification đã đọc
   */
  markAsRead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    
    const notification = await notificationRepository.markAsRead(id, userId);
    
    if (!notification) {
      return res.status(404).json({
        ok: false,
        error: 'Notification not found'
      });
    }
    
    res.json({
      ok: true,
      data: {
        id: notification.id,
        read: notification.read
      }
    });
  });

  /**
   * POST /api/v1/notifications/read-all
   * Đánh dấu tất cả notifications đã đọc
   */
  markAllAsRead = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    
    const count = await notificationRepository.markAllAsRead(userId);
    
    res.json({
      ok: true,
      count
    });
  });

  /**
   * DELETE /api/v1/notifications/:id
   * Xóa notification
   */
  deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.user_id;
    
    const notification = await notificationRepository.delete(id, userId);
    
    if (!notification) {
      return res.status(404).json({
        ok: false,
        error: 'Notification not found'
      });
    }
    
    res.json({
      ok: true,
      message: 'Notification deleted'
    });
  });

  /**
   * GET /api/v1/notifications/unread-count
   * Lấy số lượng notifications chưa đọc
   */
  getUnreadCount = asyncHandler(async (req, res) => {
    const userId = req.user.user_id;
    const count = await notificationRepository.countUnread(userId);
    
    res.json({
      ok: true,
      count
    });
  });
}

export default new NotificationController();

