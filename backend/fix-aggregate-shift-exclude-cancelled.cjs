// Fix fn_aggregate_shift để KHÔNG tính đơn CANCELLED
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
    console.log('🔧 Fixing fn_aggregate_shift to exclude CANCELLED orders...\n');
    
    await client.query('BEGIN');
    
    await client.query(`DROP FUNCTION IF EXISTS fn_aggregate_shift(INT);`);
    
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_aggregate_shift(p_shift_id INT)
      RETURNS JSON AS $$
      DECLARE
        result JSON;
      BEGIN
        SELECT json_build_object(
          'total_orders', COUNT(DISTINCT dh.id),
          'gross_amount', COALESCE(SUM(settlement.subtotal_after_lines), 0),
          'net_amount', COALESCE(SUM(settlement.grand_total), 0),
          'discount_amount', COALESCE(SUM(settlement.promo_total + settlement.manual_discount), 0),
          'tax_amount', 0,
          'cash_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code = 'CASH' 
                  AND pt.status = 'PAID'
              ) THEN settlement.grand_total 
              ELSE 0 
            END
          ), 0),
          'card_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code = 'CARD' 
                  AND pt.status = 'PAID'
              ) THEN settlement.grand_total 
              ELSE 0 
            END
          ), 0),
          'transfer_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code IN ('TRANSFER', 'BANK') 
                  AND pt.status = 'PAID'
              ) THEN settlement.grand_total 
              ELSE 0 
            END
          ), 0),
          'online_amount', COALESCE(SUM(
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM payment_transaction pt 
                WHERE pt.order_id = dh.id 
                  AND pt.payment_method_code IN ('ONLINE', 'PAYOS', 'QR_BANK', 'QR', 'MOMO', 'ZALOPAY', 'VIETTELPAY', 'SHOPEEPAY') 
                  AND pt.status = 'PAID'
              ) THEN settlement.grand_total 
              ELSE 0 
            END
          ), 0)
        ) INTO result
        FROM don_hang dh
        LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
        WHERE dh.ca_lam_id = p_shift_id 
          AND dh.trang_thai = 'PAID';  -- ✅ CHỈ tính đơn PAID, không tính CANCELLED
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Function updated successfully!\n');
    console.log('📋 Changes:');
    console.log('  - Chỉ tính đơn PAID (không tính CANCELLED)');
    console.log('  - Filter: WHERE dh.ca_lam_id = p_shift_id AND dh.trang_thai = \'PAID\'\n');
    
    // Test với shift #47
    console.log('🧪 Testing with shift #47...');
    const testResult = await client.query(`SELECT fn_aggregate_shift(47) AS result`);
    const stats = testResult.rows[0]?.result;
    if (stats) {
      console.log('\n📊 Results:');
      console.log(`  - Total orders: ${stats.total_orders}`);
      console.log(`  - Gross: ${stats.gross_amount?.toLocaleString('vi-VN')} ₫`);
      console.log(`  - Net: ${stats.net_amount?.toLocaleString('vi-VN')} ₫`);
      console.log(`  - Discount: ${stats.discount_amount?.toLocaleString('vi-VN')} ₫\n`);
      
      if (stats.total_orders === 0 && stats.gross_amount === 0) {
        console.log('⚠️  Shift #47 có thể chỉ có đơn CANCELLED (đã được loại bỏ đúng)');
      }
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();

