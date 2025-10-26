/**
 * Test script: Kiểm tra xem đơn hàng CANCELLED có hiển thị trong lịch sử ca hiện tại không
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'coffee_shop',
});

async function testCancelledOrders() {
  try {
    console.log('🔍 Kiểm tra đơn hàng CANCELLED trong lịch sử ca...\n');
    
    // 1. Lấy ca hiện tại
    const shiftResult = await pool.query(`
      SELECT id, started_at, ended_at, status, shift_type
      FROM ca_lam
      ORDER BY started_at DESC
      LIMIT 1
    `);
    
    if (shiftResult.rows.length === 0) {
      console.log('❌ Không tìm thấy ca làm việc nào');
      return;
    }
    
    const shift = shiftResult.rows[0];
    console.log('📅 Ca hiện tại:');
    console.log(`   ID: ${shift.id}`);
    console.log(`   Loại ca: ${shift.shift_type || 'N/A'}`);
    console.log(`   Bắt đầu: ${shift.started_at}`);
    console.log(`   Kết thúc: ${shift.ended_at || 'Đang mở'}`);
    console.log(`   Trạng thái: ${shift.status}\n`);
    
    // 2. Kiểm tra các đơn CANCELLED trong khoảng thời gian ca
    console.log('🔍 Tìm đơn CANCELLED trong khoảng thời gian ca...');
    const cancelledResult = await pool.query(`
      SELECT 
        id,
        ban_id,
        order_type,
        opened_at,
        closed_at,
        ly_do_huy,
        CASE 
          WHEN closed_at >= $1 AND closed_at <= COALESCE($2, NOW())
          THEN '✅ Trong ca'
          ELSE '❌ Ngoài ca'
        END AS trong_ca
      FROM don_hang
      WHERE trang_thai = 'CANCELLED'
      ORDER BY closed_at DESC
      LIMIT 10
    `, [shift.started_at, shift.ended_at]);
    
    if (cancelledResult.rows.length === 0) {
      console.log('❌ Không tìm thấy đơn CANCELLED nào\n');
    } else {
      console.log(`✅ Tìm thấy ${cancelledResult.rows.length} đơn CANCELLED:\n`);
      cancelledResult.rows.forEach((order, idx) => {
        console.log(`${idx + 1}. Đơn #${order.id}:`);
        console.log(`   Loại: ${order.order_type}`);
        console.log(`   Mở: ${order.opened_at}`);
        console.log(`   Hủy: ${order.closed_at}`);
        console.log(`   Lý do: ${order.ly_do_huy || '(Không có)'}`);
        console.log(`   ${order.trong_ca}\n`);
      });
    }
    
    // 3. Lấy đơn hàng theo query của repository (giống với API)
    console.log('🔍 Lấy đơn hàng theo query API getCurrentShiftOrders...');
    const apiResult = await pool.query(`
      SELECT 
        dh.id,
        dh.ban_id,
        dh.order_type,
        dh.trang_thai,
        dh.opened_at,
        dh.closed_at,
        dh.ly_do_huy,
        b.ten_ban,
        kv.ten AS khu_vuc_ten,
        u.full_name AS nhan_vien_ten,
        COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0) AS tong_tien,
        COUNT(ct.id) AS so_mon,
        CASE 
          WHEN dh.trang_thai = 'PAID' THEN 'Đã thanh toán'
          WHEN dh.trang_thai = 'CANCELLED' THEN 'Đã hủy'
          ELSE 'Chưa thanh toán'
        END AS trang_thai_thanh_toan
      FROM don_hang dh
      LEFT JOIN ban b ON b.id = dh.ban_id
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      LEFT JOIN users u ON u.user_id = dh.nhan_vien_id
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
      GROUP BY dh.id, dh.ban_id, dh.order_type, dh.trang_thai, dh.opened_at, 
               dh.closed_at, dh.ly_do_huy, b.ten_ban, kv.ten, u.full_name
      ORDER BY 
        CASE 
          WHEN dh.trang_thai = 'PAID' THEN dh.closed_at
          WHEN dh.trang_thai = 'CANCELLED' THEN dh.closed_at
          ELSE dh.opened_at
        END DESC
    `, [shift.id]);
    
    const cancelledInApi = apiResult.rows.filter(o => o.trang_thai === 'CANCELLED');
    
    console.log(`\n📊 Kết quả query API:`);
    console.log(`   Tổng đơn: ${apiResult.rows.length}`);
    console.log(`   - Đã thanh toán (PAID): ${apiResult.rows.filter(o => o.trang_thai === 'PAID').length}`);
    console.log(`   - Chưa thanh toán (OPEN): ${apiResult.rows.filter(o => o.trang_thai === 'OPEN').length}`);
    console.log(`   - Đã hủy (CANCELLED): ${cancelledInApi.length}\n`);
    
    if (cancelledInApi.length > 0) {
      console.log('✅ Đơn CANCELLED trong kết quả API:');
      cancelledInApi.forEach((order, idx) => {
        console.log(`${idx + 1}. Đơn #${order.id}:`);
        console.log(`   Loại: ${order.order_type}`);
        console.log(`   Mở: ${order.opened_at}`);
        console.log(`   Hủy: ${order.closed_at}`);
        console.log(`   Lý do: ${order.ly_do_huy || '(Không có)'}`);
        console.log(`   Tổng tiền: ${order.tong_tien}đ\n`);
      });
    } else {
      console.log('❌ KHÔNG có đơn CANCELLED nào trong kết quả API');
    }
    
    console.log('\n✅ Test hoàn tất!');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

testCancelledOrders();
