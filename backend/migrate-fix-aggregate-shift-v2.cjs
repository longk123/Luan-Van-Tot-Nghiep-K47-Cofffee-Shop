// migrate-fix-aggregate-shift-v2.cjs
// Fix fn_aggregate_shift to use correct column names from v_order_settlement

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Fixing fn_aggregate_shift function (v2)...\n');
    
    await client.query('BEGIN');
    
    // Drop old function
    await client.query(`
      DROP FUNCTION IF EXISTS fn_aggregate_shift(INT);
    `);
    
    // Create correct function using actual v_order_settlement columns
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
                  AND pt.method_code = 'CASH' 
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
                  AND pt.method_code = 'CARD' 
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
                  AND pt.method_code = 'TRANSFER' 
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
                  AND pt.method_code = 'ONLINE' 
                  AND pt.status = 'PAID'
              ) THEN settlement.grand_total 
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
    console.log('📝 Columns used from v_order_settlement:');
    console.log('   - subtotal_after_lines (gross)');
    console.log('   - grand_total (net)');
    console.log('   - promo_total + manual_discount (discounts)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

