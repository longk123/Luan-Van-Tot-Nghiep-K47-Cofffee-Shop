// Fix cuối cùng: Dùng order_payment thay vì payment_transaction
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Fixing fn_aggregate_shift to use order_payment table...\n');
    
    await client.query('BEGIN');
    
    await client.query(`DROP FUNCTION IF EXISTS fn_aggregate_shift(INT);`);
    
    // Tạo lại function sử dụng order_payment
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_aggregate_shift(p_shift_id INT)
      RETURNS JSON AS $$
      DECLARE
        result JSON;
      BEGIN
        SELECT json_build_object(
          'total_orders', COUNT(DISTINCT dh.id) FILTER (WHERE dh.trang_thai = 'PAID'),
          'gross_amount', COALESCE(SUM(settlement.subtotal_after_lines) FILTER (WHERE dh.trang_thai = 'PAID'), 0),
          'net_amount', COALESCE(SUM(settlement.grand_total) FILTER (WHERE dh.trang_thai = 'PAID'), 0),
          'discount_amount', COALESCE(SUM(settlement.promo_total + settlement.manual_discount) FILTER (WHERE dh.trang_thai = 'PAID'), 0),
          'tax_amount', 0,
          'cash_amount', COALESCE(SUM(
            CASE 
              WHEN op.method_code = 'CASH' AND op.status = 'CAPTURED' 
              THEN op.amount 
              ELSE 0 
            END
          ), 0),
          'card_amount', COALESCE(SUM(
            CASE 
              WHEN op.method_code = 'CARD' AND op.status = 'CAPTURED' 
              THEN op.amount 
              ELSE 0 
            END
          ), 0),
          'transfer_amount', COALESCE(SUM(
            CASE 
              WHEN op.method_code = 'TRANSFER' AND op.status = 'CAPTURED' 
              THEN op.amount 
              ELSE 0 
            END
          ), 0),
          'online_amount', COALESCE(SUM(
            CASE 
              WHEN op.method_code IN ('ONLINE', 'PAYOS', 'QR_BANK', 'MOMO', 'ZALOPAY') 
                   AND op.status = 'CAPTURED' 
              THEN op.amount 
              ELSE 0 
            END
          ), 0)
        ) INTO result
        FROM don_hang dh
        LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
        LEFT JOIN order_payment op ON op.order_id = dh.id
        WHERE dh.ca_lam_id = p_shift_id;
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Function fixed successfully!\n');
    console.log('📝 Now using order_payment table (not payment_transaction)');
    console.log('📝 Aggregating by method_code: CASH, CARD, TRANSFER, ONLINE');
    
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

