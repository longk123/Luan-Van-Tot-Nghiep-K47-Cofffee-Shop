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
    console.log('🔍 Phân tích chi tiết ca #55\n');
    
    // 1. Lấy tất cả đơn PAID trong ca
    const orders = await pool.query(`
      SELECT 
        dh.id, 
        dh.order_type,
        settlement.subtotal_after_lines,
        settlement.promo_total,
        settlement.manual_discount,
        settlement.grand_total
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = 55 AND dh.trang_thai = 'PAID'
      ORDER BY dh.id
    `);
    
    console.log('📦 Các đơn PAID trong ca #55:');
    let gross = 0, net = 0;
    orders.rows.forEach(row => {
      console.log(`  Đơn #${row.id} (${row.order_type}): subtotal=${row.subtotal_after_lines}, grand_total=${row.grand_total}`);
      gross += parseFloat(row.subtotal_after_lines || 0);
      net += parseFloat(row.grand_total || 0);
    });
    console.log(`\n  → Tổng subtotal (gross): ${gross.toLocaleString('vi-VN')}đ`);
    console.log(`  → Tổng grand_total (net): ${net.toLocaleString('vi-VN')}đ`);
    
    // 2. Kiểm tra đơn DELIVERY
    const delivery = await pool.query(`
      SELECT 
        dh.id,
        di.delivery_fee,
        settlement.subtotal_after_lines,
        settlement.delivery_fee as settlement_fee,
        settlement.grand_total
      FROM don_hang dh
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = 55 
        AND dh.trang_thai = 'PAID'
        AND dh.order_type = 'DELIVERY'
      ORDER BY dh.id
    `);
    
    console.log('\n🚚 Đơn DELIVERY:');
    delivery.rows.forEach(row => {
      console.log(`  Đơn #${row.id}: subtotal=${row.subtotal_after_lines}, delivery_fee=${row.delivery_fee}, grand_total=${row.grand_total}`);
    });
    
    // 3. Kiểm tra fn_aggregate_shift
    const agg = await pool.query(`SELECT fn_aggregate_shift(55) as stats`);
    const stats = agg.rows[0].stats;
    console.log('\n📊 fn_aggregate_shift tính:');
    console.log(`  - gross_amount: ${stats.gross_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - net_amount: ${stats.net_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  - discount_amount: ${stats.discount_amount?.toLocaleString('vi-VN')}đ`);
    
    // 4. Tìm chênh lệch
    console.log('\n🔍 Phân tích:');
    console.log(`  Doanh thu (gross_amount): ${stats.gross_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  Doanh thu thực (net_amount): ${stats.net_amount?.toLocaleString('vi-VN')}đ`);
    console.log(`  Chênh lệch: ${(stats.net_amount - stats.gross_amount)?.toLocaleString('vi-VN')}đ`);
    
    if (stats.net_amount > stats.gross_amount) {
      console.log('\n⚠️ LỖI: net_amount > gross_amount (không hợp lý!)');
      console.log('  Nguyên nhân có thể: delivery_fee được cộng vào grand_total');
      
      // Tính tổng delivery fee
      const feeResult = await pool.query(`
        SELECT COALESCE(SUM(di.delivery_fee), 0)::INT as total_fee
        FROM don_hang dh
        JOIN don_hang_delivery_info di ON di.order_id = dh.id
        WHERE dh.ca_lam_id = 55 AND dh.trang_thai = 'PAID'
      `);
      console.log(`  Tổng delivery_fee: ${feeResult.rows[0].total_fee?.toLocaleString('vi-VN')}đ`);
      
      const expectedNet = stats.gross_amount + feeResult.rows[0].total_fee;
      console.log(`  gross + delivery_fee = ${expectedNet.toLocaleString('vi-VN')}đ`);
      console.log(`  → Khớp với net_amount: ${expectedNet === stats.net_amount}`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

debug();
