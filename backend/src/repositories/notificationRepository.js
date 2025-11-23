/**
 * Repository: Notifications
 */

import { pool } from '../db.js';

const query = (text, params) => pool.query(text, params);

export const notificationRepository = {
  /**
   * Tạo notification mới
   */
  async create({ userId, type, title, message, data = {} }) {
    const sql = `
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const { rows } = await query(sql, [userId, type, title, message, JSON.stringify(data)]);
    return rows[0];
  },

  /**
   * Tạo notification cho nhiều users (broadcast)
   */
  async createForUsers({ userIds, type, title, message, data = {} }) {
    if (!userIds || userIds.length === 0) return [];
    
    const values = userIds.map((userId, index) => {
      const base = index * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(', ');
    
    const params = [];
    userIds.forEach(userId => {
      params.push(userId, type, title, message, JSON.stringify(data));
    });
    
    const sql = `
      INSERT INTO notifications (user_id, type, title, message, data)
      VALUES ${values}
      RETURNING *
    `;
    const { rows } = await query(sql, params);
    return rows;
  },

  /**
   * Lấy notifications của user
   */
  async getByUserId(userId, { limit = 50, offset = 0, unreadOnly = false } = {}) {
    let sql = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    const params = [userId];
    
    if (unreadOnly) {
      sql += ' AND read = FALSE';
    }
    
    sql += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(limit, offset);
    
    const { rows } = await query(sql, params);
    return rows;
  },

  /**
   * Đếm số notifications chưa đọc
   */
  async countUnread(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1 AND read = FALSE
    `;
    const { rows } = await query(sql, [userId]);
    return parseInt(rows[0]?.count || 0);
  },

  /**
   * Đánh dấu đã đọc
   */
  async markAsRead(notificationId, userId) {
    const sql = `
      UPDATE notifications
      SET read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const { rows } = await query(sql, [notificationId, userId]);
    return rows[0];
  },

  /**
   * Đánh dấu tất cả đã đọc
   */
  async markAllAsRead(userId) {
    const sql = `
      UPDATE notifications
      SET read = TRUE
      WHERE user_id = $1 AND read = FALSE
      RETURNING COUNT(*)
    `;
    const { rows } = await query(sql, [userId]);
    return parseInt(rows[0]?.count || 0);
  },

  /**
   * Xóa notification
   */
  async delete(notificationId, userId) {
    const sql = `
      DELETE FROM notifications
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
    const { rows } = await query(sql, [notificationId, userId]);
    return rows[0];
  },

  /**
   * Tạo notification cho tất cả managers/admins về cảnh báo tồn kho
   */
  async createInventoryWarningNotifications(warnings) {
    // Lấy tất cả managers và admins
    const usersSql = `
      SELECT DISTINCT u.user_id
      FROM users u
      JOIN user_roles ur ON u.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.role_id
      WHERE r.role_name IN ('manager', 'admin')
        AND u.active = TRUE
    `;
    const { rows: users } = await query(usersSql);
    
    if (users.length === 0) return [];
    
    const userIds = users.map(u => u.user_id);
    const criticalCount = warnings.filter(w => w.status === 'HET_HANG').length;
    const warningCount = warnings.filter(w => w.status === 'SAP_HET').length;
    
    if (criticalCount === 0 && warningCount === 0) return [];
    
    let title, message;
    if (criticalCount > 0) {
      title = `⚠️ Cảnh báo: ${criticalCount} nguyên liệu hết hàng`;
      message = `Có ${criticalCount} nguyên liệu đã hết hàng và ${warningCount} nguyên liệu sắp hết. Vui lòng kiểm tra và nhập kho.`;
    } else {
      title = `⚠️ Cảnh báo: ${warningCount} nguyên liệu sắp hết`;
      message = `Có ${warningCount} nguyên liệu sắp hết. Vui lòng kiểm tra và nhập kho.`;
    }
    
    return await this.createForUsers({
      userIds,
      type: 'inventory_warning',
      title,
      message,
      data: {
        criticalCount,
        warningCount,
        warnings: warnings.slice(0, 10) // Chỉ lưu 10 warnings đầu tiên
      }
    });
  }
};

