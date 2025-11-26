/**
 * Script đồng bộ tiền từ đơn đã giao vào ví shipper
 * Chạy một lần để sync các đơn DELIVERED chưa được ghi nhận
 */

const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function syncDeliveredOrders() {
  console.log('🔄 Bắt đầu đồng bộ đơn đã giao...\n');
  
  try {
    // Tìm các đơn DELIVERED chưa được ghi nhận vào ví
    const { rows: deliveredOrders } = await pool.query(`
      SELECT 
        dh.id AS order_id,
        di.shipper_id,
        COALESCE(s.grand_total, 0) AS grand_total,
        COALESCE(di.delivery_fee, 0) AS delivery_fee
      FROM don_hang dh
      JOIN don_hang_delivery_info di ON di.order_id = dh.id
      LEFT JOIN v_order_settlement s ON s.order_id = dh.id
      WHERE dh.order_type = 'DELIVERY'
        AND di.delivery_status = 'DELIVERED'
        AND di.shipper_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM wallet_transactions wt
          JOIN shipper_wallet sw ON wt.wallet_id = sw.id
          WHERE wt.order_id = dh.id AND sw.user_id = di.shipper_id
        )
    `);
    
    console.log(`📋 Tìm thấy ${deliveredOrders.length} đơn chưa ghi nhận\n`);
    
    for (const order of deliveredOrders) {
      const amount = parseInt(order.grand_total || 0) + parseInt(order.delivery_fee || 0);
      
      if (amount <= 0) {
        console.log(`⏭️ Bỏ qua đơn #${order.order_id} (amount = 0)`);
        continue;
      }
      
      // Lấy hoặc tạo ví
      let wallet = await pool.query(
        `SELECT id, balance FROM shipper_wallet WHERE user_id = $1`,
        [order.shipper_id]
      );
      
      if (wallet.rows.length === 0) {
        // Tạo ví mới
        wallet = await pool.query(
          `INSERT INTO shipper_wallet (user_id, balance, total_collected, total_settled, wallet_limit)
           VALUES ($1, 0, 0, 0, 2000000)
           RETURNING id, balance`,
          [order.shipper_id]
        );
      }
      
      const walletId = wallet.rows[0].id;
      const balanceBefore = parseInt(wallet.rows[0].balance || 0);
      const balanceAfter = balanceBefore + amount;
      
      // Thêm giao dịch
      await pool.query(`
        INSERT INTO wallet_transactions (wallet_id, order_id, type, amount, balance_before, balance_after, payment_method, note, created_by)
        VALUES ($1, $2, 'COLLECT', $3, $4, $5, 'CASH', $6, $7)
      `, [walletId, order.order_id, amount, balanceBefore, balanceAfter, `Đồng bộ đơn giao #${order.order_id}`, order.shipper_id]);
      
      // Cập nhật số dư ví
      await pool.query(`
        UPDATE shipper_wallet 
        SET balance = balance + $1, 
            total_collected = total_collected + $1,
            updated_at = NOW()
        WHERE id = $2
      `, [amount, walletId]);
      
      console.log(`✅ Đơn #${order.order_id}: Ghi nhận ${amount.toLocaleString()}đ vào ví shipper ${order.shipper_id}`);
    }
    
    // Hiển thị kết quả
    const { rows: wallets } = await pool.query(`SELECT * FROM shipper_wallet`);
    console.log('\n=== SỐ DƯ VÍ SAU ĐỒNG BỘ ===');
    for (const w of wallets) {
      console.log(`- User ${w.user_id}: ${parseInt(w.balance).toLocaleString()}đ`);
    }
    
  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    pool.end();
  }
}

syncDeliveredOrders();
