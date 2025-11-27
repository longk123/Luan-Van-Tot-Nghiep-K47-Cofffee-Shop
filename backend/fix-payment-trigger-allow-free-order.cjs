// Fix trigger t_order_payment_before_ins để cho phép đơn miễn phí (amount = 0)
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
    console.log('🔧 Fixing trigger to allow free orders (amount = 0)...\n');
    
    await client.query('BEGIN');
    
    // Recreate trigger function với logic mới
    await client.query(`
      CREATE OR REPLACE FUNCTION trg_order_payment_before_ins()
      RETURNS TRIGGER AS $$
      DECLARE
        v_due INT;
        v_grand_total INT;
      BEGIN
        -- Lấy grand_total để kiểm tra đơn miễn phí
        SELECT grand_total INTO v_grand_total 
        FROM v_order_settlement 
        WHERE order_id = NEW.order_id;
        
        -- Cho phép đơn miễn phí (grand_total = 0)
        IF v_grand_total = 0 THEN
          NEW.amount := 0;
          NEW.amount_tendered := NULL;
          NEW.change_given := 0;
          RETURN NEW;
        END IF;
        
        -- auto derive amount for CASH (đơn thường)
        IF NEW.method_code = 'CASH' THEN
          IF NEW.amount IS NULL OR NEW.amount = 0 THEN
            IF NEW.amount_tendered IS NULL THEN
              RAISE EXCEPTION 'CASH yêu cầu amount hoặc amount_tendered';
            END IF;
            v_due := fn_order_amount_due(NEW.order_id);
            NEW.amount := LEAST(NEW.amount_tendered, v_due);
            NEW.change_given := GREATEST(NEW.amount_tendered - NEW.amount, 0);
          ELSE
            IF NEW.amount_tendered IS NOT NULL THEN
              NEW.change_given := GREATEST(NEW.amount_tendered - NEW.amount, 0);
            END IF;
          END IF;
        ELSE
          IF NEW.amount_tendered IS NOT NULL THEN
            RAISE EXCEPTION 'amount_tendered chỉ áp dụng cho CASH';
          END IF;
          IF NEW.change_given IS NOT NULL AND NEW.change_given <> 0 THEN
            RAISE EXCEPTION 'change_given chỉ áp dụng cho CASH';
          END IF;
        END IF;

        IF NEW.amount < 0 THEN
          RAISE EXCEPTION 'Số tiền không hợp lệ';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Trigger fixed successfully!\n');
    console.log('📝 Changes:');
    console.log('  - Đơn miễn phí (grand_total = 0) được phép tạo payment với amount = 0');
    console.log('  - Không yêu cầu amount_tendered cho đơn miễn phí\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(console.error);
