// Check orders on Oct 25
import { pool } from './src/db.js';

async function checkOrders() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id, 
        trang_thai, 
        order_type,
        opened_at,
        closed_at,
        to_char((opened_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:MI:SS') AS opened_at_vn,
        to_char((closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD HH24:MI:SS') AS closed_at_vn,
        (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
         FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id) AS revenue
      FROM don_hang o
      WHERE o.id IN (227, 224, 223, 222, 221, 220, 219, 216, 214, 211, 208, 199)
      ORDER BY o.id
    `);
    
    console.log('📋 Đơn hàng ngày 25/10:');
    console.log('='.repeat(120));
    console.log('ID  | Trạng thái | Opened At (VN)      | Closed At (VN)      | Revenue');
    console.log('-'.repeat(120));
    
    rows.forEach(r => {
      console.log(
        `#${r.id.toString().padEnd(3)} | ${r.trang_thai.padEnd(10)} | ${r.opened_at_vn || 'NULL'.padEnd(19)} | ${r.closed_at_vn || 'NULL'.padEnd(19)} | ${(r.revenue?.toLocaleString() || '0').padStart(10)} đ`
      );
    });
    
    console.log('='.repeat(120));
    
    // Test query với date 2025-10-25
    const testDate = '2025-10-25';
    const { rows: testRows } = await pool.query(`
      SELECT 
        COUNT(*) AS paid_orders,
        COALESCE(SUM(
          (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
           FROM don_hang_chi_tiet d WHERE d.don_hang_id = o.id)
        ), 0) AS today_revenue
      FROM don_hang o
      WHERE o.trang_thai = 'PAID'
        AND o.closed_at IS NOT NULL
        AND to_char((o.closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh'), 'YYYY-MM-DD') = $1
    `, [testDate]);
    
    console.log('\n📊 Test query cho ngày', testDate);
    console.log('Đơn PAID:', testRows[0].paid_orders);
    console.log('Doanh thu:', testRows[0].today_revenue?.toLocaleString(), 'đ');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkOrders();

