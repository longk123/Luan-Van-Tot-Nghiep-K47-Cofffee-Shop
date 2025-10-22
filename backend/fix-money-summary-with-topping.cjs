/**
 * Fix v_order_money_totals để tính topping
 * View hiện tại chỉ tính don_gia * so_luong, không bao gồm giá topping
 * Cần sửa để tính từ line_total_with_addons
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔄 Fixing v_order_money_totals to include topping prices...');
    
    // Drop old view
    await client.query(`DROP VIEW IF EXISTS v_order_money_totals CASCADE`);
    
    // Recreate view với topping
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
        GROUP BY d.don_hang_id
      )
      SELECT
        o.id AS order_id,
        COALESCE(lt.subtotal_before_topping, 0) AS subtotal_before_lines,
        COALESCE(lt.line_discounts_total, 0) AS line_discounts_total,
        (COALESCE(lt.subtotal_before_topping, 0) + COALESCE(lt.topping_total, 0) - COALESCE(lt.line_discounts_total, 0))::INT AS subtotal_after_lines,
        COALESCE(SUM(dhkm.so_tien_giam), 0)::INT AS promo_total,
        COALESCE(o.giam_gia_thu_cong, 0) AS manual_discount,
        0 AS service_fee,
        0.0 AS vat_rate,
        0 AS vat_amount,
        (
          COALESCE(lt.subtotal_before_topping, 0) + 
          COALESCE(lt.topping_total, 0) - 
          COALESCE(lt.line_discounts_total, 0) - 
          COALESCE(SUM(dhkm.so_tien_giam), 0) - 
          COALESCE(o.giam_gia_thu_cong, 0)
        )::INT AS grand_total
      FROM don_hang o
      LEFT JOIN line_totals lt ON lt.order_id = o.id
      LEFT JOIN don_hang_khuyen_mai dhkm ON dhkm.don_hang_id = o.id
      GROUP BY o.id, o.giam_gia_thu_cong, lt.subtotal_before_topping, lt.line_discounts_total, lt.topping_total
    `);
    
    // Recreate v_order_settlement
    console.log('📊 Recreating v_order_settlement...');
    await client.query(`
      CREATE OR REPLACE VIEW v_order_settlement AS
      SELECT
        t.order_id,
        t.subtotal_before_lines,
        t.line_discounts_total,
        t.subtotal_after_lines,
        t.promo_total,
        t.manual_discount,
        t.service_fee,
        t.vat_rate,
        t.vat_amount,
        t.grand_total,
        COALESCE(p.payments_captured, 0) AS payments_captured,
        COALESCE(p.payments_refunded, 0) AS payments_refunded,
        COALESCE(p.payments_net, 0) AS payments_net,
        GREATEST(t.grand_total - COALESCE(p.payments_net,0), 0)::INT AS amount_due
      FROM v_order_money_totals t
      LEFT JOIN v_order_payment_totals p ON p.order_id = t.order_id
    `);
    
    await client.query('COMMIT');
    console.log('✅ Fix complete! v_order_money_totals now includes topping prices.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

