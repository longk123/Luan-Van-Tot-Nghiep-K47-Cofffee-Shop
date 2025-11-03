// Debug shift #8 calculations to understand discrepancy
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
  const client = await pool.connect();
  const shiftId = 8;
  
  try {
    console.log(`🔍 Debugging calculations for shift #${shiftId}...\n`);
    
    // 1. Get orders from getCurrentShiftOrders (what frontend shows)
    console.log('📋 1. Orders từ getCurrentShiftOrders (hiển thị trong tab "Đơn hàng"):');
    const ordersResult = await client.query(`
      SELECT 
        dh.id,
        dh.trang_thai,
        COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien,
        COUNT(ct.id) AS so_mon
      FROM don_hang dh
      LEFT JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
      WHERE 
        (dh.trang_thai = 'PAID' 
         AND dh.closed_at >= (SELECT started_at FROM ca_lam WHERE id = $1)
         AND dh.closed_at <= (SELECT COALESCE(ended_at, NOW()) FROM ca_lam WHERE id = $1))
        OR
        (dh.trang_thai = 'OPEN'
         AND dh.opened_at <= (SELECT COALESCE(ended_at, NOW()) FROM ca_lam WHERE id = $1))
        OR
        (dh.trang_thai = 'CANCELLED'
         AND dh.closed_at >= (SELECT started_at FROM ca_lam WHERE id = $1)
         AND dh.closed_at <= (SELECT COALESCE(ended_at, NOW()) FROM ca_lam WHERE id = $1))
      GROUP BY dh.id, dh.trang_thai
      ORDER BY dh.id
    `, [shiftId]);
    
    let ordersTotal = 0;
    ordersResult.rows.forEach(order => {
      const tongTien = parseFloat(order.tong_tien);
      ordersTotal += tongTien;
      console.log(`   - Đơn #${order.id}: ${tongTien.toLocaleString('vi-VN')} ₫ (${order.trang_thai})`);
    });
    console.log(`   ➜ Tổng cộng: ${ordersTotal.toLocaleString('vi-VN')} ₫\n`);
    
    // 2. Get orders from fn_aggregate_shift (only PAID orders)
    console.log('💰 2. Orders từ fn_aggregate_shift (chỉ đơn PAID):');
    const aggregateResult = await client.query(`
      SELECT 
        dh.id,
        settlement.subtotal_after_lines,
        settlement.promo_total,
        settlement.manual_discount,
        settlement.grand_total
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = $1 
        AND dh.trang_thai = 'PAID'
      ORDER BY dh.id
    `, [shiftId]);
    
    let grossTotal = 0;
    let discountTotal = 0;
    let netTotal = 0;
    
    aggregateResult.rows.forEach(order => {
      const subtotal = parseFloat(order.subtotal_after_lines || 0);
      const promo = parseFloat(order.promo_total || 0);
      const manual = parseFloat(order.manual_discount || 0);
      const grand = parseFloat(order.grand_total || 0);
      
      grossTotal += subtotal;
      discountTotal += promo + manual;
      netTotal += grand;
      
      console.log(`   - Đơn #${order.id}:`);
      console.log(`     Subtotal: ${subtotal.toLocaleString('vi-VN')} ₫`);
      console.log(`     Promo discount: ${promo.toLocaleString('vi-VN')} ₫`);
      console.log(`     Manual discount: ${manual.toLocaleString('vi-VN')} ₫`);
      console.log(`     Grand total: ${grand.toLocaleString('vi-VN')} ₫`);
    });
    
    console.log(`\n   ➜ Tổng gross (subtotal_after_lines): ${grossTotal.toLocaleString('vi-VN')} ₫`);
    console.log(`   ➜ Tổng discount: ${discountTotal.toLocaleString('vi-VN')} ₫`);
    console.log(`   ➜ Tổng net (grand_total): ${netTotal.toLocaleString('vi-VN')} ₫\n`);
    
    // 3. Get from function
    console.log('📊 3. Từ function fn_aggregate_shift():');
    const functionResult = await client.query(`SELECT fn_aggregate_shift($1) AS result`, [shiftId]);
    const stats = functionResult.rows[0]?.result;
    if (stats) {
      console.log(`   - Total orders: ${stats.total_orders}`);
      console.log(`   - Gross amount: ${stats.gross_amount?.toLocaleString('vi-VN')} ₫`);
      console.log(`   - Discount amount: ${stats.discount_amount?.toLocaleString('vi-VN')} ₫`);
      console.log(`   - Net amount: ${stats.net_amount?.toLocaleString('vi-VN')} ₫\n`);
    }
    
    // 4. Compare
    console.log('📈 4. So sánh:');
    console.log(`   Tab "Đơn hàng" tổng: ${ordersTotal.toLocaleString('vi-VN')} ₫`);
    console.log(`   Function gross: ${stats?.gross_amount?.toLocaleString('vi-VN')} ₫`);
    console.log(`   Function net: ${stats?.net_amount?.toLocaleString('vi-VN')} ₫`);
    console.log(`   Chênh lệch: ${(stats?.gross_amount - ordersTotal).toLocaleString('vi-VN')} ₫\n`);
    
    // 5. Check if there are orders with different status
    console.log('🔎 5. Kiểm tra đơn theo trạng thái:');
    const statusCheck = await client.query(`
      SELECT 
        dh.trang_thai,
        COUNT(*) as count,
        COALESCE(SUM(
          (SELECT SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0))
           FROM don_hang_chi_tiet ct WHERE ct.don_hang_id = dh.id)
        ), 0) as total
      FROM don_hang dh
      WHERE dh.ca_lam_id = $1
      GROUP BY dh.trang_thai
    `, [shiftId]);
    
    statusCheck.rows.forEach(row => {
      console.log(`   - ${row.trang_thai}: ${row.count} đơn, tổng: ${parseFloat(row.total).toLocaleString('vi-VN')} ₫`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

debug();

