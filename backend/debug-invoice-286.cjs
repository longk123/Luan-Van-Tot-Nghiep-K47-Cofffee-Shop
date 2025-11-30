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
    console.log('🔍 Kiểm tra đơn #286\n');
    
    // 1. Kiểm tra đơn hàng
    const order = await pool.query(`
      SELECT id, nhan_vien_id, ca_lam_id, opened_at, closed_at
      FROM don_hang 
      WHERE id = 286
    `);
    console.log('📦 Đơn hàng:');
    console.log(order.rows[0]);
    
    // 2. Kiểm tra người tạo đơn
    const creator = await pool.query(`
      SELECT u.user_id, u.full_name, u.username
      FROM users u
      JOIN don_hang dh ON dh.nhan_vien_id = u.user_id
      WHERE dh.id = 286
    `);
    console.log('\n👤 Người tạo đơn (từ don_hang.nhan_vien_id):');
    console.log(creator.rows[0]);
    
    // 3. Kiểm tra payment
    const payment = await pool.query(`
      SELECT p.id, p.created_by, u.full_name, u.username
      FROM order_payment p
      LEFT JOIN users u ON u.user_id = p.created_by
      WHERE p.order_id = 286
      ORDER BY p.id
      LIMIT 1
    `);
    console.log('\n💳 Người thanh toán (từ order_payment.created_by):');
    console.log(payment.rows[0] || 'Chưa thanh toán');
    
    // 4. Kiểm tra view v_invoice_header
    const invoice = await pool.query(`
      SELECT nguoi_tao_don, thu_ngan, nguoi_tao_don_username, thu_ngan_username
      FROM v_invoice_header
      WHERE order_id = 286
    `);
    console.log('\n📄 Hóa đơn (từ v_invoice_header):');
    console.log(invoice.rows[0]);
    
    // 5. Kiểm tra ca #55
    console.log('\n\n🔍 Kiểm tra ca #55\n');
    const shift = await pool.query(`
      SELECT id, nhan_vien_id, started_at, net_amount, total_orders
      FROM ca_lam
      WHERE id = 55
    `);
    console.log('📊 Ca làm việc:');
    console.log(shift.rows[0]);
    
    // 6. Tính doanh thu từ fn_aggregate_shift
    const agg = await pool.query(`SELECT fn_aggregate_shift(55) as stats`);
    console.log('\n💰 Doanh thu tính được (fn_aggregate_shift):');
    console.log(`  - net_amount: ${agg.rows[0].stats.net_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - total_orders: ${agg.rows[0].stats.total_orders}`);
    
    // 7. Tính tổng doanh thu của tất cả đơn PAID trong ca (từ chi tiết đơn hàng)
    const manual = await pool.query(`
      SELECT 
        COUNT(DISTINCT dh.id) as total_orders,
        COALESCE(SUM(
          (SELECT SUM((don_gia - COALESCE(giam_gia, 0)) * so_luong)
           FROM don_hang_chi_tiet ct
           WHERE ct.don_hang_id = dh.id)
        ), 0) as total_revenue
      FROM don_hang dh
      WHERE dh.ca_lam_id = 55
        AND dh.trang_thai = 'PAID'
    `);
    console.log('\n💵 Doanh thu thực tế (từ grand_total):');
    console.log(`  - total_revenue: ${parseInt(manual.rows[0].total_revenue).toLocaleString('vi-VN')}đ`);
    console.log(`  - total_orders: ${manual.rows[0].total_orders}`);
    
    const diff = parseInt(manual.rows[0].total_revenue) - agg.rows[0].stats.net_amount;
    console.log(`\n❌ Chênh lệch: ${diff.toLocaleString('vi-VN')}đ`);
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

debug();
