// Debug script: Kiểm tra chênh lệch giữa doanh thu và tiền mặt trong ca #55
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function debug() {
  const shiftId = 55;
  
  try {
    console.log('🔍 Debug Shift #55: Doanh thu vs Tiền mặt\n');
    console.log('='.repeat(60));
    
    // 1. Lấy thông tin ca
    const shiftResult = await pool.query(
      `SELECT id, nhan_vien_id, started_at, closed_at, status 
       FROM ca_lam WHERE id = $1`,
      [shiftId]
    );
    
    if (shiftResult.rows.length === 0) {
      console.log('❌ Không tìm thấy ca #55');
      return;
    }
    
    const shift = shiftResult.rows[0];
    console.log(`📅 Ca #${shift.id} - Status: ${shift.status}`);
    console.log(`   Bắt đầu: ${shift.started_at}`);
    console.log(`   Kết thúc: ${shift.closed_at || 'Chưa đóng'}\n`);
    
    // 2. Lấy TẤT CẢ đơn PAID trong ca (từ fn_aggregate_shift)
    console.log('📊 1. TỔNG DOANH THU (từ fn_aggregate_shift):');
    const aggResult = await pool.query(
      `SELECT fn_aggregate_shift($1) AS stats`,
      [shiftId]
    );
    const stats = aggResult.rows[0].stats;
    console.log(`   - Tổng đơn: ${stats.total_orders}`);
    console.log(`   - Doanh thu gộp: ${parseInt(stats.gross_amount || 0).toLocaleString('vi-VN')}đ`);
    console.log(`   - Doanh thu thuần (net_amount): ${parseInt(stats.net_amount || 0).toLocaleString('vi-VN')}đ`);
    console.log(`   - Tiền mặt (cash_amount): ${parseInt(stats.cash_amount || 0).toLocaleString('vi-VN')}đ\n`);
    
    // 3. Lấy chi tiết từng đơn PAID
    console.log('📦 2. CHI TIẾT TỪNG ĐƠN PAID:');
    const ordersResult = await pool.query(`
      SELECT 
        dh.id,
        dh.trang_thai,
        dh.order_type,
        dh.opened_at,
        dh.closed_at,
        settlement.grand_total,
        settlement.subtotal_after_lines
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = $1 
        AND dh.trang_thai = 'PAID'
      ORDER BY dh.id
    `, [shiftId]);
    
    console.log(`   Tổng số đơn PAID: ${ordersResult.rows.length}\n`);
    
    let totalRevenue = 0;
    let totalCashFromOrders = 0;
    
    for (const order of ordersResult.rows) {
      const grandTotal = parseInt(order.grand_total || 0);
      totalRevenue += grandTotal;
      
      // Kiểm tra payment transaction
      const paymentResult = await pool.query(`
        SELECT 
          pt.id,
          pt.payment_method_code,
          pt.amount,
          pt.status
        FROM payment_transaction pt
        WHERE pt.order_id = $1
        ORDER BY pt.id
      `, [order.id]);
      
      // Kiểm tra order_payment (nếu có)
      const orderPaymentResult = await pool.query(`
        SELECT 
          op.id,
          op.method_code,
          op.amount,
          op.status
        FROM order_payment op
        WHERE op.order_id = $1
        ORDER BY op.id
      `, [order.id]);
      
      console.log(`   Đơn #${order.id} (${order.order_type}):`);
      console.log(`     - Grand Total: ${grandTotal.toLocaleString('vi-VN')}đ`);
      console.log(`     - Payment Transactions: ${paymentResult.rows.length}`);
      
      if (paymentResult.rows.length > 0) {
        paymentResult.rows.forEach(pt => {
          console.log(`       • ${pt.payment_method_code}: ${parseInt(pt.amount || 0).toLocaleString('vi-VN')}đ (${pt.status})`);
          if (pt.payment_method_code === 'CASH' && pt.status === 'PAID') {
            totalCashFromOrders += parseInt(pt.amount || 0);
          }
        });
      }
      
      console.log(`     - Order Payments: ${orderPaymentResult.rows.length}`);
      if (orderPaymentResult.rows.length > 0) {
        orderPaymentResult.rows.forEach(op => {
          console.log(`       • ${op.method_code}: ${parseInt(op.amount || 0).toLocaleString('vi-VN')}đ (${op.status})`);
          if (op.method_code === 'CASH' && op.status === 'CAPTURED') {
            totalCashFromOrders += parseInt(op.amount || 0);
          }
        });
      }
      
      if (paymentResult.rows.length === 0 && orderPaymentResult.rows.length === 0) {
        console.log(`       ⚠️ KHÔNG CÓ PAYMENT TRANSACTION!`);
      }
      
      console.log('');
    }
    
    // 4. Tính tiền COD và refunds
    console.log('💰 3. TIỀN COD VÀ REFUNDS:');
    const codResult = await pool.query(`
      SELECT COALESCE(SUM(wt.amount), 0)::INT AS total_cod
      FROM wallet_transactions wt
      WHERE wt.shift_id = $1
        AND wt.type = 'SETTLE'
    `, [shiftId]);
    const totalCod = parseInt(codResult.rows[0]?.total_cod || 0);
    console.log(`   - Tiền COD (shipper nộp): ${totalCod.toLocaleString('vi-VN')}đ`);
    
    const refundResult = await pool.query(`
      SELECT COALESCE(SUM(r.amount), 0)::INT AS total_refunds
      FROM order_payment_refund r
      JOIN order_payment p ON p.id = r.payment_id
      JOIN don_hang dh ON dh.id = p.order_id
      WHERE dh.ca_lam_id = $1
    `, [shiftId]);
    const totalRefunds = parseInt(refundResult.rows[0]?.total_refunds || 0);
    console.log(`   - Hoàn tiền: ${totalRefunds.toLocaleString('vi-VN')}đ\n`);
    
    // 5. Tổng kết
    console.log('📊 4. TỔNG KẾT:');
    console.log('='.repeat(60));
    console.log(`   Doanh thu (net_amount): ${totalRevenue.toLocaleString('vi-VN')}đ`);
    console.log(`   Tiền mặt từ đơn: ${totalCashFromOrders.toLocaleString('vi-VN')}đ`);
    console.log(`   + Tiền COD: ${totalCod.toLocaleString('vi-VN')}đ`);
    console.log(`   - Hoàn tiền: ${totalRefunds.toLocaleString('vi-VN')}đ`);
    console.log(`   = Tiền mặt tổng: ${(totalCashFromOrders + totalCod - totalRefunds).toLocaleString('vi-VN')}đ`);
    console.log(`\n   Chênh lệch: ${(totalRevenue - (totalCashFromOrders + totalCod - totalRefunds)).toLocaleString('vi-VN')}đ\n`);
    
    // 6. Kiểm tra đơn không có payment
    console.log('⚠️ 5. ĐƠN KHÔNG CÓ PAYMENT TRANSACTION:');
    const ordersWithoutPayment = ordersResult.rows.filter(order => {
      // Kiểm tra cả payment_transaction và order_payment
      return true; // Sẽ check trong loop
    });
    
    const missingPayments = [];
    for (const order of ordersResult.rows) {
      const hasPayment = await pool.query(`
        SELECT COUNT(*) as count
        FROM (
          SELECT 1 FROM payment_transaction WHERE order_id = $1
          UNION ALL
          SELECT 1 FROM order_payment WHERE order_id = $1
        ) t
      `, [order.id]);
      
      if (parseInt(hasPayment.rows[0].count) === 0) {
        missingPayments.push(order.id);
      }
    }
    
    if (missingPayments.length > 0) {
      console.log(`   ⚠️ Có ${missingPayments.length} đơn không có payment transaction:`);
      missingPayments.forEach(id => {
        console.log(`     - Đơn #${id}`);
      });
      console.log(`\n   💡 Đây có thể là nguyên nhân chênh lệch!`);
    } else {
      console.log(`   ✅ Tất cả đơn đều có payment transaction`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

debug();

