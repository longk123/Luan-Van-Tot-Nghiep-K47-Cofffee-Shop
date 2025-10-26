/**
 * FIX: Thêm trigger tự động tính giá vốn khi INSERT/UPDATE don_hang_chi_tiet
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD)
});

async function fix() {
  console.log('\n🔧 FIX: Thêm trigger tính giá vốn tự động');
  console.log('='.repeat(70));
  console.log();
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Tạo function trigger tính giá vốn
    console.log('1️⃣ Tạo function trigger_calc_gia_von...');
    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_calc_gia_von()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_gia_von DECIMAL(10,2);
        v_duong_percent DECIMAL(5,2) := 1.0;
        v_da_percent DECIMAL(5,2) := 1.0;
      BEGIN
        -- Lấy % đường và đá từ tuy_chon
        SELECT 
          COALESCE(MAX(CASE 
            WHEN tm.ma LIKE '%DUONG%' OR tm.ten ILIKE '%đường%' THEN
              CASE 
                WHEN tm.ten ILIKE '%50%' OR tm.ten ILIKE '%ít%' THEN 0.5
                WHEN tm.ten ILIKE '%75%' THEN 0.75
                WHEN tm.ten ILIKE '%150%' OR tm.ten ILIKE '%nhiều%' THEN 1.5
                ELSE 1.0
              END
          END), 1.0),
          COALESCE(MAX(CASE 
            WHEN tm.ma LIKE '%DA%' OR tm.ten ILIKE '%đá%' THEN
              CASE 
                WHEN tm.ten ILIKE '%50%' OR tm.ten ILIKE '%ít%' THEN 0.5
                WHEN tm.ten ILIKE '%nhiều%' THEN 1.5
                ELSE 1.0
              END
          END), 1.0)
        INTO v_duong_percent, v_da_percent
        FROM don_hang_chi_tiet_tuy_chon dhctto
        LEFT JOIN tuy_chon_mon tm ON tm.id = dhctto.tuy_chon_id
        WHERE dhctto.line_id = NEW.id;
        
        -- Tính giá vốn từ công thức
        SELECT 
          COALESCE(SUM(
            ct.so_luong * nl.gia_nhap_moi_nhat * 
            CASE 
              WHEN nl.ma LIKE '%DUONG%' THEN v_duong_percent
              WHEN nl.ma LIKE '%DA%' THEN v_da_percent
              ELSE 1.0
            END
          ), 0)
        INTO v_gia_von
        FROM cong_thuc_mon ct
        JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
        WHERE ct.mon_id = NEW.mon_id
          AND (ct.bien_the_id = NEW.bien_the_id OR ct.bien_the_id IS NULL);
        
        -- Set giá vốn
        NEW.gia_von_thuc_te := v_gia_von;
        
        RETURN NEW;
      END;
      $$;
    `);
    console.log('   ✅ Function created\n');
    
    // 2. Tạo trigger cho INSERT
    console.log('2️⃣ Tạo trigger trg_calc_gia_von_insert...');
    await client.query(`
      DROP TRIGGER IF EXISTS trg_calc_gia_von_insert ON don_hang_chi_tiet;
      
      CREATE TRIGGER trg_calc_gia_von_insert
      BEFORE INSERT ON don_hang_chi_tiet
      FOR EACH ROW
      EXECUTE FUNCTION trigger_calc_gia_von();
    `);
    console.log('   ✅ INSERT trigger created\n');
    
    // 3. Tạo trigger cho UPDATE
    console.log('3️⃣ Tạo trigger trg_calc_gia_von_update...');
    await client.query(`
      DROP TRIGGER IF EXISTS trg_calc_gia_von_update ON don_hang_chi_tiet;
      
      CREATE TRIGGER trg_calc_gia_von_update
      BEFORE UPDATE OF mon_id, bien_the_id, so_luong ON don_hang_chi_tiet
      FOR EACH ROW
      WHEN (OLD.mon_id IS DISTINCT FROM NEW.mon_id 
         OR OLD.bien_the_id IS DISTINCT FROM NEW.bien_the_id
         OR OLD.so_luong IS DISTINCT FROM NEW.so_luong)
      EXECUTE FUNCTION trigger_calc_gia_von();
    `);
    console.log('   ✅ UPDATE trigger created\n');
    
    // 4. Trigger khi thêm/sửa topping
    console.log('4️⃣ Tạo trigger update giá vốn khi thay đổi topping...');
    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_update_gia_von_when_topping_changed()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_line_id INT;
      BEGIN
        -- Lấy line_id
        IF TG_OP = 'DELETE' THEN
          v_line_id := OLD.line_id;
        ELSE
          v_line_id := NEW.line_id;
        END IF;
        
        -- Trigger recalc giá vốn cho line này
        UPDATE don_hang_chi_tiet
        SET so_luong = so_luong  -- Dummy update để trigger fire
        WHERE id = v_line_id;
        
        RETURN COALESCE(NEW, OLD);
      END;
      $$;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trg_topping_update_gia_von ON don_hang_chi_tiet_tuy_chon;
      
      CREATE TRIGGER trg_topping_update_gia_von
      AFTER INSERT OR UPDATE OR DELETE ON don_hang_chi_tiet_tuy_chon
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_gia_von_when_topping_changed();
    `);
    console.log('   ✅ Topping trigger created\n');
    
    // 5. Update giá vốn cho các đơn hàng hiện có
    console.log('5️⃣ Cập nhật giá vốn cho các đơn hàng hiện có...');
    const updateResult = await client.query(`
      UPDATE don_hang_chi_tiet dhct
      SET gia_von_thuc_te = (
        SELECT 
          COALESCE(SUM(
            ct.so_luong * nl.gia_nhap_moi_nhat * 
            CASE 
              WHEN nl.ma LIKE '%DUONG%' THEN 
                COALESCE((
                  SELECT MAX(CASE 
                    WHEN tm.ten ILIKE '%50%' OR tm.ten ILIKE '%ít%' THEN 0.5
                    WHEN tm.ten ILIKE '%75%' THEN 0.75
                    WHEN tm.ten ILIKE '%150%' OR tm.ten ILIKE '%nhiều%' THEN 1.5
                    ELSE 1.0
                  END)
                  FROM don_hang_chi_tiet_tuy_chon dhctto
                  JOIN tuy_chon_mon tm ON tm.id = dhctto.tuy_chon_id
                  WHERE dhctto.line_id = dhct.id 
                    AND (tm.ma LIKE '%DUONG%' OR tm.ten ILIKE '%đường%')
                ), 1.0)
              WHEN nl.ma LIKE '%DA%' THEN 
                COALESCE((
                  SELECT MAX(CASE 
                    WHEN tm.ten ILIKE '%50%' OR tm.ten ILIKE '%ít%' THEN 0.5
                    WHEN tm.ten ILIKE '%nhiều%' THEN 1.5
                    ELSE 1.0
                  END)
                  FROM don_hang_chi_tiet_tuy_chon dhctto
                  JOIN tuy_chon_mon tm ON tm.id = dhctto.tuy_chon_id
                  WHERE dhctto.line_id = dhct.id 
                    AND (tm.ma LIKE '%DA%' OR tm.ten ILIKE '%đá%')
                ), 1.0)
              ELSE 1.0
            END
          ), 0)
        FROM cong_thuc_mon ct
        JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
        WHERE ct.mon_id = dhct.mon_id
          AND (ct.bien_the_id = dhct.bien_the_id OR ct.bien_the_id IS NULL)
      )
      WHERE gia_von_thuc_te IS NULL OR gia_von_thuc_te = 0
    `);
    console.log(`   ✅ Đã cập nhật ${updateResult.rowCount} dòng\n`);
    
    await client.query('COMMIT');
    
    console.log('='.repeat(70));
    console.log('✅ FIX HOÀN TẤT!');
    console.log('='.repeat(70));
    console.log('\n📝 ĐÃ TẠO:');
    console.log('  1. Function trigger_calc_gia_von() - Tính giá vốn tự động');
    console.log('  2. Trigger trg_calc_gia_von_insert - Tính khi INSERT');
    console.log('  3. Trigger trg_calc_gia_von_update - Tính khi UPDATE');
    console.log('  4. Trigger trg_topping_update_gia_von - Tính lại khi đổi topping');
    console.log(`  5. Đã cập nhật giá vốn cho ${updateResult.rowCount} đơn hàng cũ`);
    console.log('\n💡 Từ giờ mọi đơn hàng mới sẽ tự động có giá vốn!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ LỖI:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
