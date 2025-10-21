// File path: D:\my-thesis\backend\test-views.js
// Script để test các view thống kê mới

const { Pool } = require('pg');

// Cấu hình database
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

    console.log('\n📊 Testing các view thống kê...\n');

    // =========================================================
    // 1. TEST VIEW DOANH THU HÀNG NGÀY
    // =========================================================
    console.log('📈 1. Thống kê doanh thu hàng ngày (7 ngày gần nhất):');
    console.log('=' .repeat(80));
    
    const salesResult = await pool.query(`
      SELECT * FROM v_daily_sales_summary 
      WHERE ngay >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY ngay DESC
      LIMIT 10
    `);
    
    if (salesResult.rows.length > 0) {
      console.table(salesResult.rows);
    } else {
      console.log('❌ Không có dữ liệu doanh thu trong 7 ngày gần nhất');
    }

    // =========================================================
    // 2. TEST VIEW ĐƠN HỦY
    // =========================================================
    console.log('\n📉 2. Thống kê đơn hủy (7 ngày gần nhất):');
    console.log('=' .repeat(80));
    
    const cancelledResult = await pool.query(`
      SELECT * FROM v_cancelled_orders_summary 
      WHERE ngay >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY ngay DESC
      LIMIT 10
    `);
    
    if (cancelledResult.rows.length > 0) {
      console.table(cancelledResult.rows);
    } else {
      console.log('✅ Không có đơn hủy trong 7 ngày gần nhất (tốt!)');
    }

    // =========================================================
    // 3. TEST VIEW CHI TIẾT ĐƠN HỦY
    // =========================================================
    console.log('\n🔍 3. Chi tiết đơn hủy (30 ngày gần nhất):');
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
      WHERE opened_at >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY opened_at DESC
      LIMIT 10
    `);
    
    if (detailResult.rows.length > 0) {
      console.table(detailResult.rows);
    } else {
      console.log('✅ Không có đơn hủy trong 30 ngày gần nhất');
    }

    // =========================================================
    // 4. TEST FUNCTION AUDIT
    // =========================================================
    console.log('\n🔎 4. Test function audit - tìm đơn hủy có lý do:');
    console.log('=' .repeat(80));
    
    const auditResult = await pool.query(`
      SELECT * FROM get_cancelled_orders_by_reason('%')
      ORDER BY opened_at DESC
      LIMIT 5
    `);
    
    if (auditResult.rows.length > 0) {
      console.table(auditResult.rows);
    } else {
      console.log('✅ Không có đơn hủy nào có lý do');
    }

    // =========================================================
    // 5. TEST CẤU TRÚC BẢNG DON_HANG
    // =========================================================
    console.log('\n🏗️  5. Kiểm tra cấu trúc bảng don_hang:');
    console.log('=' .repeat(80));
    
    const structureResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'don_hang' 
        AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.table(structureResult.rows);

    // =========================================================
    // 6. THỐNG KÊ TỔNG QUAN
    // =========================================================
    console.log('\n📊 6. Thống kê tổng quan đơn hàng:');
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

    console.log('\n🎉 Test hoàn tất!');
    console.log('\n💡 Gợi ý sử dụng:');
    console.log('- Chạy migration: node migrate-add-cancel-reason.js');
    console.log('- Test views: node test-views.js');
    console.log('- Xem thống kê realtime: SELECT * FROM v_daily_sales_summary;');

  } catch (error) {
    console.error('❌ Lỗi test:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Chạy test
if (require.main === module) {
  testViews()
    .then(() => {
      console.log('✅ Test thành công!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test thất bại:', error);
      process.exit(1);
    });
}

module.exports = { testViews };
