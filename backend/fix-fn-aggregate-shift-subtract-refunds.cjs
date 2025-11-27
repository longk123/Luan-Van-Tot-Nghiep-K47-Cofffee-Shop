// Fix fn_aggregate_shift: Trừ refunds khỏi doanh thu
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
    console.log('🔧 Fixing fn_aggregate_shift to subtract refunds from revenue...\n');
    
    await client.query('BEGIN');
    
    await client.query(`DROP FUNCTION IF EXISTS fn_aggregate_shift(INT);`);
    
    // ✅ Sửa: Cộng COD vào doanh thu, nhưng trừ refunds
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_aggregate_shift(p_shift_id INT)
      RETURNS JSON AS $$
      DECLARE
        result JSON;
        cod_total INT;
        refunds_total INT;
      BEGIN
        -- Tính COD từ wallet_transactions
        SELECT COALESCE(SUM(wt.amount), 0)::INT INTO cod_total
        FROM wallet_transactions wt
        WHERE wt.shift_id = p_shift_id
          AND wt.type = 'SETTLE';
        
        -- Tính refunds từ các đơn trong ca
        SELECT COALESCE(SUM(r.amount), 0)::INT INTO refunds_total
        FROM order_payment_refund r
        JOIN order_payment p ON p.id = r.payment_id
        JOIN don_hang dh ON dh.id = p.order_id
        WHERE dh.ca_lam_id = p_shift_id;
        
        -- Tính doanh thu từ đơn hàng
        SELECT json_build_object(
          'total_orders', COUNT(DISTINCT dh.id),
          'gross_amount', COALESCE(SUM(settlement.subtotal_after_lines), 0),
          'net_amount', COALESCE(SUM(settlement.grand_total), 0) + cod_total - refunds_total,  -- ✅ Cộng COD, trừ refunds
          'discount_amount', COALESCE(SUM(settlement.promo_total + settlement.manual_discount), 0),
          'tax_amount', 0,
          'cash_amount', COALESCE(SUM(
            CASE 
              -- Ưu tiên: Lấy từ order_payment (hệ thống mới)
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code = 'CASH' 
                  AND op.status = 'CAPTURED'
              ) THEN (
                SELECT COALESCE(SUM(op.amount), 0)
                FROM order_payment op
                WHERE op.order_id = dh.id
                  AND op.method_code = 'CASH'
                  AND op.status = 'CAPTURED'
              )
              -- Fallback: Lấy từ payment_transaction (hệ thống cũ)
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code = 'CASH' 
                  AND pt.status = 'PAID'
              ) THEN (
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transaction pt
                WHERE pt.order_id = dh.id
                  AND pt.payment_method_code = 'CASH'
                  AND pt.status = 'PAID'
              )
              ELSE 0 
            END
          ), 0),
          'card_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code = 'CARD' 
                  AND op.status = 'CAPTURED'
              ) THEN (
                SELECT COALESCE(SUM(op.amount), 0)
                FROM order_payment op
                WHERE op.order_id = dh.id
                  AND op.method_code = 'CARD'
                  AND op.status = 'CAPTURED'
              )
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code = 'CARD' 
                  AND pt.status = 'PAID'
              ) THEN (
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transaction pt
                WHERE pt.order_id = dh.id
                  AND pt.payment_method_code = 'CARD'
                  AND pt.status = 'PAID'
              )
              ELSE 0 
            END
          ), 0),
          'transfer_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code IN ('TRANSFER', 'BANK')
                  AND op.status = 'CAPTURED'
              ) THEN (
                SELECT COALESCE(SUM(op.amount), 0)
                FROM order_payment op
                WHERE op.order_id = dh.id
                  AND op.method_code IN ('TRANSFER', 'BANK')
                  AND op.status = 'CAPTURED'
              )
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code IN ('TRANSFER', 'BANK')
                  AND pt.status = 'PAID'
              ) THEN (
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transaction pt
                WHERE pt.order_id = dh.id
                  AND pt.payment_method_code IN ('TRANSFER', 'BANK')
                  AND pt.status = 'PAID'
              )
              ELSE 0 
            END
          ), 0),
          'online_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM order_payment op 
                WHERE op.order_id = dh.id 
                  AND op.method_code IN ('ONLINE', 'PAYOS', 'QR_BANK', 'QR', 'MOMO', 'ZALOPAY', 'VIETTELPAY', 'SHOPEEPAY')
                  AND op.status = 'CAPTURED'
              ) THEN (
                SELECT COALESCE(SUM(op.amount), 0)
                FROM order_payment op
                WHERE op.order_id = dh.id
                  AND op.method_code IN ('ONLINE', 'PAYOS', 'QR_BANK', 'QR', 'MOMO', 'ZALOPAY', 'VIETTELPAY', 'SHOPEEPAY')
                  AND op.status = 'CAPTURED'
              )
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code IN ('ONLINE', 'PAYOS', 'QR_BANK', 'QR', 'MOMO', 'ZALOPAY', 'VIETTELPAY', 'SHOPEEPAY')
                  AND pt.status = 'PAID'
              ) THEN (
                SELECT COALESCE(SUM(pt.amount), 0)
                FROM payment_transaction pt
                WHERE pt.order_id = dh.id
                  AND pt.payment_method_code IN ('ONLINE', 'PAYOS', 'QR_BANK', 'QR', 'MOMO', 'ZALOPAY', 'VIETTELPAY', 'SHOPEEPAY')
                  AND pt.status = 'PAID'
              )
              ELSE 0 
            END
          ), 0)
        ) INTO result
        FROM don_hang dh
        LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
        WHERE dh.ca_lam_id = p_shift_id 
          AND dh.trang_thai = 'PAID';
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Function fixed successfully!\n');
    console.log('📝 fn_aggregate_shift now:');
    console.log('   - Includes COD in net_amount (revenue)');
    console.log('   - Subtracts refunds from net_amount (revenue)\n');
    
    // Test với ca #55
    const testResult = await pool.query(`SELECT fn_aggregate_shift(55) AS stats`);
    const testStats = testResult.rows[0].stats;
    
    // Tính toán thủ công để verify
    const manualCalc = await pool.query(`
      SELECT 
        (SELECT COALESCE(SUM(settlement.grand_total), 0)::INT
         FROM don_hang dh
         LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
         WHERE dh.ca_lam_id = 55 AND dh.trang_thai = 'PAID') AS orders_total,
        (SELECT COALESCE(SUM(wt.amount), 0)::INT
         FROM wallet_transactions wt
         WHERE wt.shift_id = 55 AND wt.type = 'SETTLE') AS cod_total,
        (SELECT COALESCE(SUM(r.amount), 0)::INT
         FROM order_payment_refund r
         JOIN order_payment p ON p.id = r.payment_id
         JOIN don_hang dh ON dh.id = p.order_id
         WHERE dh.ca_lam_id = 55) AS refunds_total
    `);
    
    const ordersTotal = parseInt(manualCalc.rows[0].orders_total || 0);
    const codTotal = parseInt(manualCalc.rows[0].cod_total || 0);
    const refundsTotal = parseInt(manualCalc.rows[0].refunds_total || 0);
    const expectedRevenue = ordersTotal + codTotal - refundsTotal;
    
    console.log('🧪 Test với ca #55:');
    console.log(`   - Doanh thu từ đơn: ${ordersTotal.toLocaleString('vi-VN')}đ`);
    console.log(`   - COD: +${codTotal.toLocaleString('vi-VN')}đ`);
    console.log(`   - Refunds: -${refundsTotal.toLocaleString('vi-VN')}đ`);
    console.log(`   - Doanh thu kỳ vọng: ${expectedRevenue.toLocaleString('vi-VN')}đ`);
    console.log(`   - Doanh thu từ function: ${parseInt(testStats.net_amount || 0).toLocaleString('vi-VN')}đ`);
    console.log(`   - ${parseInt(testStats.net_amount || 0) === expectedRevenue ? '✅' : '❌'} Khớp: ${parseInt(testStats.net_amount || 0) === expectedRevenue}\n`);
    
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

