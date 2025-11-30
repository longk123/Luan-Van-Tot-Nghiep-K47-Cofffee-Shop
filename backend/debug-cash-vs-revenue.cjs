const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456'
});

async function debug() {
  try {
    console.log('🔍 Phân tích tiền mặt vs doanh thu ca #55\n');
    
    // 1. Tiền thanh toán tiền mặt từ order_payment
    const cashPayment = await pool.query(`
      SELECT COALESCE(SUM(p.amount), 0)::INT as total_cash
      FROM order_payment p
      JOIN don_hang dh ON dh.id = p.order_id
      WHERE dh.ca_lam_id = 55 
        AND dh.trang_thai = 'PAID' 
        AND p.method_code = 'CASH' 
        AND p.status = 'CAPTURED'
    `);
    console.log('💵 Tiền mặt từ thanh toán đơn (order_payment):');
    console.log(`   ${cashPayment.rows[0].total_cash.toLocaleString('vi-VN')}đ`);
    
    // 2. COD settle
    const cod = await pool.query(`
      SELECT COALESCE(SUM(amount), 0)::INT as total_cod
      FROM wallet_transactions
      WHERE shift_id = 55 AND type = 'SETTLE'
    `);
    console.log(`\n📦 COD shipper nộp (wallet_transactions):`);
    console.log(`   ${cod.rows[0].total_cod.toLocaleString('vi-VN')}đ`);
    
    // 3. Hoàn tiền
    const refunds = await pool.query(`
      SELECT COALESCE(SUM(r.amount), 0)::INT AS total_refunds
      FROM order_payment_refund r
      JOIN order_payment p ON p.id = r.payment_id
      JOIN don_hang dh ON dh.id = p.order_id
      WHERE dh.ca_lam_id = 55
    `);
    console.log(`\n↩️ Hoàn tiền:`);
    console.log(`   ${refunds.rows[0].total_refunds.toLocaleString('vi-VN')}đ`);
    
    // 4. Doanh thu
    const revenue = await pool.query(`
      SELECT 
        COALESCE(SUM(settlement.subtotal_after_lines), 0)::INT as gross,
        COALESCE(SUM(settlement.grand_total), 0)::INT as net
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = 55 AND dh.trang_thai = 'PAID'
    `);
    console.log(`\n📊 Doanh thu:`);
    console.log(`   gross (subtotal): ${revenue.rows[0].gross.toLocaleString('vi-VN')}đ`);
    console.log(`   net (grand_total): ${revenue.rows[0].net.toLocaleString('vi-VN')}đ`);
    
    // 5. Kết luận
    const totalCash = cashPayment.rows[0].total_cash + cod.rows[0].total_cod;
    console.log(`\n📈 KẾT QUẢ:`);
    console.log(`   Doanh thu (net): ${revenue.rows[0].net.toLocaleString('vi-VN')}đ`);
    console.log(`   Tiền mặt thu được: ${cashPayment.rows[0].total_cash.toLocaleString('vi-VN')}đ`);
    console.log(`   + COD: ${cod.rows[0].total_cod.toLocaleString('vi-VN')}đ`);
    console.log(`   - Hoàn tiền: ${refunds.rows[0].total_refunds.toLocaleString('vi-VN')}đ`);
    console.log(`   = Tiền mặt thực tế: ${(totalCash - refunds.rows[0].total_refunds).toLocaleString('vi-VN')}đ`);
    
    // 6. Kiểm tra thanh toán của từng đơn
    console.log('\n📋 Chi tiết thanh toán từng đơn:');
    const details = await pool.query(`
      SELECT 
        dh.id,
        dh.order_type,
        settlement.grand_total,
        COALESCE((
          SELECT SUM(p.amount) 
          FROM order_payment p 
          WHERE p.order_id = dh.id AND p.method_code = 'CASH' AND p.status = 'CAPTURED'
        ), 0)::INT as cash_paid
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = 55 AND dh.trang_thai = 'PAID'
      ORDER BY dh.id
    `);
    
    let totalGrandTotal = 0;
    let totalCashPaid = 0;
    details.rows.forEach(d => {
      console.log(`   Đơn #${d.id} (${d.order_type}): grand_total=${d.grand_total}, cash_paid=${d.cash_paid}`);
      totalGrandTotal += parseInt(d.grand_total);
      totalCashPaid += parseInt(d.cash_paid);
    });
    console.log(`\n   TỔNG: grand_total=${totalGrandTotal.toLocaleString('vi-VN')}đ, cash_paid=${totalCashPaid.toLocaleString('vi-VN')}đ`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

debug();
