// File path: D:\my-thesis\backend\migrate-add-cancel-reason.js
// Migration script để thêm cột ly_do_huy và các view thống kê

import pkg from 'pg';
const { Pool } = pkg;

// Cấu hình database (có thể thay đổi theo môi trường của bạn)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function migrateDatabase() {
  try {
    console.log('🔗 Đang kết nối database...');
    
    // Test connection
    const { rows } = await pool.query('SELECT NOW() AS now');
    console.log('✅ Kết nối database thành công:', rows[0].now);

    console.log('📝 Bắt đầu migration...');

    // =========================================================
    // 1. THÊM CỘT LY_DO_HUY VÀO BẢNG DON_HANG
    // =========================================================
    console.log('📝 Thêm cột ly_do_huy vào bảng don_hang...');
    await pool.query(`ALTER TABLE don_hang ADD COLUMN IF NOT EXISTS ly_do_huy TEXT NULL`);
    
    // Thêm comment cho cột
    await pool.query(`COMMENT ON COLUMN don_hang.ly_do_huy IS 'Lý do hủy đơn hàng (chỉ có giá trị khi trang_thai = CANCELLED)'`);

    // =========================================================
    // 2. THÊM INDEXES CHO PERFORMANCE
    // =========================================================
    console.log('📝 Thêm indexes cho performance...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_don_hang_status ON don_hang(trang_thai)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_don_hang_opened_at ON don_hang(opened_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_don_hang_closed_at ON don_hang(closed_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_don_hang_cancel_reason ON don_hang(ly_do_huy) WHERE ly_do_huy IS NOT NULL`);

    // =========================================================
    // 3. TẠO VIEW THỐNG KÊ DOANH THU HÀNG NGÀY
    // =========================================================
    console.log('📝 Tạo view thống kê doanh thu hàng ngày...');
    await pool.query(`
      CREATE OR REPLACE VIEW v_daily_sales_summary AS
      SELECT 
        DATE(o.closed_at) AS ngay,
        COUNT(*) AS tong_don_hang,
        SUM(CASE WHEN o.order_type = 'DINE_IN' THEN 1 ELSE 0 END) AS don_tai_ban,
        SUM(CASE WHEN o.order_type = 'TAKEAWAY' THEN 1 ELSE 0 END) AS don_mang_di,
        SUM(
          COALESCE(
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d 
             WHERE d.don_hang_id = o.id), 0
          )
        ) AS tong_doanh_thu,
        SUM(
          COALESCE(
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d 
             WHERE d.don_hang_id = o.id AND o.order_type = 'DINE_IN'), 0
          )
        ) AS doanh_thu_tai_ban,
        SUM(
          COALESCE(
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d 
             WHERE d.don_hang_id = o.id AND o.order_type = 'TAKEAWAY'), 0
          )
        ) AS doanh_thu_mang_di,
        u.full_name AS thu_ngan_chinh,
        ca.ten_ca_lam AS ca_lam_viec
      FROM don_hang o
      LEFT JOIN users u ON u.user_id = o.nhan_vien_id
      LEFT JOIN ca_lam ca ON ca.id = o.ca_lam_id
      WHERE o.trang_thai = 'PAID' 
        AND o.closed_at IS NOT NULL
      GROUP BY DATE(o.closed_at), u.full_name, ca.ten_ca_lam
      ORDER BY ngay DESC, tong_doanh_thu DESC
    `);

    // =========================================================
    // 4. TẠO VIEW THỐNG KÊ ĐƠN HỦY
    // =========================================================
    console.log('📝 Tạo view thống kê đơn hủy...');
    await pool.query(`
      CREATE OR REPLACE VIEW v_cancelled_orders_summary AS
      SELECT 
        DATE(o.opened_at) AS ngay,
        COUNT(*) AS tong_don_huy,
        COUNT(CASE WHEN o.ly_do_huy IS NOT NULL THEN 1 END) AS don_huy_co_ly_do,
        COUNT(CASE WHEN o.ly_do_huy IS NULL THEN 1 END) AS don_huy_khong_ly_do,
        STRING_AGG(DISTINCT o.ly_do_huy, ', ') AS cac_ly_do_huy,
        u.full_name AS thu_ngan,
        ca.ten_ca_lam AS ca_lam_viec
      FROM don_hang o
      LEFT JOIN users u ON u.user_id = o.nhan_vien_id
      LEFT JOIN ca_lam ca ON ca.id = o.ca_lam_id
      WHERE o.trang_thai = 'CANCELLED'
      GROUP BY DATE(o.opened_at), u.full_name, ca.ten_ca_lam
      ORDER BY ngay DESC, tong_don_huy DESC
    `);

    // =========================================================
    // 5. TẠO VIEW CHI TIẾT ĐƠN HỦY
    // =========================================================
    console.log('📝 Tạo view chi tiết đơn hủy...');
    await pool.query(`
      CREATE OR REPLACE VIEW v_cancelled_orders_detail AS
      SELECT 
        o.id AS don_hang_id,
        o.ban_id,
        CASE 
          WHEN o.order_type = 'TAKEAWAY' THEN 'Mang đi'
          WHEN o.ban_id IS NOT NULL THEN CONCAT('Bàn ', o.ban_id)
          ELSE 'Không xác định'
        END AS ten_ban,
        o.order_type,
        o.opened_at,
        o.closed_at,
        o.ly_do_huy,
        u.full_name AS thu_ngan,
        ca.ten_ca_lam AS ca_lam_viec,
        COALESCE(
          (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
           FROM don_hang_chi_tiet d 
           WHERE d.don_hang_id = o.id), 0
        ) AS tong_tien_huy
      FROM don_hang o
      LEFT JOIN users u ON u.user_id = o.nhan_vien_id
      LEFT JOIN ca_lam ca ON ca.id = o.ca_lam_id
      WHERE o.trang_thai = 'CANCELLED'
      ORDER BY o.opened_at DESC
    `);

    // =========================================================
    // 6. TẠO FUNCTION HELPER CHO AUDIT
    // =========================================================
    console.log('📝 Tạo function helper cho audit...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION get_cancelled_orders_by_reason(reason_pattern TEXT DEFAULT '%')
      RETURNS TABLE (
        don_hang_id INTEGER,
        ly_do_huy TEXT,
        opened_at TIMESTAMPTZ,
        thu_ngan TEXT,
        tong_tien_huy NUMERIC
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          o.id,
          o.ly_do_huy,
          o.opened_at,
          u.full_name,
          COALESCE(
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d 
             WHERE d.don_hang_id = o.id), 0
          )
        FROM don_hang o
        LEFT JOIN users u ON u.user_id = o.nhan_vien_id
        WHERE o.trang_thai = 'CANCELLED'
          AND o.ly_do_huy ILIKE reason_pattern
        ORDER BY o.opened_at DESC;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('🎉 Migration hoàn tất!');
    console.log('\n📋 Các thay đổi đã thực hiện:');
    console.log('✅ Thêm cột ly_do_huy vào bảng don_hang');
    console.log('✅ Thêm indexes cho performance');
    console.log('✅ Tạo view v_daily_sales_summary (thống kê doanh thu)');
    console.log('✅ Tạo view v_cancelled_orders_summary (thống kê đơn hủy)');
    console.log('✅ Tạo view v_cancelled_orders_detail (chi tiết đơn hủy)');
    console.log('✅ Tạo function get_cancelled_orders_by_reason() (audit helper)');

    console.log('\n📊 Cách sử dụng các view mới:');
    console.log('-- Xem thống kê doanh thu hàng ngày:');
    console.log('SELECT * FROM v_daily_sales_summary WHERE ngay >= CURRENT_DATE - INTERVAL \'7 days\';');
    console.log('');
    console.log('-- Xem thống kê đơn hủy:');
    console.log('SELECT * FROM v_cancelled_orders_summary WHERE ngay >= CURRENT_DATE - INTERVAL \'7 days\';');
    console.log('');
    console.log('-- Xem chi tiết đơn hủy:');
    console.log('SELECT * FROM v_cancelled_orders_detail WHERE opened_at >= CURRENT_DATE - INTERVAL \'7 days\';');
    console.log('');
    console.log('-- Tìm đơn hủy theo lý do:');
    console.log('SELECT * FROM get_cancelled_orders_by_reason(\'%khách%\'));');

  } catch (error) {
    console.error('❌ Lỗi migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Chạy migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateDatabase()
    .then(() => {
      console.log('✅ Migration thành công!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration thất bại:', error);
      process.exit(1);
    });
}

export { migrateDatabase };
