// Verify script: Kiểm tra tính toán tiền mặt trong ca #55
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function verify() {
  const shiftId = 55;
  
  try {
    console.log('🔍 Verifying cash calculation for Shift #55...\n');
    console.log('='.repeat(60));
    
    // 1. Lấy stats từ fn_aggregate_shift
    const aggResult = await pool.query(
      `SELECT fn_aggregate_shift($1) AS stats`,
      [shiftId]
    );
    const stats = aggResult.rows[0].stats;
    
    console.log('📊 Từ fn_aggregate_shift():');
    console.log(`   - Doanh thu (net_amount): ${parseInt(stats.net_amount || 0).toLocaleString('vi-VN')}đ`);
    console.log(`   - Tiền mặt (cash_amount): ${parseInt(stats.cash_amount || 0).toLocaleString('vi-VN')}đ\n`);
    
    // 2. Tính tiền mặt từ payment_transaction (CASH, PAID)
    const cashFromTxnResult = await pool.query(`
      SELECT COALESCE(SUM(pt.amount), 0)::INT AS total
      FROM payment_transaction pt
      JOIN don_hang dh ON dh.id = pt.order_id
      WHERE dh.ca_lam_id = $1
        AND pt.payment_method_code = 'CASH'
        AND pt.status = 'PAID'
    `, [shiftId]);
    const cashFromTxn = parseInt(cashFromTxnResult.rows[0]?.total || 0);
    console.log(`💰 Tiền mặt từ payment_transaction: ${cashFromTxn.toLocaleString('vi-VN')}đ\n`);
    
    // 3. Tính tiền COD settle
    const codResult = await pool.query(`
      SELECT COALESCE(SUM(wt.amount), 0)::INT AS total_cod
      FROM wallet_transactions wt
      WHERE wt.shift_id = $1
        AND wt.type = 'SETTLE'
    `, [shiftId]);
    const totalCod = parseInt(codResult.rows[0]?.total_cod || 0);
    console.log(`💰 Tiền COD (shipper nộp): ${totalCod.toLocaleString('vi-VN')}đ\n`);
    
    // 4. Tính refunds
    const refundResult = await pool.query(`
      SELECT COALESCE(SUM(r.amount), 0)::INT AS total_refunds
      FROM order_payment_refund r
      JOIN order_payment p ON p.id = r.payment_id
      JOIN don_hang dh ON dh.id = p.order_id
      WHERE dh.ca_lam_id = $1
    `, [shiftId]);
    const totalRefunds = parseInt(refundResult.rows[0]?.total_refunds || 0);
    console.log(`💰 Hoàn tiền: ${totalRefunds.toLocaleString('vi-VN')}đ\n`);
    
    // 5. Tính tiền mặt từ order_payment (CASH, CAPTURED)
    const cashFromOrderPaymentResult = await pool.query(`
      SELECT COALESCE(SUM(op.amount), 0)::INT AS total
      FROM order_payment op
      JOIN don_hang dh ON dh.id = op.order_id
      WHERE dh.ca_lam_id = $1
        AND op.method_code = 'CASH'
        AND op.status = 'CAPTURED'
    `, [shiftId]);
    const cashFromOrderPayment = parseInt(cashFromOrderPaymentResult.rows[0]?.total || 0);
    console.log(`💰 Tiền mặt từ order_payment: ${cashFromOrderPayment.toLocaleString('vi-VN')}đ\n`);
    
    // 6. Tổng kết
    console.log('='.repeat(60));
    console.log('📊 TỔNG KẾT:');
    console.log(`   Doanh thu: ${parseInt(stats.net_amount || 0).toLocaleString('vi-VN')}đ`);
    console.log(`   Tiền mặt (từ fn_aggregate_shift): ${parseInt(stats.cash_amount || 0).toLocaleString('vi-VN')}đ`);
    console.log(`   Tiền mặt (từ payment_transaction): ${cashFromTxn.toLocaleString('vi-VN')}đ`);
    console.log(`   Tiền mặt (từ order_payment): ${cashFromOrderPayment.toLocaleString('vi-VN')}đ`);
    console.log(`   + COD: ${totalCod.toLocaleString('vi-VN')}đ`);
    console.log(`   - Refunds: ${totalRefunds.toLocaleString('vi-VN')}đ`);
    console.log(`   = Tiền mặt tổng (theo aggregateShift): ${(cashFromTxn + totalCod - totalRefunds).toLocaleString('vi-VN')}đ\n`);
    
    // 7. So sánh
    const expectedCash = cashFromTxn + totalCod - totalRefunds;
    const diff = parseInt(stats.cash_amount || 0) - expectedCash;
    
    if (diff !== 0) {
      console.log(`⚠️ CHÊNH LỆCH: ${diff.toLocaleString('vi-VN')}đ`);
      console.log(`   fn_aggregate_shift tính: ${parseInt(stats.cash_amount || 0).toLocaleString('vi-VN')}đ`);
      console.log(`   Thực tế nên là: ${expectedCash.toLocaleString('vi-VN')}đ\n`);
    } else {
      console.log(`✅ Khớp chính xác!\n`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

verify();

