// File path: D:\my-thesis\backend\create-views-fixed.js
// Script để tạo các view thống kê (đã sửa tên cột)

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function createViews() {
  try {
    console.log('🔗 Đang kết nối database...');
    
    // Test connection
    const { rows } = await pool.query('SELECT NOW() AS now');
    console.log('✅ Kết nối database thành công:', rows[0].now);

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
        ca.id AS ca_lam_id,
        ca.started_at AS ca_lam_bat_dau
      FROM don_hang o
      LEFT JOIN users u ON u.user_id = o.nhan_vien_id
      LEFT JOIN ca_lam ca ON ca.id = o.ca_lam_id
      WHERE o.trang_thai = 'PAID' 
        AND o.closed_at IS NOT NULL
      GROUP BY DATE(o.closed_at), u.full_name, ca.id, ca.started_at
      ORDER BY ngay DESC, tong_doanh_thu DESC
    `);
    console.log('✅ Đã tạo view v_daily_sales_summary');

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
        ca.id AS ca_lam_id,
        ca.started_at AS ca_lam_bat_dau
      FROM don_hang o
      LEFT JOIN users u ON u.user_id = o.nhan_vien_id
      LEFT JOIN ca_lam ca ON ca.id = o.ca_lam_id
      WHERE o.trang_thai = 'CANCELLED'
      GROUP BY DATE(o.opened_at), u.full_name, ca.id, ca.started_at
      ORDER BY ngay DESC, tong_don_huy DESC
    `);
    console.log('✅ Đã tạo view v_cancelled_orders_summary');

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
        ca.id AS ca_lam_id,
        ca.started_at AS ca_lam_bat_dau,
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
    console.log('✅ Đã tạo view v_cancelled_orders_detail');

    console.log('📝 Kiểm tra các view đã tạo...');
    const viewsResult = await pool.query(`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'v_%'
      ORDER BY table_name
    `);
    
    console.table(viewsResult.rows);
    
    console.log('🎉 Hoàn tất! Các view thống kê đã được tạo');

  } catch (error) {
    console.error('❌ Lỗi:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createViews()
  .then(() => {
    console.log('✅ Thành công!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Thất bại:', error);
    process.exit(1);
  });
