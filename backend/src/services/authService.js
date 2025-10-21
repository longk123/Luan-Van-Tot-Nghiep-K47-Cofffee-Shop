// backend/src/services/authService.js
// Business logic cho authentication

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/userRepository.js';

class AuthService {
  // Tạo JWT token
  generateToken(user) {
    return jwt.sign(
      { 
        user_id: user.user_id, 
        username: user.username, 
        roles: user.roles || [] 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' }
    );
  }

  // Đăng nhập
  async login(username, password) {
    // Tìm user
    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new Error('Sai thông tin đăng nhập');
    }

    // Kiểm tra tài khoản bị khóa
    if (!user.is_active) {
      throw new Error('Tài khoản đã bị khóa');
    }

    // Kiểm tra mật khẩu
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Sai thông tin đăng nhập');
    }

    // Lấy roles
    const roles = await userRepository.getUserRoles(user.user_id);

    // Tạo token
    const token = this.generateToken({ ...user, roles });

    // Loại bỏ password_hash khỏi response
    delete user.password_hash;

    return {
      user: { ...user, roles },
      token
    };
  }

  // Đăng ký
  async register(userData) {
    const { username, password, full_name, email } = userData;

    // Kiểm tra username đã tồn tại
    const userExists = await userRepository.existsByUsername(username);
    if (userExists) {
      throw new Error('Username đã tồn tại');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Tạo user
    const user = await userRepository.create({
      username,
      passwordHash,
      fullName: full_name,
      email
    });

    // Lấy roles (mặc định sẽ là empty array)
    const roles = await userRepository.getUserRoles(user.user_id);

    // Tạo token
    const token = this.generateToken({ ...user, roles });

    return {
      user: { ...user, roles },
      token
    };
  }

  // Lấy thông tin user hiện tại
  async getCurrentUser(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User không tồn tại');
    }

    const roles = await userRepository.getUserRoles(userId);
    return { ...user, roles };
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Token không hợp lệ hoặc đã hết hạn');
    }
  }
}

export default new AuthService();
