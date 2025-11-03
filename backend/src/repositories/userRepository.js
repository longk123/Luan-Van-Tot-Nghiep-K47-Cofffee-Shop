// backend/src/repositories/userRepository.js
// Gom truy vấn DB cho users

import { pool } from '../db.js';

class UserRepository {
  // Tìm user theo username
  async findByUsername(username) {
    const { rows } = await pool.query(
      `SELECT user_id, username, password_hash, full_name, email, is_active, created_at
       FROM users WHERE username = $1`,
      [username]
    );
    return rows[0] || null;
  }

  // Tìm user theo ID
  async findById(userId) {
    const { rows } = await pool.query(
      `SELECT user_id, username, full_name, email, is_active, created_at
       FROM users WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  }

  // Tạo user mới
  async create(userData) {
    const { username, passwordHash, fullName, email } = userData;
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, email)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, username, full_name, email, is_active, created_at`,
      [username, passwordHash, fullName, email]
    );
    return rows[0];
  }

  // Kiểm tra username đã tồn tại
  async existsByUsername(username) {
    const { rows } = await pool.query(
      'SELECT 1 FROM users WHERE username = $1',
      [username]
    );
    return rows.length > 0;
  }

  // Lấy roles của user
  async getUserRoles(userId) {
    const { rows } = await pool.query(
      `SELECT r.role_name
       FROM user_roles ur
       JOIN roles r ON r.role_id = ur.role_id
       WHERE ur.user_id = $1`,
      [userId]
    );
    return rows.map(r => r.role_name);
  }

