// migrate-fix-aggregate-shift.cjs
// Fix fn_aggregate_shift to work with actual schema (no hoa_don table)

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
    console.log('🚀 Fixing fn_aggregate_shift function...\n');
    
    await client.query('BEGIN');
    
    // Drop old function
    await client.query(`
      DROP FUNCTION IF EXISTS fn_aggregate_shift(INT);
    `);
    
    // Create new function that works with actual schema
    // Dựa trên don_hang và payment_transaction, không dùng hoa_don
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_aggregate_shift(p_shift_id INT)
      RETURNS JSON AS $$
      DECLARE
        result JSON;
      BEGIN
        SELECT json_build_object(
          'total_orders', COUNT(DISTINCT dh.id),
          'gross_amount', COALESCE(SUM(
            (SELECT COALESCE(SUM((don_gia - COALESCE(giam_gia, 0)) * so_luong), 0)
             FROM don_hang_chi_tiet WHERE don_hang_id = dh.id)
          ), 0),
          'net_amount', COALESCE(SUM(settlement.grand_total), 0),
          'discount_amount', COALESCE(SUM(settlement.discount), 0),
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
    console.log('📝 Note: Function now uses:');
    console.log('   - don_hang table');
    console.log('   - v_order_settlement view');
    console.log('   - payment_transaction for method breakdown');
    
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

