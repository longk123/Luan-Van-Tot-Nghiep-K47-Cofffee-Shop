// Test query với date 2025-10-25 sau khi sửa
import { pool } from './src/db.js';

async function testFixed() {
  try {
    const testDate = '2025-10-25';
    
    console.log('🔍 Testing fixed query for date:', testDate);
    console.log('='.repeat(80));
    
    const { rows } = await pool.query(`
      SELECT 
        COUNT(*) AS paid_orders,
        COALESCE(SUM(
          (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
           FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
        ), 0) AS today_revenue
      FROM don_hang o
      WHERE o.trang_thai = 'PAID'
        AND o.closed_at IS NOT NULL
        AND to_char(o.closed_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') = $1
    `, [testDate]);
    
    console.log('📊 Kết quả:');
    console.log('Đơn PAID:', rows[0].paid_orders);
    console.log('Doanh thu:', rows[0].today_revenue?.toLocaleString(), 'đ');
    console.log('='.repeat(80));
    
    // List chi tiết các đơn
    const { rows: details } = await pool.query(`
      SELECT 
        id,
        trang_thai,
        order_type,
        to_char(closed_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS') AS closed_at_vn,
        (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS revenue
      FROM don_hang o
      WHERE o.trang_thai = 'PAID'
        AND o.closed_at IS NOT NULL
        AND to_char(o.closed_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') = $1
      ORDER BY o.closed_at
    `, [testDate]);
    
    console.log('\n📋 Chi tiết các đơn PAID:');
    console.log('-'.repeat(80));
    details.forEach((order, idx) => {
      console.log(`${idx + 1}. Đơn #${order.id} - ${order.order_type} - ${order.closed_at_vn} - ${order.revenue?.toLocaleString()} đ`);
    });
    console.log('-'.repeat(80));
    console.log('Tổng:', details.reduce((sum, o) => sum + parseFloat(o.revenue || 0), 0).toLocaleString(), 'đ');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testFixed();

