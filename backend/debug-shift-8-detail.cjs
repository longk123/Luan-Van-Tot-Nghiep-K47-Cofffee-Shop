// Debug chi tiết shift #8 để tìm sự khác biệt giữa tab "Đơn hàng" và "Tổng quan"
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
    console.log(`🔍 Debugging shift #${shiftId} - So sánh tab "Đơn hàng" vs "Tổng quan"\n`);
    
    // 1. Lấy thông tin ca
    const shiftInfo = await client.query(`SELECT * FROM ca_lam WHERE id = $1`, [shiftId]);
    const shift = shiftInfo.rows[0];
    if (!shift) {
      console.log('❌ Không tìm thấy ca #8');
      return;
    }
    
    console.log(`📋 Ca #8: ${shift.started_at} → ${shift.ended_at || 'Chưa đóng'}`);
    console.log(`   Status: ${shift.status}\n`);
    
    // 2. Query giống tab "Đơn hàng" (getCurrentShiftOrders)
    console.log('📊 1. TAB "ĐƠN HÀNG" - Query từ getCurrentShiftOrders():');
    console.log('   (Hiển thị: Tổng tiền = subtotal_after_lines)\n');
    
    const ordersTabQuery = await client.query(`
      SELECT 
        dh.id,
        dh.trang_thai,
        dh.opened_at,
        dh.closed_at,
        COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien,
        COUNT(ct.id) AS so_mon
      FROM don_hang dh
      LEFT JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
      WHERE 
        (dh.trang_thai = 'PAID' 
         AND dh.closed_at >= $1
         AND dh.closed_at <= $2)
        OR
        (dh.trang_thai = 'OPEN'
         AND dh.opened_at <= $2)
        OR
        (dh.trang_thai = 'CANCELLED'
         AND dh.closed_at >= $1
         AND dh.closed_at <= $2)
      GROUP BY dh.id, dh.trang_thai, dh.opened_at, dh.closed_at
      ORDER BY dh.id
    `, [shift.started_at, shift.ended_at || 'NOW()']);
    
    let ordersTabTotal = 0;
    ordersTabQuery.rows.forEach(order => {
      const tongTien = parseFloat(order.tong_tien);
      ordersTabTotal += tongTien;
      console.log(`   - Đơn #${order.id}: ${tongTien.toLocaleString('vi-VN')} ₫ (${order.trang_thai}) - ${order.so_mon} món`);
    });
    console.log(`   ➜ Tổng tab "Đơn hàng": ${ordersTabTotal.toLocaleString('vi-VN')} ₫\n`);
    
    // 3. Query giống tab "Tổng quan" (fn_aggregate_shift) - chỉ đơn PAID thuộc ca
    console.log('💰 2. TAB "TỔNG QUAN" - Query từ fn_aggregate_shift():');
    console.log('   (Chỉ tính đơn PAID có ca_lam_id = shift_id)\n');
    
    const overviewQuery = await client.query(`
      SELECT 
        dh.id,
        dh.trang_thai,
        dh.ca_lam_id,
        settlement.subtotal_after_lines AS gross,
        settlement.promo_total,
        settlement.manual_discount,
        settlement.grand_total AS net
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.ca_lam_id = $1 
        AND dh.trang_thai = 'PAID'
      ORDER BY dh.id
    `, [shiftId]);
    
    let grossTotal = 0;
    let discountTotal = 0;
    let netTotal = 0;
    
    overviewQuery.rows.forEach(order => {
      const gross = parseFloat(order.gross || 0);
      const promo = parseFloat(order.promo_total || 0);
      const manual = parseFloat(order.manual_discount || 0);
      const net = parseFloat(order.net || 0);
      
      grossTotal += gross;
      discountTotal += promo + manual;
      netTotal += net;
      
      console.log(`   - Đơn #${order.id}:`);
      console.log(`     Gross (subtotal_after_lines): ${gross.toLocaleString('vi-VN')} ₫`);
      console.log(`     Promo: ${promo.toLocaleString('vi-VN')} ₫`);
      console.log(`     Manual: ${manual.toLocaleString('vi-VN')} ₫`);
      console.log(`     Net (grand_total): ${net.toLocaleString('vi-VN')} ₫`);
    });
    
    console.log(`\n   ➜ Tổng Gross: ${grossTotal.toLocaleString('vi-VN')} ₫`);
    console.log(`   ➜ Tổng Discount: ${discountTotal.toLocaleString('vi-VN')} ₫`);
    console.log(`   ➜ Tổng Net: ${netTotal.toLocaleString('vi-VN')} ₫\n`);
    
    // 4. So sánh
    console.log('📈 3. SO SÁNH:');
    console.log(`   Tab "Đơn hàng" tổng: ${ordersTabTotal.toLocaleString('vi-VN')} ₫`);
    console.log(`   Tab "Tổng quan" Gross: ${grossTotal.toLocaleString('vi-VN')} ₫`);
    console.log(`   Tab "Tổng quan" Net: ${netTotal.toLocaleString('vi-VN')} ₫`);
    console.log(`   Chênh lệch Gross: ${(grossTotal - ordersTabTotal).toLocaleString('vi-VN')} ₫`);
    console.log(`   Chênh lệch Net: ${(netTotal - ordersTabTotal).toLocaleString('vi-VN')} ₫\n`);
    
    // 5. Kiểm tra đơn theo ca_lam_id
    console.log('🔎 4. KIỂM TRA ĐƠN THEO ca_lam_id:');
    const caLamQuery = await client.query(`
      SELECT 
        id,
        trang_thai,
        ca_lam_id,
        opened_at,
        closed_at
      FROM don_hang
      WHERE ca_lam_id = $1
      ORDER BY id
    `, [shiftId]);
    
    console.log(`   Có ${caLamQuery.rows.length} đơn thuộc ca_lam_id = ${shiftId}:`);
    caLamQuery.rows.forEach(order => {
      console.log(`   - Đơn #${order.id}: ${order.trang_thai}, opened: ${order.opened_at}, closed: ${order.closed_at}`);
    });
    console.log('');
    
    // 6. Kiểm tra đơn theo thời gian (như tab "Đơn hàng")
    console.log('🔎 5. KIỂM TRA ĐƠN THEO THỜI GIAN (như tab "Đơn hàng"):');
    const timeQuery = await client.query(`
      SELECT 
        id,
        trang_thai,
        ca_lam_id,
        opened_at,
        closed_at
      FROM don_hang
      WHERE (
        (trang_thai = 'PAID' 
         AND closed_at >= $1
         AND closed_at <= $2)
        OR
        (trang_thai = 'OPEN'
         AND opened_at <= $2)
        OR
        (trang_thai = 'CANCELLED'
         AND closed_at >= $1
         AND closed_at <= $2)
      )
      ORDER BY id
    `, [shift.started_at, shift.ended_at || 'NOW()']);
    
    console.log(`   Có ${timeQuery.rows.length} đơn trong khoảng thời gian ca:`);
    timeQuery.rows.forEach(order => {
      console.log(`   - Đơn #${order.id}: ${order.trang_thai}, ca_lam_id: ${order.ca_lam_id}, opened: ${order.opened_at}, closed: ${order.closed_at}`);
    });
    console.log('');
    
    // 7. Kiểm tra chi tiết settlement cho từng đơn
    console.log('📊 6. CHI TIẾT SETTLEMENT CHO TỪNG ĐƠN:');
    const allOrders = [...new Set([...caLamQuery.rows.map(o => o.id), ...timeQuery.rows.map(o => o.id)])];
    
    for (const orderId of allOrders.sort()) {
      const settlement = await client.query(`
        SELECT * FROM v_order_settlement WHERE order_id = $1
      `, [orderId]);
      
      if (settlement.rows.length > 0) {
        const s = settlement.rows[0];
        console.log(`   Đơn #${orderId}:`);
        console.log(`     subtotal_after_lines: ${parseFloat(s.subtotal_after_lines || 0).toLocaleString('vi-VN')} ₫`);
        console.log(`     promo_total: ${parseFloat(s.promo_total || 0).toLocaleString('vi-VN')} ₫`);
        console.log(`     manual_discount: ${parseFloat(s.manual_discount || 0).toLocaleString('vi-VN')} ₫`);
        console.log(`     grand_total: ${parseFloat(s.grand_total || 0).toLocaleString('vi-VN')} ₫`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

debug();

