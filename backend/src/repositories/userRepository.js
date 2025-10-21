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
}

export default new UserRepository();
