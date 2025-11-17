const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD)
});

async function createProfitView() {
  try {
    console.log('🔄 Đang tạo view v_profit_with_topping_cost...\n');

    // Drop view cũ nếu có
    await pool.query(`DROP VIEW IF EXISTS v_profit_with_topping_cost CASCADE`);
    console.log('✅ Đã xóa view cũ (nếu có)\n');

    // Tạo view mới với đầy đủ thông tin giảm giá
    await pool.query(`
      CREATE VIEW v_profit_with_topping_cost AS
      SELECT 
        dh.id AS order_id,
        dh.trang_thai,
        dh.opened_at,
        dh.closed_at,
        -- Doanh thu (trước giảm giá)
        COALESCE(omt.subtotal_before_lines, 0) AS doanh_thu_goc,
        -- Giảm giá từ line items
        COALESCE(omt.line_discounts_total, 0) AS giam_gia_line,
        -- Giảm giá từ khuyến mãi
        COALESCE(omt.promo_total, 0) AS giam_gia_khuyen_mai,
        -- Giảm giá thủ công
        COALESCE(omt.manual_discount, 0) AS giam_gia_thu_cong,
        -- Tổng giảm giá
        (COALESCE(omt.line_discounts_total, 0) + 
         COALESCE(omt.promo_total, 0) + 
         COALESCE(omt.manual_discount, 0))::INTEGER AS tong_giam_gia,
        -- Doanh thu thực tế (sau giảm giá) = grand_total
        COALESCE(omt.grand_total, 0) AS doanh_thu,
        -- Giá vốn món (không bao gồm topping)
        COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0)::INTEGER AS gia_von_mon,
        -- Giá vốn topping
        COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0)::INTEGER AS gia_von_topping,
        -- Tổng giá vốn
        (COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0) + 
         COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0))::INTEGER AS tong_gia_von,
        -- Lợi nhuận = doanh thu thực tế - tổng giá vốn
        (COALESCE(omt.grand_total, 0) - 
         COALESCE(SUM(dhct.gia_von_thuc_te * dhct.so_luong), 0) -
         COALESCE(SUM(vtc.tong_gia_von_topping * dhct.so_luong), 0))::INTEGER AS loi_nhuan
      FROM don_hang dh
      LEFT JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
      LEFT JOIN v_line_topping_cost vtc ON vtc.line_id = dhct.id
      LEFT JOIN v_order_money_totals omt ON omt.order_id = dh.id
      WHERE dh.trang_thai = 'PAID'
      GROUP BY dh.id, dh.trang_thai, dh.opened_at, dh.closed_at, 
               omt.grand_total, omt.subtotal_before_lines, 
               omt.line_discounts_total, omt.promo_total, omt.manual_discount;
    `);

    console.log('✅ Đã tạo view v_profit_with_topping_cost thành công!\n');

    // Kiểm tra view
    const test = await pool.query(`
      SELECT COUNT(*) as count
      FROM v_profit_with_topping_cost
    `);

    console.log(`📊 View có ${test.rows[0].count} đơn hàng\n`);

  } catch (error) {
    console.error('❌ Lỗi khi tạo view:', error.message);
    console.error(error);
    throw error;
  } finally {
    await pool.end();
    console.log('✅ Đã đóng kết nối database');
  }
}

createProfitView();

