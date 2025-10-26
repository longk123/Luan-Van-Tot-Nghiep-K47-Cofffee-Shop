// Test script: verify getCurrentShiftOrders query với logic mới
// Chạy: node test-current-shift-query.cjs

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pos_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres'
});

async function testQuery() {
  try {
    console.log('🔍 Testing getCurrentShiftOrders query...\n');

    // Lấy ca hiện tại đang mở
    const shiftResult = await pool.query(`
      SELECT id, nhan_vien_id, started_at, ended_at, status
      FROM ca_lam
      WHERE status = 'OPEN'
      ORDER BY started_at DESC
      LIMIT 1
    `);

    if (shiftResult.rows.length === 0) {
      console.log('❌ Không có ca nào đang mở. Vui lòng mở ca trước khi test.');
      return;
    }

    const shift = shiftResult.rows[0];
    console.log('✅ Ca hiện tại:', {
      id: shift.id,
      nhan_vien_id: shift.nhan_vien_id,
      started_at: shift.started_at,
      ended_at: shift.ended_at,
      status: shift.status
    });
    console.log('');

    // Query mới - với logic: OPEN hiển thị tất cả đơn chưa thanh toán
    const sql = `
      SELECT 
        dh.id,
        dh.trang_thai,
        dh.opened_at,
        dh.closed_at,
        dh.ca_lam_id AS opened_in_shift,
        CASE 
          WHEN dh.trang_thai = 'PAID' THEN 
            CASE 
              WHEN dh.closed_at >= $2 AND dh.closed_at <= COALESCE($3, NOW()) 
              THEN '✅ Thanh toán trong ca này'
              ELSE '❌ Thanh toán ngoài ca'
            END
          WHEN dh.trang_thai = 'OPEN' THEN 
            CASE 
              WHEN dh.opened_at <= COALESCE($3, NOW()) 
              THEN '✅ Đơn OPEN (hiển thị vì chưa thanh toán)'
              ELSE '❌ Mở sau khi ca kết thúc'
            END
          WHEN dh.trang_thai = 'CANCELLED' THEN
            CASE 
              WHEN dh.closed_at >= $2 AND dh.closed_at <= COALESCE($3, NOW())
              THEN '✅ Hủy trong ca này'
              ELSE '❌ Hủy ngoài ca'
            END
          ELSE '❓ Khác'
        END AS matching_reason
      FROM don_hang dh
      WHERE 
        -- Đơn đã thanh toán: lọc theo closed_at
        (dh.trang_thai = 'PAID' 
         AND dh.closed_at >= $2
         AND dh.closed_at <= COALESCE($3, NOW()))
        OR
        -- Đơn chưa thanh toán: hiển thị TẤT CẢ đơn mở trước hoặc trong ca
        (dh.trang_thai = 'OPEN' 
         AND dh.opened_at <= COALESCE($3, NOW()))
        OR
        -- Đơn đã hủy: lọc theo closed_at
        (dh.trang_thai = 'CANCELLED'
         AND dh.closed_at >= $2
         AND dh.closed_at <= COALESCE($3, NOW()))
      ORDER BY 
        CASE 
          WHEN dh.trang_thai = 'PAID' THEN dh.closed_at
          WHEN dh.trang_thai = 'CANCELLED' THEN dh.closed_at
          ELSE dh.opened_at
        END DESC
      LIMIT 50
    `;

    const result = await pool.query(sql, [
      shift.id,
      shift.started_at,
      shift.ended_at
    ]);

    console.log(`📋 Tìm thấy ${result.rows.length} đơn hàng:\n`);

    result.rows.forEach((order, idx) => {
      console.log(`${idx + 1}. Đơn #${order.id}:`);
      console.log(`   Trạng thái: ${order.trang_thai}`);
      console.log(`   Mở lúc: ${order.opened_at}`);
      console.log(`   Đóng lúc: ${order.closed_at || 'Chưa đóng'}`);
      console.log(`   Ca mở đơn: ${order.opened_in_shift || 'N/A'}`);
      console.log(`   Lý do match: ${order.matching_reason}`);
      console.log('');
    });

    console.log('✅ Test hoàn tất!');

  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testQuery();
