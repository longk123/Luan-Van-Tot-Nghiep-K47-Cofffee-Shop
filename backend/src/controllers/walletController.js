/**
 * Controller: Shipper Wallet
 * API endpoints cho ví giao hàng
 */

import walletService from '../services/walletService.js';

export const walletController = {
  /**
   * GET /api/v1/wallet/me
   * Lấy thông tin ví của tôi (waiter)
   */
  async getMyWallet(req, res, next) {
    try {
      const userId = req.user.user_id;
      const wallet = await walletService.getMyWallet(userId);
      res.json({ success: true, data: wallet });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/wallet/all
   * Lấy danh sách tất cả ví (manager/admin)
   */
  async getAllWallets(req, res, next) {
    try {
      const { hasBalance, onlyActive } = req.query;
      const wallets = await walletService.getAllWallets({
        hasBalance: hasBalance === 'true' || hasBalance === '1',
        onlyActive: onlyActive !== 'false' && onlyActive !== '0'
      });
      res.json({ success: true, data: wallets });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/wallet/user/:userId
   * Lấy thông tin ví của một user cụ thể (manager/admin)
   */
  async getWalletByUser(req, res, next) {
    try {
      const { userId } = req.params;
      const wallet = await walletService.getMyWallet(parseInt(userId));
      res.json({ success: true, data: wallet });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/wallet/transactions
   * Lấy lịch sử giao dịch của tôi
   */
  async getMyTransactions(req, res, next) {
    try {
      const userId = req.user.user_id;
      const { limit, offset, type, startDate, endDate, shiftId } = req.query;
      
      const transactions = await walletService.getTransactionHistory(userId, {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        type: type || null,
        startDate: startDate || null,
        endDate: endDate || null,
        shiftId: shiftId ? parseInt(shiftId) : null
      });
      
      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/wallet/user/:userId/transactions
   * Lấy lịch sử giao dịch của một user (manager/admin)
   */
  async getUserTransactions(req, res, next) {
    try {
      const { userId } = req.params;
      const { limit, offset, type, startDate, endDate, shiftId } = req.query;
      
      const transactions = await walletService.getTransactionHistory(parseInt(userId), {
        limit: limit ? parseInt(limit) : 50,
        offset: offset ? parseInt(offset) : 0,
        type: type || null,
        startDate: startDate || null,
        endDate: endDate || null,
        shiftId: shiftId ? parseInt(shiftId) : null
      });
      
      res.json({ success: true, data: transactions });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/wallet/settle
   * Nộp tiền cho thu ngân
   */
  async settleWallet(req, res, next) {
    try {
      const { shipperId, amount, note } = req.body;
      const cashierId = req.user.user_id;
      
      // Lấy ca hiện tại nếu có
      const { pool } = await import('../db.js');
      const shiftResult = await pool.query(
        `SELECT id FROM ca_lam WHERE nhan_vien_id = $1 AND status = 'OPEN' LIMIT 1`,
        [cashierId]
      );
      const shiftId = shiftResult.rows[0]?.id || null;
      
      const result = await walletService.settleWallet({
        shipperId: parseInt(shipperId),
        amount: parseInt(amount),
        cashierId,
        shiftId,
        note
      });
      
      res.json({ 
        success: true, 
        message: `Đã nhận ${parseInt(amount).toLocaleString()}đ từ nhân viên giao hàng`,
        data: result 
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/wallet/settle-all
   * Nộp tất cả tiền trong ví
   */
  async settleAll(req, res, next) {
    try {
      const { shipperId } = req.body;
      const cashierId = req.user.user_id;
      
      // Lấy ca hiện tại nếu có
      const { pool } = await import('../db.js');
      const shiftResult = await pool.query(
        `SELECT id FROM ca_lam WHERE nhan_vien_id = $1 AND status = 'OPEN' LIMIT 1`,
        [cashierId]
      );
      const shiftId = shiftResult.rows[0]?.id || null;
      
      const result = await walletService.settleAll(
        parseInt(shipperId),
        cashierId,
        shiftId
      );
      
      res.json({ 
        success: true, 
        message: `Đã nhận toàn bộ ${result.balance_before.toLocaleString()}đ`,
        data: result 
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/wallet/adjust
   * Điều chỉnh số dư ví (Admin only)
   */
  async adjustBalance(req, res, next) {
    try {
      const { shipperId, amount, note } = req.body;
      const adminId = req.user.user_id;
      
      const result = await walletService.adjustBalance({
        shipperId: parseInt(shipperId),
        amount: parseInt(amount),
        adminId,
        note
      });
      
      res.json({ 
        success: true, 
        message: `Đã điều chỉnh số dư ví`,
        data: result 
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/wallet/check-limit
   * Kiểm tra hạn mức ví của tôi
   */
  async checkLimit(req, res, next) {
    try {
      const userId = req.user.user_id;
      const result = await walletService.checkWalletLimit(userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  },

  /**
   * PUT /api/v1/wallet/user/:userId/limit
   * Cập nhật hạn mức ví (Admin only)
   */
  async updateLimit(req, res, next) {
    try {
      const { userId } = req.params;
      const { limit } = req.body;
      const adminId = req.user.user_id;
      
      const result = await walletService.updateLimit(
        parseInt(userId),
        parseInt(limit),
        adminId
      );
      
      res.json({ 
        success: true, 
        message: `Đã cập nhật hạn mức ví thành ${parseInt(limit).toLocaleString()}đ`,
        data: result 
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/wallet/pending-summary
   * Tổng quan tiền chưa nộp (cho báo cáo)
   */
  async getPendingSummary(req, res, next) {
    try {
      const summary = await walletService.getPendingSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/wallet/unrecorded
   * Lấy đơn đã giao nhưng chưa ghi nhận vào ví
   */
  async getUnrecordedOrders(req, res, next) {
    try {
      const userId = req.user.user_id;
      const orders = await walletService.getUnrecordedOrders(userId);
      res.json({ success: true, data: orders });
    } catch (error) {
      next(error);
    }
  },

  /**
   * POST /api/v1/wallet/sync
   * Đồng bộ các đơn chưa ghi nhận vào ví
   */
  async syncOrders(req, res, next) {
    try {
      const userId = req.user.user_id;
      
      // Lấy ca hiện tại nếu có
      const { pool } = await import('../db.js');
      const shiftResult = await pool.query(
        `SELECT id FROM ca_lam WHERE nhan_vien_id = $1 AND status = 'OPEN' LIMIT 1`,
        [userId]
      );
      const shiftId = shiftResult.rows[0]?.id || null;
      
      const results = await walletService.syncUnrecordedOrders(userId, shiftId);
      
      const successCount = results.filter(r => r.success).length;
      res.json({ 
        success: true, 
        message: `Đã đồng bộ ${successCount}/${results.length} đơn hàng`,
        data: results 
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * GET /api/v1/wallet/shift-stats/:shiftId
   * Lấy thống kê ví theo ca
   */
  async getShiftStats(req, res, next) {
    try {
      const { shiftId } = req.params;
      const { userId } = req.query;
      const targetUserId = userId ? parseInt(userId) : req.user.user_id;
      
      const stats = await walletService.getWalletStatsForShift(
        targetUserId,
        parseInt(shiftId)
      );
      
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
};

export default walletController;
