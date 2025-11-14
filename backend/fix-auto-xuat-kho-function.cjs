// Fix function auto_xuat_kho_don_hang - Đổi tuy_chon thành tuy_chon_mon
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function fixFunction() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Đang fix function auto_xuat_kho_don_hang...\n');
    
    await client.query('BEGIN');

    // Drop function cũ
    await client.query(`
      DROP FUNCTION IF EXISTS auto_xuat_kho_don_hang(INTEGER) CASCADE;
    `);
    console.log('✅ Đã xóa function cũ');

    // Tạo lại function với tên bảng đúng
    await client.query(`
      CREATE OR REPLACE FUNCTION auto_xuat_kho_don_hang(p_don_hang_id INT)
      RETURNS void AS $$
      DECLARE
        v_item RECORD;
        v_nguyen_lieu RECORD;
        v_so_luong_can NUMERIC;
        v_duong_percent NUMERIC := 1.0;
        v_da_percent NUMERIC := 1.0;
        v_tuy_chon_id INT;
      BEGIN
        -- Lặp qua từng món trong đơn hàng
        FOR v_item IN
          SELECT
            dhct.id as chi_tiet_id,
            dhct.mon_id,
            dhct.bien_the_id,
            dhct.so_luong as so_luong_mon
          FROM don_hang_chi_tiet dhct
          WHERE dhct.don_hang_id = p_don_hang_id
        LOOP
          -- Reset multipliers
          v_duong_percent := 1.0;
          v_da_percent := 1.0;

          -- Kiểm tra tùy chọn đường (đổi tuy_chon thành tuy_chon_mon)
          IF EXISTS (
            SELECT 1 FROM don_hang_chi_tiet_tuy_chon dhctto
            JOIN tuy_chon_mon tc ON tc.id = dhctto.tuy_chon_id
            WHERE dhctto.line_id = v_item.chi_tiet_id
              AND tc.loai = 'PERCENT'
              AND tc.ma = 'SUGAR'
          ) THEN
            SELECT dhctto.he_so INTO v_duong_percent
            FROM don_hang_chi_tiet_tuy_chon dhctto
            WHERE dhctto.line_id = v_item.chi_tiet_id
              AND EXISTS (
                SELECT 1 FROM tuy_chon_mon tc2
                WHERE tc2.id = dhctto.tuy_chon_id
                  AND tc2.ma = 'SUGAR'
              )
            LIMIT 1;
            
            v_duong_percent := COALESCE(v_duong_percent, 1.0);
          END IF;

          -- Kiểm tra tùy chọn đá (đổi tuy_chon thành tuy_chon_mon)
          IF EXISTS (
            SELECT 1 FROM don_hang_chi_tiet_tuy_chon dhctto
            JOIN tuy_chon_mon tc ON tc.id = dhctto.tuy_chon_id
            WHERE dhctto.line_id = v_item.chi_tiet_id
              AND tc.loai = 'PERCENT'
              AND tc.ma = 'ICE'
          ) THEN
            SELECT dhctto.he_so INTO v_da_percent
            FROM don_hang_chi_tiet_tuy_chon dhctto
            WHERE dhctto.line_id = v_item.chi_tiet_id
              AND EXISTS (
                SELECT 1 FROM tuy_chon_mon tc2
                WHERE tc2.id = dhctto.tuy_chon_id
                  AND tc2.ma = 'ICE'
              )
            LIMIT 1;
            
            v_da_percent := COALESCE(v_da_percent, 1.0);
          END IF;

          -- Xuất kho từng nguyên liệu theo công thức (DÙNG FEFO)
          FOR v_nguyen_lieu IN
            SELECT
              ct.nguyen_lieu_id,
              ct.so_luong * v_item.so_luong_mon *
              CASE
                WHEN nl.ma LIKE '%DUONG%' THEN v_duong_percent
                WHEN nl.ma LIKE '%DA%' THEN v_da_percent
                ELSE 1.0
              END as so_luong_can
            FROM cong_thuc_mon ct
            JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
            WHERE ct.mon_id = v_item.mon_id
              AND (ct.bien_the_id = v_item.bien_the_id OR ct.bien_the_id IS NULL)
          LOOP
            -- Xuất kho theo FEFO
            PERFORM xuat_kho_fefo(
              v_nguyen_lieu.nguyen_lieu_id,
              v_nguyen_lieu.so_luong_can,
              p_don_hang_id,
              v_item.chi_tiet_id,
              'BAN_HANG'
            );
          END LOOP;
          
          -- Xử lý topping (AMOUNT type)
          FOR v_nguyen_lieu IN
            SELECT
              tc.nguyen_lieu_id,
              COALESCE(dhctto.so_luong, 1) * v_item.so_luong_mon as so_luong_can
            FROM don_hang_chi_tiet_tuy_chon dhctto
            JOIN tuy_chon_mon tc ON tc.id = dhctto.tuy_chon_id
            WHERE dhctto.line_id = v_item.chi_tiet_id
              AND tc.loai = 'AMOUNT'
              AND tc.nguyen_lieu_id IS NOT NULL
          LOOP
            PERFORM xuat_kho_fefo(
              v_nguyen_lieu.nguyen_lieu_id,
              v_nguyen_lieu.so_luong_can,
              p_don_hang_id,
              v_item.chi_tiet_id,
              'BAN_HANG'
            );
          END LOOP;
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Đã tạo lại function với tên bảng đúng (tuy_chon_mon)');

    // Tạo lại trigger với wrapper function
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_auto_xuat_kho ON order_payment;
    `);
    
    // Tạo wrapper function cho trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_auto_xuat_kho_wrapper()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.status = 'SUCCESS' THEN
          PERFORM auto_xuat_kho_don_hang(NEW.order_id);
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      CREATE TRIGGER trigger_auto_xuat_kho
        AFTER INSERT ON order_payment
        FOR EACH ROW
        EXECUTE FUNCTION trigger_auto_xuat_kho_wrapper();
    `);
    console.log('✅ Đã tạo lại trigger');

    await client.query('COMMIT');
    console.log('\n🎉 Hoàn tất! Function đã được fix.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixFunction().catch(console.error);
