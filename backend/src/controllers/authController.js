// backend/src/controllers/authController.js
// Controller cho authentication

import authService from '../services/authService.js';
import userRepository from '../repositories/userRepository.js';
import { asyncHandler } from '../middleware/error.js';

class AuthController {
  // Đăng nhập
  login = asyncHandler(async (req, res) => {
    const { username, password } = req.body;
    
    const result = await authService.login(username, password);
    
    res.json(result);
  });

  // Đăng ký
  register = asyncHandler(async (req, res) => {
    const { username, password, full_name, email } = req.body;
    
    const result = await authService.register({
      username,
      password,
      full_name,
      email
    });
    
    res.status(201).json(result);
  });

  // Lấy thông tin user hiện tại
  getMe = asyncHandler(async (req, res) => {
    const { user_id } = req.user;
    
    const user = await authService.getCurrentUser(user_id);
    
    res.json({ user });
  });

  // Verify token (cho testing)
  verifyToken = asyncHandler(async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Missing token' });
    }
    
    try {
      const decoded = authService.verifyToken(token);
      res.json({ valid: true, user: decoded });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  });

  // Lấy danh sách tất cả users (cho manager/admin)
  listUsers = asyncHandler(async (req, res) => {
    const users = await userRepository.getAllWithRoles();
    res.json({ 
      success: true, 
      data: users 
    });
  });

  // Lấy chi tiết một user
  getUserById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const user = await userRepository.getByIdWithRoles(parseInt(id));
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ success: true, data: user });
  });

  // Tạo user mới
  createUser = asyncHandler(async (req, res) => {
    const { username, password, full_name, email, phone, roles } = req.body;
    
    // Check if username exists
    const exists = await userRepository.existsByUsername(username);
    if (exists) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Hash password
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const user = await userRepository.create({
      username,
      passwordHash,
      fullName: full_name,
      email,
      phone
    });
    
    // Assign roles if provided
    if (roles && roles.length > 0) {
      await userRepository.assignRoles(user.user_id, roles);
    }
    
    // Fetch user with roles
    const userWithRoles = await userRepository.getByIdWithRoles(user.user_id);
    
    res.status(201).json({ success: true, data: userWithRoles });
  });

  // Cập nhật user
  updateUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { full_name, email, phone, password, roles, is_active } = req.body;
    
    // Check if user exists
    const existingUser = await userRepository.findById(parseInt(id));
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Hash new password if provided
    let passwordHash = null;
    if (password) {
      const bcrypt = await import('bcrypt');
      passwordHash = await bcrypt.hash(password, 10);
    }
    
    // Update user
    const updatedUser = await userRepository.update(parseInt(id), {
      fullName: full_name,
      email,
      phone,
      isActive: is_active !== undefined ? is_active : true,
      passwordHash
    });
    
    // Update roles if provided
    if (roles && Array.isArray(roles)) {
      await userRepository.clearUserRoles(parseInt(id));
      if (roles.length > 0) {
        await userRepository.assignRoles(parseInt(id), roles);
      }
    }
    
    // Fetch user with roles
    const userWithRoles = await userRepository.getByIdWithRoles(parseInt(id));
    
    res.json({ success: true, data: userWithRoles });
  });

  // Xóa user (soft delete)
  deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check if user exists
    const user = await userRepository.findById(parseInt(id));
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user has open shifts
    const hasOpenShift = await userRepository.hasOpenShift(parseInt(id));
    if (hasOpenShift) {
      return res.status(400).json({ error: 'Cannot delete user with open shifts' });
    }
    
    // Soft delete
    await userRepository.softDelete(parseInt(id));
    
    res.json({ success: true, message: 'User deactivated successfully' });
  });

  // Lấy danh sách roles
  getRoles = asyncHandler(async (req, res) => {
    const roles = await userRepository.getAllRoles();
    res.json({ success: true, data: roles });
  });

  // Lấy lịch sử ca làm việc của user
  getUserShifts = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate, shiftType, status } = req.query;
    
    const shifts = await userRepository.getUserShifts(parseInt(id), {
      startDate,
      endDate,
      shiftType,
      status
    });
    
    res.json({ success: true, data: shifts });
  });

  // Lấy thống kê hiệu suất của user
  getUserStats = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate, shiftType } = req.query;
    
    const stats = await userRepository.getUserStats(parseInt(id), {
      startDate,
      endDate,
      shiftType
    });
    
    // Calculate summary
    const summary = {
      total_shifts: 0,
      total_orders: 0,
      total_revenue: 0,
      avg_revenue_per_shift: 0,
      avg_orders_per_shift: 0,
      total_items_made: 0,
      avg_prep_time: 0,
      avg_items_per_shift: 0
    };
    
    stats.forEach(stat => {
      summary.total_shifts += parseInt(stat.total_shifts);
      if (stat.shift_type === 'CASHIER') {
        summary.total_orders += parseInt(stat.total_orders);
        summary.total_revenue += parseFloat(stat.total_revenue);
      } else if (stat.shift_type === 'KITCHEN') {
        summary.total_items_made += parseInt(stat.total_items_made);
        summary.avg_prep_time = parseFloat(stat.avg_prep_time_seconds);
      }
    });
    
    if (summary.total_shifts > 0) {
      summary.avg_revenue_per_shift = summary.total_revenue / summary.total_shifts;
      summary.avg_orders_per_shift = summary.total_orders / summary.total_shifts;
      summary.avg_items_per_shift = summary.total_items_made / summary.total_shifts;
    }
    
    res.json({ 
      success: true, 
      data: {
        summary,
        details: stats
      }
    });
  });

  // Kiểm tra username có tồn tại không
  checkUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;
    const exists = await userRepository.existsByUsername(username);
    res.json({ available: !exists });
  });
}

export default new AuthController();
