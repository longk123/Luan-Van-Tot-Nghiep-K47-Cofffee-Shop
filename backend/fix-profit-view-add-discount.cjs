const { Client } = require('pg');

async function addDiscountToProfit() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'coffee_shop',
    user: 'postgres',
    password: '123456',
  });

  try {
    await client.connect();
    console.log('✅ Đã kết nối PostgreSQL\n');

    console.log('🔄 Cập nhật view v_profit_with_topping_cost để thêm thông tin giảm giá...\n');

    // Drop view trước
    await client.query(`DROP VIEW IF EXISTS v_profit_with_topping_cost CASCADE`);
    console.log('✅ Đã drop view cũ\n');

    await client.query(`
      CREATE OR REPLACE VIEW v_profit_with_topping_cost AS
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

    console.log('✅ Đã cập nhật view v_profit_with_topping_cost với thông tin giảm giá\n');

    // Test
    console.log('🔍 Test view với 5 đơn hàng gần nhất:\n');
    const test = await client.query(`
      SELECT 
        order_id,
        TO_CHAR(closed_at, 'DD/MM/YYYY HH24:MI') as thoi_gian,
        doanh_thu_goc,
        tong_giam_gia,
        doanh_thu,
        tong_gia_von,
        loi_nhuan,
        ROUND(loi_nhuan::NUMERIC / NULLIF(doanh_thu, 0) * 100, 1) as margin_percent
      FROM v_profit_with_topping_cost
      ORDER BY closed_at DESC
      LIMIT 5
    `);

    console.table(test.rows);

  } catch (err) {
    console.error('❌ Lỗi:', err);
    throw err;
  } finally {
    await client.end();
    console.log('\n✅ Đã đóng kết nối PostgreSQL');
  }
}

addDiscountToProfit();
