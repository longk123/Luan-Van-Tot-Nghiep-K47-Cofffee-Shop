// backend/src/middleware/authorize.js
import { pool } from '../db.js';

/**
 * Middleware để kiểm tra quyền truy cập dựa trên role
 * @param {string[]} allowedRoles - Danh sách role được phép truy cập
 */
export function authorize(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.user_id) {
        return res.status(401).json({ 
          success: false, 
          error: 'Unauthorized - User not authenticated' 
        });
      }

      // Lấy roles của user từ database
      const { rows } = await pool.query(`
        SELECT r.role_name 
        FROM user_roles ur
        JOIN roles r ON r.role_id = ur.role_id
        WHERE ur.user_id = $1
      `, [req.user.user_id]);

      const userRoles = rows.map(row => row.role_name.toLowerCase());

      // Kiểm tra xem user có role nào được phép không
      const hasPermission = allowedRoles.some(allowedRole => 
        userRoles.includes(allowedRole.toLowerCase())
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          error: 'Forbidden - Insufficient permissions',
          required_roles: allowedRoles,
          user_roles: userRoles
        });
      }

      // Thêm user roles vào request để sử dụng ở các middleware khác
      req.user.roles = userRoles;
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error during authorization' 
      });
    }
  };
}

/**
 * Middleware đặc biệt cho cashier - chỉ cho phép xem dữ liệu ca hiện tại
 */
export const cashierOnly = authorize(['cashier', 'manager', 'admin']);

/**
 * Middleware cho staff (waiter + cashier) - tất cả chức năng ngoại trừ thanh toán
 * Waiter có thể: xem bàn, nhận order, check-in đặt bàn, cập nhật order
 */
export const staffOnly = authorize(['waiter', 'cashier', 'manager', 'admin']);

/**
 * Middleware cho manager/admin - toàn quyền
 */
export const managerOnly = authorize(['manager', 'admin']);

/**
 * Middleware cho admin - chỉ admin
 */
export const adminOnly = authorize(['admin']);
