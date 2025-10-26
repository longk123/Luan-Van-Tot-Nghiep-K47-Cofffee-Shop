/**
 * Fix: Sửa function để dùng đúng tên bảng tuy_chon_mon
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function fix() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing functions to use correct table names...\n');
    
    await client.query('BEGIN');
    
    // Fix function tinh_gia_von_dong
    await client.query(`
      CREATE OR REPLACE FUNCTION tinh_gia_von_dong(
        p_mon_id INT,
        p_bien_the_id INT,
        p_tuy_chon_ids INT[]
      )
      RETURNS DECIMAL(10,2)
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_gia_von DECIMAL(10,2) := 0;
        v_duong_percent DECIMAL(5,2) := 1.0;
        v_da_percent DECIMAL(5,2) := 1.0;
        v_tuy_chon_id INT;
      BEGIN
        -- Lấy % đường và đá từ tùy chọn
        IF p_tuy_chon_ids IS NOT NULL THEN
          FOREACH v_tuy_chon_id IN ARRAY p_tuy_chon_ids
          LOOP
            -- Check nếu là tùy chọn về đường
            IF EXISTS (
              SELECT 1 FROM tuy_chon_mon tc
              WHERE tc.id = v_tuy_chon_id 
                AND tc.ten ILIKE '%đường%'
            ) THEN
              SELECT 
                CASE 
                  WHEN tc.ten ILIKE '%50%' THEN 0.5
                  WHEN tc.ten ILIKE '%75%' THEN 0.75
                  WHEN tc.ten ILIKE '%150%' THEN 1.5
                  WHEN tc.ten ILIKE '%ít%' THEN 0.5
                  WHEN tc.ten ILIKE '%nhiều%' THEN 1.5
                  ELSE 1.0
                END
              INTO v_duong_percent
              FROM tuy_chon_mon tc
              WHERE tc.id = v_tuy_chon_id;
            END IF;
            
            -- Check nếu là tùy chọn về đá
            IF EXISTS (
              SELECT 1 FROM tuy_chon_mon tc
              WHERE tc.id = v_tuy_chon_id 
                AND tc.ten ILIKE '%đá%'
            ) THEN
              SELECT 
                CASE 
                  WHEN tc.ten ILIKE '%50%' THEN 0.5
                  WHEN tc.ten ILIKE '%ít%' THEN 0.5
                  WHEN tc.ten ILIKE '%nhiều%' THEN 1.5
                  ELSE 1.0
                END
              INTO v_da_percent
              FROM tuy_chon_mon tc
              WHERE tc.id = v_tuy_chon_id;
            END IF;
          END LOOP;
        END IF;
        
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
        WHERE ct.mon_id = p_mon_id
          AND (ct.bien_the_id = p_bien_the_id OR ct.bien_the_id IS NULL);
        
        RETURN v_gia_von;
      END;
      $$;
    `);
    
    console.log('✅ Fixed tinh_gia_von_dong');
    
    // Fix function auto_xuat_kho_don_hang
    await client.query(`
      CREATE OR REPLACE FUNCTION auto_xuat_kho_don_hang(p_don_hang_id INT)
      RETURNS VOID
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_line RECORD;
        v_nguyen_lieu RECORD;
        v_duong_percent DECIMAL(5,2);
        v_da_percent DECIMAL(5,2);
        v_so_luong_xuat DECIMAL(10,3);
      BEGIN
        -- Duyệt tất cả món trong đơn
        FOR v_line IN 
          SELECT 
            dhct.id,
            dhct.mon_id,
            dhct.bien_the_id,
            dhct.so_luong as so_ly,
            ARRAY_AGG(dhcttc.tuy_chon_id) FILTER (WHERE dhcttc.tuy_chon_id IS NOT NULL) as tuy_chon_ids
          FROM don_hang_chi_tiet dhct
          LEFT JOIN don_hang_chi_tiet_tuy_chon dhcttc ON dhcttc.line_id = dhct.id
          WHERE dhct.don_hang_id = p_don_hang_id
          GROUP BY dhct.id, dhct.mon_id, dhct.bien_the_id, dhct.so_luong
        LOOP
          -- Xác định % đường và đá
          v_duong_percent := 1.0;
          v_da_percent := 1.0;
          
          IF v_line.tuy_chon_ids IS NOT NULL THEN
            -- Tính % đường
            SELECT COALESCE(MAX(
              CASE 
                WHEN tc.ten ILIKE '%50%' THEN 0.5
                WHEN tc.ten ILIKE '%75%' THEN 0.75
                WHEN tc.ten ILIKE '%150%' THEN 1.5
                WHEN tc.ten ILIKE '%ít%' THEN 0.5
                WHEN tc.ten ILIKE '%nhiều%' THEN 1.5
                ELSE 1.0
              END
            ), 1.0)
            INTO v_duong_percent
            FROM tuy_chon_mon tc
            WHERE tc.id = ANY(v_line.tuy_chon_ids)
              AND tc.ten ILIKE '%đường%';
            
            -- Tính % đá
            SELECT COALESCE(MAX(
              CASE 
                WHEN tc.ten ILIKE '%50%' THEN 0.5
                WHEN tc.ten ILIKE '%ít%' THEN 0.5
                WHEN tc.ten ILIKE '%nhiều%' THEN 1.5
                ELSE 1.0
              END
            ), 1.0)
            INTO v_da_percent
            FROM tuy_chon_mon tc
            WHERE tc.id = ANY(v_line.tuy_chon_ids)
              AND tc.ten ILIKE '%đá%';
          END IF;
          
          -- Duyệt các nguyên liệu trong công thức
          FOR v_nguyen_lieu IN
            SELECT 
              nl.id as nguyen_lieu_id,
              nl.ten,
              nl.ma,
              ct.so_luong as so_luong_cong_thuc,
              nl.don_vi
            FROM cong_thuc_mon ct
            JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
            WHERE ct.mon_id = v_line.mon_id
              AND (ct.bien_the_id = v_line.bien_the_id OR ct.bien_the_id IS NULL)
          LOOP
            -- Tính số lượng xuất = công thức × số ly × % custom
            v_so_luong_xuat := v_nguyen_lieu.so_luong_cong_thuc * v_line.so_ly;
            
            IF v_nguyen_lieu.ma LIKE '%DUONG%' THEN
              v_so_luong_xuat := v_so_luong_xuat * v_duong_percent;
            ELSIF v_nguyen_lieu.ma LIKE '%DA%' THEN
              v_so_luong_xuat := v_so_luong_xuat * v_da_percent;
            END IF;
            
            -- Insert vào bảng xuat_kho
            INSERT INTO xuat_kho (
              nguyen_lieu_id,
              so_luong,
              don_hang_id,
              don_hang_chi_tiet_id,
              ngay_xuat,
              ghi_chu
            ) VALUES (
              v_nguyen_lieu.nguyen_lieu_id,
              v_so_luong_xuat,
              p_don_hang_id,
              v_line.id,
              NOW(),
              format('Xuất cho đơn #%s - %s (x%s ly)', 
                p_don_hang_id, 
                v_nguyen_lieu.ten,
                v_line.so_ly
              )
            );
            
            -- Trừ tồn kho
            UPDATE nguyen_lieu
            SET ton_kho = ton_kho - v_so_luong_xuat
            WHERE id = v_nguyen_lieu.nguyen_lieu_id;
            
          END LOOP;
        END LOOP;
        
        RAISE NOTICE 'Đã xuất kho cho đơn hàng #%', p_don_hang_id;
      END;
      $$;
    `);
    
    console.log('✅ Fixed auto_xuat_kho_don_hang');
    
    // Fix function check_nguyen_lieu_du
    await client.query(`
      CREATE OR REPLACE FUNCTION check_nguyen_lieu_du(
        p_mon_id INT,
        p_bien_the_id INT,
        p_so_luong INT,
        p_tuy_chon_ids INT[] DEFAULT NULL
      )
      RETURNS TABLE(
        du_nguyen_lieu BOOLEAN,
        nguyen_lieu_thieu TEXT,
        ton_kho DECIMAL,
        can_dung DECIMAL,
        don_vi TEXT
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_duong_percent DECIMAL(5,2) := 1.0;
        v_da_percent DECIMAL(5,2) := 1.0;
      BEGIN
        -- Xác định % custom
        IF p_tuy_chon_ids IS NOT NULL THEN
          SELECT COALESCE(MAX(
            CASE 
              WHEN tc.ten ILIKE '%50%' THEN 0.5
              WHEN tc.ten ILIKE '%75%' THEN 0.75
              WHEN tc.ten ILIKE '%150%' THEN 1.5
              WHEN tc.ten ILIKE '%ít%' THEN 0.5
              WHEN tc.ten ILIKE '%nhiều%' THEN 1.5
              ELSE 1.0
            END
          ), 1.0)
          INTO v_duong_percent
          FROM tuy_chon_mon tc
          WHERE tc.id = ANY(p_tuy_chon_ids) AND tc.ten ILIKE '%đường%';
          
          SELECT COALESCE(MAX(
            CASE 
              WHEN tc.ten ILIKE '%50%' THEN 0.5
              WHEN tc.ten ILIKE '%ít%' THEN 0.5
              WHEN tc.ten ILIKE '%nhiều%' THEN 1.5
              ELSE 1.0
            END
          ), 1.0)
          INTO v_da_percent
          FROM tuy_chon_mon tc
          WHERE tc.id = ANY(p_tuy_chon_ids) AND tc.ten ILIKE '%đá%';
        END IF;
        
        -- Check từng nguyên liệu
        RETURN QUERY
        SELECT 
          (nl.ton_kho >= ct.so_luong * p_so_luong * 
            CASE 
              WHEN nl.ma LIKE '%DUONG%' THEN v_duong_percent
              WHEN nl.ma LIKE '%DA%' THEN v_da_percent
              ELSE 1.0
            END
          ) as du_nguyen_lieu,
          nl.ten as nguyen_lieu_thieu,
          nl.ton_kho,
          ct.so_luong * p_so_luong * 
            CASE 
              WHEN nl.ma LIKE '%DUONG%' THEN v_duong_percent
              WHEN nl.ma LIKE '%DA%' THEN v_da_percent
              ELSE 1.0
            END as can_dung,
          nl.don_vi
        FROM cong_thuc_mon ct
        JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
        WHERE ct.mon_id = p_mon_id
          AND (ct.bien_the_id = p_bien_the_id OR ct.bien_the_id IS NULL)
        ORDER BY du_nguyen_lieu ASC, nl.ten;
      END;
      $$;
    `);
    
    console.log('✅ Fixed check_nguyen_lieu_du');
    
    await client.query('COMMIT');
    
    console.log('\n✅ All functions fixed!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
