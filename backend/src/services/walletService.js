/**
 * Service: Shipper Wallet
 * Business logic cho ví giao hàng
 */

import walletRepo from '../repositories/walletRepository.js';
import { pool } from '../db.js';

const walletService = {
  /**
   * Lấy thông tin ví của shipper
   */
  async getMyWallet(userId) {
    // Đảm bảo ví tồn tại
    await walletRepo.getOrCreateWallet(userId);
    
    // Lấy summary
    const summary = await walletRepo.getWalletSummary(userId);
    
    // Lấy giao dịch hôm nay
    const wallet = await walletRepo.getWalletByUserId(userId);
    const todayTransactions = wallet ? await walletRepo.getTodayTransactions(wallet.id) : [];
    
    return {
      ...summary,
      transactions: todayTransactions
    };
  },

  /**
   * Lấy danh sách tất cả ví (cho manager/cashier)
   */
  async getAllWallets(options = {}) {
    return walletRepo.getAllWallets(options);
  },

  /**
   * Ghi nhận tiền thu được khi giao đơn COD thành công
   * Được gọi khi updateDeliveryStatus -> DELIVERED
   */
  async collectFromOrder(orderId, shipperId, shiftId = null) {
    // Kiểm tra đã ghi nhận chưa
    const isCollected = await walletRepo.isOrderCollected(orderId);
    if (isCollected) {
      console.log(`⚠️ Order ${orderId} đã được ghi nhận vào ví trước đó`);
      return null;
    }
    
    // Lấy thông tin đơn hàng với tổng tiền từ view v_order_settlement
    const { rows: orderRows } = await pool.query(
      `SELECT 
        dh.id, 
        dh.order_type, 
        dh.trang_thai,
        COALESCE(s.grand_total, 0) AS grand_total,
        COALESCE(di.delivery_fee, 0) AS delivery_fee
       FROM don_hang dh
       LEFT JOIN v_order_settlement s ON s.order_id = dh.id
       LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
       WHERE dh.id = $1`,
      [orderId]
    );
    
    if (orderRows.length === 0) {
      throw new Error('Không tìm thấy đơn hàng');
    }
    
    const order = orderRows[0];
    
    // Chỉ ghi nhận đơn DELIVERY đã thanh toán
    if (order.order_type !== 'DELIVERY') {
      console.log(`⚠️ Order ${orderId} không phải đơn giao hàng`);
      return null;
    }
    
    // Tính số tiền cần thu (bao gồm phí ship nếu khách trả)
    const amount = parseInt(order.grand_total || 0) + parseInt(order.delivery_fee || 0);
    
    console.log(`📦 Order ${orderId}: grand_total=${order.grand_total}, delivery_fee=${order.delivery_fee}, total=${amount}`);
    
    if (amount <= 0) {
      console.log(`⚠️ Order ${orderId} không có tiền cần thu (đã thanh toán online?)`);
      return null;
    }
    
    // Lấy hoặc tạo ví
    const wallet = await walletRepo.getOrCreateWallet(shipperId);
    const balanceBefore = parseInt(wallet.balance || 0);
    const balanceAfter = balanceBefore + amount;
    
    // Thêm giao dịch
    const transaction = await walletRepo.addTransaction({
      walletId: wallet.id,
      orderId,
      shiftId,
      type: 'COLLECT',
      amount,
      balanceBefore,
      balanceAfter,
      paymentMethod: 'CASH', // Tiền mặt thu từ khách
      note: `Thu tiền đơn giao hàng #${orderId}`,
      createdBy: shipperId
    });
    
    // Cập nhật số dư
    await walletRepo.updateBalance(wallet.id, balanceAfter, { collected: amount });
    
    console.log(`✅ Đã ghi nhận ${amount.toLocaleString()}đ vào ví shipper ${shipperId} từ đơn #${orderId}`);
    
    return transaction;
  },

  /**
   * Nộp tiền cho thu ngân (Settlement)
   * ⚠️ QUAN TRỌNG: Khi shipper nộp tiền, các đơn COD liên quan sẽ được đánh dấu PAID
   */
  async settleWallet(data) {
    const { shipperId, amount, cashierId, shiftId = null, note = '' } = data;
    
    // Lấy ví
    const wallet = await walletRepo.getWalletByUserId(shipperId);
    if (!wallet) {
      throw new Error('Không tìm thấy ví của nhân viên giao hàng');
    }
    
    const balanceBefore = parseInt(wallet.balance || 0);
    
    // Kiểm tra số dư
    if (amount > balanceBefore) {
      throw new Error(`Số tiền nộp (${amount.toLocaleString()}đ) lớn hơn số dư ví (${balanceBefore.toLocaleString()}đ)`);
    }
    
    if (amount <= 0) {
      throw new Error('Số tiền nộp phải lớn hơn 0');
    }
    
    const balanceAfter = balanceBefore - amount;
    
    // Thêm giao dịch
    const transaction = await walletRepo.addTransaction({
      walletId: wallet.id,
      orderId: null,
      shiftId,
      type: 'SETTLE',
      amount,
      balanceBefore,
      balanceAfter,
      paymentMethod: 'CASH',
      note: note || `Nộp tiền cho thu ngân`,
      createdBy: cashierId
    });
    
    // Cập nhật số dư
    await walletRepo.updateBalance(wallet.id, balanceAfter, { settled: amount });
    
    // ✅ Đánh dấu PAID cho các đơn COD đã giao thành công của shipper này
    try {
      const { pool } = await import('../db.js');
      
      // Tìm các đơn COD của shipper này: DELIVERY + CASH + DELIVERED + chưa PAID
      const codOrders = await pool.query(`
        SELECT DISTINCT dh.id, s.grand_total
        FROM don_hang dh
        JOIN don_hang_delivery_info di ON di.order_id = dh.id
        JOIN order_payment op ON op.order_id = dh.id AND op.method_code = 'CASH' AND op.status = 'CAPTURED'
        LEFT JOIN v_order_settlement s ON s.order_id = dh.id
        WHERE di.shipper_id = $1
          AND dh.order_type = 'DELIVERY'
          AND dh.trang_thai != 'PAID'
          AND di.delivery_status = 'DELIVERED'
        ORDER BY dh.id
      `, [shipperId]);
      
      let paidCount = 0;
      for (const order of codOrders.rows) {
        // Tạo payment_transaction nếu chưa có
        const existingTxn = await pool.query(
          `SELECT id FROM payment_transaction WHERE order_id = $1`,
          [order.id]
        );
        
        if (existingTxn.rows.length === 0) {
          const refCode = `COD${order.id}-${Date.now()}`;
          await pool.query(`
            INSERT INTO payment_transaction (
              order_id, payment_method_code, ref_code, amount, status, created_at, updated_at
            )
            VALUES ($1, 'CASH', $2, $3, 'PAID', NOW(), NOW())
          `, [order.id, refCode, order.grand_total]);
        }
        
        // Đánh dấu PAID, gán vào ca của cashier nhận tiền
        await pool.query(`
          UPDATE don_hang 
          SET trang_thai = 'PAID', closed_at = NOW(), ca_lam_id = COALESCE($2, ca_lam_id)
          WHERE id = $1
        `, [order.id, shiftId]);
        
        paidCount++;
      }
      
      if (paidCount > 0) {
        console.log(`✅ Đã đánh dấu PAID cho ${paidCount} đơn COD của shipper ${shipperId}`);
      }
    } catch (paidError) {
      console.error(`⚠️ Lỗi đánh dấu PAID cho đơn COD:`, paidError.message);
    }
    
    console.log(`✅ Shipper ${shipperId} đã nộp ${amount.toLocaleString()}đ. Số dư còn: ${balanceAfter.toLocaleString()}đ`);
    
    return {
      transaction,
      balance_before: balanceBefore,
      balance_after: balanceAfter
    };
  },

  /**
   * Nộp tất cả tiền trong ví
   */
  async settleAll(shipperId, cashierId, shiftId = null) {
    const wallet = await walletRepo.getWalletByUserId(shipperId);
    if (!wallet || wallet.balance <= 0) {
      throw new Error('Không có tiền trong ví để nộp');
    }
    
    return this.settleWallet({
      shipperId,
      amount: parseInt(wallet.balance),
      cashierId,
      shiftId,
      note: 'Nộp toàn bộ tiền trong ví'
    });
  },

  /**
   * Điều chỉnh số dư ví (Admin only)
   */
  async adjustBalance(data) {
    const { shipperId, amount, adminId, note } = data;
    
    const wallet = await walletRepo.getOrCreateWallet(shipperId);
    const balanceBefore = parseInt(wallet.balance || 0);
    const balanceAfter = balanceBefore + amount; // amount có thể âm (trừ) hoặc dương (cộng)
    
    if (balanceAfter < 0) {
      throw new Error('Số dư ví không thể âm');
    }
    
    // Thêm giao dịch
    const transaction = await walletRepo.addTransaction({
      walletId: wallet.id,
      orderId: null,
      shiftId: null,
      type: 'ADJUST',
      amount: Math.abs(amount),
      balanceBefore,
      balanceAfter,
      paymentMethod: null,
      note: note || `Điều chỉnh số dư bởi admin`,
      createdBy: adminId
    });
    
    // Cập nhật số dư
    const updateTotals = amount > 0 
      ? { collected: amount } 
      : { settled: Math.abs(amount) };
    await walletRepo.updateBalance(wallet.id, balanceAfter, updateTotals);
    
    return { transaction, balance_before: balanceBefore, balance_after: balanceAfter };
  },

  /**
   * Lấy lịch sử giao dịch
   */
  async getTransactionHistory(userId, options = {}) {
    const wallet = await walletRepo.getWalletByUserId(userId);
    if (!wallet) {
      return [];
    }
    return walletRepo.getTransactions(wallet.id, options);
  },

  /**
   * Lấy thống kê ví theo ca
   */
  async getWalletStatsForShift(userId, shiftId) {
    const wallet = await walletRepo.getWalletByUserId(userId);
    if (!wallet) {
      return {
        collect_count: 0,
        total_collected: 0,
        settle_count: 0,
        total_settled: 0,
        balance: 0
      };
    }
    
    const stats = await walletRepo.getShiftStats(wallet.id, shiftId);
    return {
      ...stats,
      balance: parseInt(wallet.balance || 0)
    };
  },

  /**
   * Kiểm tra ví có vượt hạn mức không
   */
  async checkWalletLimit(userId) {
    const wallet = await walletRepo.getWalletByUserId(userId);
    if (!wallet) return { exceeded: false };
    
    const balance = parseInt(wallet.balance || 0);
    const limit = parseInt(wallet.wallet_limit || 2000000);
    
    return {
      balance,
      limit,
      exceeded: balance >= limit,
      remaining: Math.max(0, limit - balance)
    };
  },

  /**
   * Cập nhật hạn mức ví
   */
  async updateLimit(shipperId, newLimit, adminId) {
    const wallet = await walletRepo.getWalletByUserId(shipperId);
    if (!wallet) {
      throw new Error('Không tìm thấy ví');
    }
    return walletRepo.updateWalletLimit(wallet.id, newLimit);
  },

  /**
   * Tổng quan tiền chưa nộp (cho báo cáo)
   */
  async getPendingSummary() {
    const summary = await walletRepo.getTotalPendingBalance();
    const wallets = await walletRepo.getAllWallets({ hasBalance: true });
    
    return {
      ...summary,
      details: wallets
    };
  },

  /**
   * Đối soát: Lấy đơn đã giao nhưng chưa ghi nhận
   */
  async getUnrecordedOrders(shipperId) {
    return walletRepo.getUnrecordedDeliveries(shipperId);
  },

  /**
   * Đồng bộ các đơn chưa ghi nhận vào ví
   */
  async syncUnrecordedOrders(shipperId, shiftId = null) {
    const unrecorded = await this.getUnrecordedOrders(shipperId);
    const results = [];
    
    for (const order of unrecorded) {
      try {
        const tx = await this.collectFromOrder(order.id, shipperId, shiftId);
        if (tx) {
          results.push({ orderId: order.id, success: true });
        }
      } catch (error) {
        results.push({ orderId: order.id, success: false, error: error.message });
      }
    }
    
    return results;
  }
};

export default walletService;
