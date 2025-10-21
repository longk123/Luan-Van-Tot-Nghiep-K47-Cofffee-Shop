// File path: D:\my-thesis\backend\test-new-views.js
// Script để test các view thống kê mới

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function testViews() {
  try {
    console.log('🔗 Đang kết nối database...');
    
    // Test connection
    const { rows } = await pool.query('SELECT NOW() AS now');
    console.log('✅ Kết nối database thành công:', rows[0].now);

    console.log('\n📊 Testing các view thống kê mới...\n');

    // =========================================================
    // 1. TEST VIEW DOANH THU HÀNG NGÀY
    // =========================================================
    console.log('📈 1. Thống kê doanh thu hàng ngày:');
    console.log('=' .repeat(80));
    
    const salesResult = await pool.query(`
      SELECT * FROM v_daily_sales_summary 
      ORDER BY ngay DESC
      LIMIT 5
    `);
    
    if (salesResult.rows.length > 0) {
      console.table(salesResult.rows);
    } else {
      console.log('❌ Không có dữ liệu doanh thu');
    }

    // =========================================================
    // 2. TEST VIEW ĐƠN HỦY
    // =========================================================
    console.log('\n📉 2. Thống kê đơn hủy:');
    console.log('=' .repeat(80));
    
    const cancelledResult = await pool.query(`
      SELECT * FROM v_cancelled_orders_summary 
      ORDER BY ngay DESC
      LIMIT 5
    `);
    
    if (cancelledResult.rows.length > 0) {
      console.table(cancelledResult.rows);
    } else {
      console.log('✅ Không có đơn hủy (tốt!)');
    }

    // =========================================================
    // 3. TEST VIEW CHI TIẾT ĐƠN HỦY
    // =========================================================
    console.log('\n🔍 3. Chi tiết đơn hủy:');
    console.log('=' .repeat(80));
    
    const detailResult = await pool.query(`
      SELECT 
        don_hang_id,
        ten_ban,
        order_type,
        opened_at,
        ly_do_huy,
        thu_ngan,
        tong_tien_huy
      FROM v_cancelled_orders_detail 
      ORDER BY opened_at DESC
      LIMIT 5
    `);
    
    if (detailResult.rows.length > 0) {
      console.table(detailResult.rows);
    } else {
      console.log('✅ Không có đơn hủy');
    }

    // =========================================================
    // 4. THỐNG KÊ TỔNG QUAN ĐƠN HÀNG
    // =========================================================
    console.log('\n📊 4. Thống kê tổng quan đơn hàng:');
    console.log('=' .repeat(80));
    
    const overviewResult = await pool.query(`
      SELECT 
        trang_thai,
        COUNT(*) as so_luong,
        COUNT(CASE WHEN ly_do_huy IS NOT NULL THEN 1 END) as co_ly_do_huy,
        COUNT(CASE WHEN ly_do_huy IS NULL THEN 1 END) as khong_ly_do_huy
      FROM don_hang 
      GROUP BY trang_thai
      ORDER BY so_luong DESC
    `);
    
    console.table(overviewResult.rows);

    // =========================================================
    // 5. KIỂM TRA CỘT LY_DO_HUY
    // =========================================================
    console.log('\n🔍 5. Kiểm tra cột ly_do_huy trong bảng don_hang:');
    console.log('=' .repeat(80));
    
    const columnCheck = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'don_hang' 
        AND column_name = 'ly_do_huy'
    `);
    
    console.table(columnCheck.rows);

    console.log('\n🎉 Test hoàn tất!');
    console.log('\n💡 Bây giờ bạn có thể:');
    console.log('✅ Thấy cột ly_do_huy trong DBeaver');
    console.log('✅ Sử dụng các view thống kê mới');
    console.log('✅ Audit đơn hủy với lý do chi tiết');
    console.log('✅ Thống kê doanh thu theo ngày');

    console.log('\n📋 Các query mẫu để sử dụng:');
    console.log('-- Xem thống kê doanh thu:');
    console.log('SELECT * FROM v_daily_sales_summary WHERE ngay >= CURRENT_DATE - INTERVAL \'7 days\';');
    console.log('');
    console.log('-- Xem thống kê đơn hủy:');
    console.log('SELECT * FROM v_cancelled_orders_summary WHERE ngay >= CURRENT_DATE - INTERVAL \'7 days\';');
    console.log('');
    console.log('-- Xem chi tiết đơn hủy:');
    console.log('SELECT * FROM v_cancelled_orders_detail WHERE opened_at >= CURRENT_DATE - INTERVAL \'7 days\';');

  } catch (error) {
    console.error('❌ Lỗi test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

testViews()
  .then(() => {
    console.log('✅ Test thành công!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test thất bại:', error);
    process.exit(1);
  });
