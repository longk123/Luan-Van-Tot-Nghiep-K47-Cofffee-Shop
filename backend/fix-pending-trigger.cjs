// Fix trigger để cho phép thêm options cho món PENDING
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function fix() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing fn_assert_editable_line to allow PENDING...\n');
    
    await client.query('BEGIN');
    
    // Recreate function với PENDING
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_assert_editable_line(p_line_id INT)
      RETURNS VOID AS $$
      DECLARE
        v_order_status TEXT;
        v_line_status TEXT;
      BEGIN
        SELECT dh.trang_thai, ct.trang_thai_che_bien
        INTO v_order_status, v_line_status
        FROM don_hang_chi_tiet ct
        JOIN don_hang dh ON dh.id = ct.don_hang_id
        WHERE ct.id = p_line_id;

        IF v_order_status = 'PAID' THEN
          RAISE EXCEPTION 'Don hang da thanh toan. Khong the sua/xoa.';
        END IF;

        -- Cho phép sửa khi PENDING hoặc QUEUED
        IF v_line_status NOT IN ('PENDING', 'QUEUED') THEN
          RAISE EXCEPTION 'Khong the sua/xoa: Mon da/dang duoc lam (trang thai: %).',
            v_line_status;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Function updated successfully!');
    console.log('📝 Now allows editing items with status: PENDING, QUEUED');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();

