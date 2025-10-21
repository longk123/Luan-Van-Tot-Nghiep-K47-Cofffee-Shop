// backend/src/controllers/authController.js
// Controller cho authentication

import authService from '../services/authService.js';
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
}

export default new AuthController();
