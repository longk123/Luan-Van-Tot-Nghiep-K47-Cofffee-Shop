/**
 * MIGRATE: Sửa function tính giá vốn động với giá trị % trực tiếp
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
  database: process.env.DB_NAME || 'coffee_shop'
});

async function migrate() {
  try {
    console.log('🔧 Sửa function tinh_gia_von_dong...\n');
    
    // Drop old function
    await pool.query(`
      DROP FUNCTION IF EXISTS tinh_gia_von_dong(INTEGER, INTEGER, INTEGER[]);
    `);
    
    // Create new function with percent values
    await pool.query(`
      CREATE OR REPLACE FUNCTION tinh_gia_von_dong(
        p_mon_id INTEGER,
        p_bien_the_id INTEGER,
        p_duong_percent DECIMAL DEFAULT 1.0,  -- % đường (0.0 - 1.5)
        p_da_percent DECIMAL DEFAULT 1.0      -- % đá (0.0 - 1.5)
      )
      RETURNS DECIMAL(10,2)
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_gia_von DECIMAL(10,2) := 0;
      BEGIN
        -- Tính giá vốn từ công thức, áp dụng % cho đường và đá
        SELECT
          COALESCE(SUM(
            ct.so_luong * nl.gia_nhap_moi_nhat *
            CASE
              WHEN nl.ma LIKE '%DUONG%' THEN p_duong_percent
              WHEN nl.ma LIKE '%DA%' THEN p_da_percent
              ELSE 1.0
            END
          ), 0)
        INTO v_gia_von
        FROM cong_thuc_mon ct
        JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
        WHERE ct.mon_id = p_mon_id
          AND (ct.bien_the_id = p_bien_the_id OR ct.bien_the_id IS NULL);

        RETURN v_gia_von;
      END;
      $$;
    `);
    
    console.log('✅ Function mới đã tạo!');
    console.log('');
    console.log('📝 CÁCH SỬ DỤNG:');
    console.log('  tinh_gia_von_dong(mon_id, bien_the_id, duong_%, da_%)');
    console.log('');
    console.log('  Ví dụ:');
    console.log('    - 100% đường, 100% đá: tinh_gia_von_dong(1, 2, 1.0, 1.0)');
    console.log('    - 50% đường, 50% đá:   tinh_gia_von_dong(1, 2, 0.5, 0.5)');
    console.log('    - 0% đường, 0% đá:     tinh_gia_von_dong(1, 2, 0.0, 0.0)');
    console.log('    - 150% đường, 75% đá:  tinh_gia_von_dong(1, 2, 1.5, 0.75)');
    console.log('');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

migrate();