  // Gán role cho user
  async assignRole(userId, roleId) {
    await pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, roleId]
    );
  }

  // Lấy tất cả roles
  async getAllRoles() {
    const { rows } = await pool.query('SELECT role_id, role_name FROM roles');
    return rows;
  }

  // Lấy role theo tên
  async getRoleByName(roleName) {
    const { rows } = await pool.query(
      'SELECT role_id, role_name FROM roles WHERE role_name = $1',
      [roleName]
    );
    return rows[0] || null;
  }

  // Lấy tất cả users (cho manager/admin)
  async getAll() {
    const { rows } = await pool.query(
      `SELECT user_id, username, full_name, email, phone, is_active, created_at
       FROM users
       ORDER BY full_name ASC, username ASC`
    );
    return rows;
  }

  // Lấy users với roles (cho dropdown filter)
  async getAllWithRoles() {
    const { rows } = await pool.query(
      `SELECT 
         u.user_id,
         u.username,
         u.full_name,
         u.email,
         u.phone,
         u.is_active,
         u.created_at,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT('role_id', r.role_id, 'role_name', r.role_name)
           ) FILTER (WHERE r.role_id IS NOT NULL),
           '[]'::json
         ) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.user_id
       LEFT JOIN roles r ON r.role_id = ur.role_id
       GROUP BY u.user_id, u.username, u.full_name, u.email, u.phone, u.is_active, u.created_at
       ORDER BY u.full_name ASC, u.username ASC`
    );
    return rows;
  }

  // Lấy user theo ID với roles
  async getByIdWithRoles(userId) {
    const { rows } = await pool.query(
      `SELECT 
         u.user_id,
         u.username,
         u.full_name,
         u.email,
         u.phone,
         u.is_active,
         u.created_at,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT('role_id', r.role_id, 'role_name', r.role_name)
           ) FILTER (WHERE r.role_id IS NOT NULL),
           '[]'::json
         ) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.user_id
       LEFT JOIN roles r ON r.role_id = ur.role_id
       WHERE u.user_id = $1
       GROUP BY u.user_id, u.username, u.full_name, u.email, u.phone, u.is_active, u.created_at`,
      [userId]
    );
    return rows[0] || null;
  }

  // Cập nhật user
  async update(userId, userData) {
    const { fullName, email, phone, isActive, passwordHash } = userData;
    
    let query = `UPDATE users SET full_name = $1, email = $2, phone = $3, is_active = $4`;
    let params = [fullName, email, phone, isActive, userId];
    
    if (passwordHash) {
      query = `UPDATE users SET full_name = $1, email = $2, phone = $3, is_active = $4, password_hash = $5 WHERE user_id = $6`;
      params = [fullName, email, phone, isActive, passwordHash, userId];
    } else {
      query += ` WHERE user_id = $5`;
    }
    
    query += ` RETURNING user_id, username, full_name, email, phone, is_active, created_at`;
    
    const { rows } = await pool.query(query, params);
    return rows[0];
  }

  // Xóa user (soft delete)
  async softDelete(userId) {
    const { rows } = await pool.query(
      `UPDATE users SET is_active = FALSE WHERE user_id = $1 RETURNING user_id`,
      [userId]
    );
    return rows[0];
  }

  // Xóa tất cả roles của user
  async clearUserRoles(userId) {
    await pool.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
  }

  // Gán nhiều roles cho user
  async assignRoles(userId, roleIds) {
    if (!roleIds || roleIds.length === 0) return;
    
    const values = roleIds.map((_, i) => `($1, $${i + 2})`).join(',');
    const query = `INSERT INTO user_roles (user_id, role_id) VALUES ${values} ON CONFLICT DO NOTHING`;
    
    await pool.query(query, [userId, ...roleIds]);
  }

  // Kiểm tra user có ca đang mở không
  async hasOpenShift(userId) {
    const { rows } = await pool.query(
      `SELECT 1 FROM ca_lam WHERE nhan_vien_id = $1 AND status = 'OPEN' LIMIT 1`,
      [userId]
    );
    return rows.length > 0;
  }

  // Lấy thống kê ca làm việc của user
  async getUserShifts(userId, options = {}) {
    const { startDate, endDate, shiftType, status } = options;
    
    let query = `
      SELECT 
        cl.id AS id,
        cl.shift_type AS type,
        cl.status AS status,
        cl.started_at AS started_at,
        cl.closed_at AS closed_at,
        CASE 
          WHEN cl.shift_type = 'CASHIER' THEN 
            JSON_BUILD_OBJECT(
              'total_orders', COALESCE(cl.total_orders, 0),
              'gross_amount', COALESCE(cl.gross_amount, 0),
              'net_amount', COALESCE(cl.net_amount, 0),
              'cash_diff', COALESCE(cl.cash_diff, 0)
            )
          WHEN cl.shift_type = 'KITCHEN' THEN
            JSON_BUILD_OBJECT(
              'total_items_made', COALESCE(cl.total_items_made, 0),
              'avg_prep_time_seconds', COALESCE(cl.avg_prep_time_seconds, 0)
            )
        END AS stats
      FROM ca_lam cl
      WHERE cl.nhan_vien_id = $1
    `;
    
    const params = [userId];
    let paramIndex = 2;
    
    if (startDate) {
      query += ` AND cl.started_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      query += ` AND cl.started_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (shiftType && shiftType !== 'ALL') {
      query += ` AND cl.shift_type = $${paramIndex}`;
      params.push(shiftType);
      paramIndex++;
    }
    
    if (status && status !== 'ALL') {
      query += ` AND cl.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` ORDER BY cl.started_at DESC`;
    
    const { rows } = await pool.query(query, params);
    return rows;
  }

  // Lấy thống kê hiệu suất của user
  async getUserStats(userId, options = {}) {
    const { startDate, endDate, shiftType } = options;
    
    let whereClause = 'cl.nhan_vien_id = $1';
    const params = [userId];
    let paramIndex = 2;
    
    if (startDate) {
      whereClause += ` AND cl.started_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereClause += ` AND cl.started_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (shiftType && shiftType !== 'ALL') {
      whereClause += ` AND cl.shift_type = $${paramIndex}`;
      params.push(shiftType);
      paramIndex++;
    }
    
    const { rows } = await pool.query(
      `SELECT 
        COUNT(DISTINCT cl.id) AS total_shifts,
        cl.shift_type,
        COALESCE(SUM(cl.total_orders), 0) AS total_orders,
        COALESCE(SUM(cl.net_amount), 0) AS total_revenue,
        COALESCE(SUM(cl.total_items_made), 0) AS total_items_made,
        COALESCE(AVG(cl.avg_prep_time_seconds), 0) AS avg_prep_time_seconds
      FROM ca_lam cl
      WHERE ${whereClause}
      GROUP BY cl.shift_type`,
      params
    );
    
    return rows;
  }
}

export default new UserRepository();
