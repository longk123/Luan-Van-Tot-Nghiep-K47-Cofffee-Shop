/**
 * Repository: Shipper Wallet
 * Quản lý dữ liệu ví giao hàng
 */

import { pool } from '../db.js';

const walletRepository = {
  /**
   * Lấy hoặc tạo ví cho user
   */
  async getOrCreateWallet(userId) {
    // Kiểm tra ví đã tồn tại chưa
    let result = await pool.query(
      `SELECT * FROM shipper_wallet WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length > 0) {
      return result.rows[0];
    }
    
    // Tạo ví mới
    result = await pool.query(
      `INSERT INTO shipper_wallet (user_id) VALUES ($1) RETURNING *`,
      [userId]
    );
    
    return result.rows[0];
  },

  /**
   * Lấy thông tin ví theo user_id
   */
  async getWalletByUserId(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM shipper_wallet WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  },

  /**
   * Lấy tổng hợp ví (từ view)
   */
  async getWalletSummary(userId) {
    const { rows } = await pool.query(
      `SELECT * FROM v_shipper_wallet_summary WHERE user_id = $1`,
      [userId]
    );
    return rows[0] || null;
  },

  /**
   * Lấy danh sách tất cả ví (cho manager/admin)
   */
  async getAllWallets(options = {}) {
    const { onlyActive = true, hasBalance = false } = options;
    
    let query = `SELECT * FROM v_shipper_wallet_summary WHERE 1=1`;
    const params = [];
    
    if (onlyActive) {
      query += ` AND is_active = TRUE`;
    }
    
    if (hasBalance) {
      query += ` AND balance > 0`;
    }
    
    query += ` ORDER BY balance DESC, shipper_name ASC`;
    
    const { rows } = await pool.query(query, params);
    return rows;
  },

  /**
   * Cập nhật số dư ví
   */
  async updateBalance(walletId, newBalance, updateTotals = {}) {
    const { collected = 0, settled = 0 } = updateTotals;
    
    const { rows } = await pool.query(
      `UPDATE shipper_wallet 
       SET balance = $2,
           total_collected = total_collected + $3,
           total_settled = total_settled + $4
       WHERE id = $1
       RETURNING *`,
      [walletId, newBalance, collected, settled]
    );
    
    return rows[0];
  },

  /**
   * Thêm giao dịch vào ví
   */
  async addTransaction(data) {
    const {
      walletId,
      orderId = null,
      shiftId = null,
      type, // 'COLLECT' | 'SETTLE' | 'ADJUST'
      amount,
      balanceBefore,
      balanceAfter,
      paymentMethod = null,
      note = null,
      createdBy
    } = data;
    
    const { rows } = await pool.query(
      `INSERT INTO wallet_transactions 
       (wallet_id, order_id, shift_id, type, amount, balance_before, balance_after, payment_method, note, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [walletId, orderId, shiftId, type, amount, balanceBefore, balanceAfter, paymentMethod, note, createdBy]
    );
    
    return rows[0];
  },

  /**
   * Lấy lịch sử giao dịch của ví
   */
  async getTransactions(walletId, options = {}) {
    const { 
      limit = 50, 
      offset = 0, 
      type = null, 
      startDate = null, 
      endDate = null,
      shiftId = null
    } = options;
    
    let query = `
      SELECT 
        wt.*,
        dh.id AS order_code,
        dh.order_type,
        os.grand_total AS order_total,
        u.username AS created_by_username,
        u.full_name AS created_by_name
      FROM wallet_transactions wt
      LEFT JOIN don_hang dh ON dh.id = wt.order_id
      LEFT JOIN v_order_settlement os ON os.order_id = wt.order_id
      LEFT JOIN users u ON u.user_id = wt.created_by
      WHERE wt.wallet_id = $1
    `;
    const params = [walletId];
    let paramIndex = 2;
    
    if (type) {
      query += ` AND wt.type = $${paramIndex++}`;
      params.push(type);
    }
    
    if (startDate) {
      query += ` AND wt.created_at >= $${paramIndex++}`;
      params.push(startDate);
    }
    
    if (endDate) {
      query += ` AND wt.created_at <= $${paramIndex++}`;
      params.push(endDate);
    }
    
    if (shiftId) {
      query += ` AND wt.shift_id = $${paramIndex++}`;
      params.push(shiftId);
    }
    
    query += ` ORDER BY wt.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);
    
    const { rows } = await pool.query(query, params);
    return rows;
  },

  /**
   * Lấy giao dịch hôm nay
   */
  async getTodayTransactions(walletId) {
    const { rows } = await pool.query(
      `SELECT 
        wt.*,
        dh.id AS order_code,
        dh.order_type,
        dh.delivery_address
       FROM wallet_transactions wt
       LEFT JOIN don_hang dh ON dh.id = wt.order_id
       WHERE wt.wallet_id = $1
         AND wt.created_at::DATE = CURRENT_DATE
       ORDER BY wt.created_at DESC`,
      [walletId]
    );
    return rows;
  },

  /**
   * Lấy thống kê ví theo ca
   */
  async getShiftStats(walletId, shiftId) {
    const { rows } = await pool.query(
      `SELECT 
        COUNT(CASE WHEN type = 'COLLECT' THEN 1 END) AS collect_count,
        COALESCE(SUM(CASE WHEN type = 'COLLECT' THEN amount ELSE 0 END), 0) AS total_collected,
        COUNT(CASE WHEN type = 'SETTLE' THEN 1 END) AS settle_count,
        COALESCE(SUM(CASE WHEN type = 'SETTLE' THEN amount ELSE 0 END), 0) AS total_settled
       FROM wallet_transactions
       WHERE wallet_id = $1 AND shift_id = $2`,
      [walletId, shiftId]
    );
    return rows[0];
  },

  /**
   * Kiểm tra đơn hàng đã được ghi nhận chưa
   */
  async isOrderCollected(orderId) {
    const { rows } = await pool.query(
      `SELECT id FROM wallet_transactions 
       WHERE order_id = $1 AND type = 'COLLECT'`,
      [orderId]
    );
    return rows.length > 0;
  },

  /**
   * Cập nhật hạn mức ví
   */
  async updateWalletLimit(walletId, newLimit) {
    const { rows } = await pool.query(
      `UPDATE shipper_wallet SET wallet_limit = $2 WHERE id = $1 RETURNING *`,
      [walletId, newLimit]
    );
    return rows[0];
  },

  /**
   * Lấy tổng tiền chưa nộp của tất cả shipper
   */
  async getTotalPendingBalance() {
    const { rows } = await pool.query(
      `SELECT 
        COUNT(*) AS shipper_count,
        COALESCE(SUM(balance), 0) AS total_balance
       FROM shipper_wallet
       WHERE is_active = TRUE AND balance > 0`
    );
    return rows[0];
  },

  /**
   * Lấy danh sách đơn hàng COD đã giao nhưng chưa ghi nhận vào ví
   * (Dùng để đối soát)
   */
  async getUnrecordedDeliveries(shipperId) {
    const { rows } = await pool.query(
      `SELECT 
        dh.id,
        os.grand_total,
        di.delivery_status,
        dh.closed_at AS paid_at,
        di.delivery_address
       FROM don_hang dh
       LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
       LEFT JOIN v_order_settlement os ON os.order_id = dh.id
       WHERE di.shipper_id = $1
         AND dh.order_type = 'DELIVERY'
         AND di.delivery_status = 'DELIVERED'
         AND dh.trang_thai = 'PAID'
         AND NOT EXISTS (
           SELECT 1 FROM wallet_transactions wt 
           WHERE wt.order_id = dh.id AND wt.type = 'COLLECT'
         )
       ORDER BY dh.closed_at DESC`,
      [shipperId]
    );
    return rows;
  }
};

export default walletRepository;
