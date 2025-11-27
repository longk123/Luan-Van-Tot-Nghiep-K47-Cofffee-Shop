// Fix v_order_money_totals: Thêm delivery_fee vào grand_total cho đơn DELIVERY
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function fix() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing v_order_money_totals to include delivery_fee...\n');
    
    await client.query('BEGIN');
    
    // Drop và recreate view v_order_money_totals với delivery_fee
    await client.query(`DROP VIEW IF EXISTS v_order_settlement CASCADE;`);
    await client.query(`DROP VIEW IF EXISTS v_order_money_totals CASCADE;`);
    
    await client.query(`
      CREATE VIEW v_order_money_totals AS
      WITH line_totals AS (
        SELECT
          d.don_hang_id AS order_id,
          COALESCE(SUM(d.don_gia * d.so_luong), 0)::INT AS subtotal_before_topping,
          COALESCE(SUM(COALESCE(d.giam_gia, 0)), 0)::INT AS line_discounts_total,
          COALESCE(SUM(t.topping_total), 0)::INT AS topping_total
        FROM don_hang_chi_tiet d
        LEFT JOIN (
          SELECT line_id, COALESCE(SUM(tien_topping_line),0)::INT AS topping_total
          FROM v_line_option_amount_pricing
          GROUP BY line_id
        ) t ON t.line_id = d.id
        WHERE d.trang_thai_che_bien != 'CANCELLED'
        GROUP BY d.don_hang_id
      ),
      promo_totals AS (
        SELECT
          don_hang_id AS order_id,
          COALESCE(SUM(so_tien_giam), 0)::INT AS promo_total
        FROM don_hang_khuyen_mai
        GROUP BY don_hang_id
      )
      SELECT
        o.id AS order_id,
        COALESCE(lt.subtotal_before_topping, 0) AS subtotal_before_lines,
        COALESCE(lt.line_discounts_total, 0) AS line_discounts_total,
        (COALESCE(lt.subtotal_before_topping, 0) + COALESCE(lt.topping_total, 0) - COALESCE(lt.line_discounts_total, 0))::INT AS subtotal_after_lines,
        COALESCE(pt.promo_total, 0) AS promo_total,
        COALESCE(o.giam_gia_thu_cong, 0) AS manual_discount,
        COALESCE(di.delivery_fee, 0) AS service_fee,  -- ✅ Delivery fee = service_fee cho đơn DELIVERY
        0.0 AS vat_rate,
        0 AS vat_amount,
        (
          COALESCE(lt.subtotal_before_topping, 0) + 
          COALESCE(lt.topping_total, 0) - 
          COALESCE(lt.line_discounts_total, 0) - 
          COALESCE(pt.promo_total, 0) - 
          COALESCE(o.giam_gia_thu_cong, 0) +
          COALESCE(di.delivery_fee, 0)  -- ✅ Cộng delivery_fee vào grand_total
        )::INT AS grand_total
      FROM don_hang o
      LEFT JOIN line_totals lt ON lt.order_id = o.id
      LEFT JOIN promo_totals pt ON pt.order_id = o.id
      LEFT JOIN don_hang_delivery_info di ON di.order_id = o.id  -- ✅ JOIN để lấy delivery_fee
      GROUP BY o.id, o.giam_gia_thu_cong, lt.subtotal_before_topping, lt.line_discounts_total, lt.topping_total, pt.promo_total, di.delivery_fee
    `);
    
    // Recreate v_order_settlement
    await client.query(`
      CREATE OR REPLACE VIEW v_order_settlement AS
      SELECT
        t.order_id,
        t.subtotal_before_lines,
        t.line_discounts_total,
        t.subtotal_after_lines,
        t.promo_total,
        t.manual_discount,
        t.service_fee,  -- ✅ Delivery fee
        t.vat_rate,
        t.vat_amount,
        t.grand_total,  -- ✅ Đã bao gồm delivery_fee
        COALESCE(p.payments_captured, 0) AS payments_captured,
        COALESCE(p.payments_refunded, 0) AS payments_refunded,
        COALESCE(p.payments_net, 0) AS payments_net,
        GREATEST(t.grand_total - COALESCE(p.payments_net,0), 0)::INT AS amount_due
      FROM v_order_money_totals t
      LEFT JOIN v_order_payment_totals p ON p.order_id = t.order_id
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ View fixed successfully!\n');
    console.log('📝 v_order_money_totals now includes delivery_fee in grand_total');
    console.log('📝 service_fee = delivery_fee for DELIVERY orders\n');
    
    // Test với ca #55
    const testResult = await pool.query(`
      SELECT 
        fn_aggregate_shift(55) AS stats
    `);
    const stats = testResult.rows[0].stats;
    
    console.log('🧪 Test với ca #55:');
    console.log(`   - Doanh thu (net_amount): ${parseInt(stats.net_amount || 0).toLocaleString('vi-VN')}đ`);
    console.log(`   - Tiền mặt (cash_amount): ${parseInt(stats.cash_amount || 0).toLocaleString('vi-VN')}đ\n`);
    
    // Kiểm tra một đơn DELIVERY
    const deliveryCheck = await pool.query(`
      SELECT 
        dh.id,
        settlement.grand_total,
        di.delivery_fee,
        (SELECT COALESCE(SUM(ct.so_luong * ct.don_gia - COALESCE(ct.giam_gia, 0)), 0)
         FROM don_hang_chi_tiet ct
         WHERE ct.don_hang_id = dh.id) AS items_total
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      WHERE dh.ca_lam_id = 55
        AND dh.order_type = 'DELIVERY'
        AND dh.trang_thai = 'PAID'
      LIMIT 1
    `);
    
    if (deliveryCheck.rows.length > 0) {
      const order = deliveryCheck.rows[0];
      const expected = parseInt(order.items_total || 0) + parseInt(order.delivery_fee || 0);
      const actual = parseInt(order.grand_total || 0);
      
      console.log('🧪 Kiểm tra đơn DELIVERY:');
      console.log(`   - Items Total: ${parseInt(order.items_total || 0).toLocaleString('vi-VN')}đ`);
      console.log(`   - Delivery Fee: ${parseInt(order.delivery_fee || 0).toLocaleString('vi-VN')}đ`);
      console.log(`   - Expected Grand Total: ${expected.toLocaleString('vi-VN')}đ`);
      console.log(`   - Actual Grand Total: ${actual.toLocaleString('vi-VN')}đ`);
      console.log(`   - ${actual === expected ? '✅' : '❌'} Khớp: ${actual === expected}\n`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fix();

