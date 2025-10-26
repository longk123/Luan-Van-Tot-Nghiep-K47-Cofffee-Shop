/**
 * Migration: Tự động xuất kho khi đơn hàng PAID
 * - Function tính nguyên liệu cần dùng từ công thức
 * - Function xuất kho tự động
 * - Trigger khi đơn chuyển sang PAID
 * - Thêm column gia_von_thuc_te vào don_hang_chi_tiet
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

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Bắt đầu migration: Auto Export Inventory\n');
    
    await client.query('BEGIN');
    
    // =====================================================================
    // 1. THÊM COLUMN GIÁ VỐN THỰC TẾ VÀO DON_HANG_CHI_TIET
    // =====================================================================
    console.log('1️⃣ Thêm column gia_von_thuc_te vào don_hang_chi_tiet...');
    
    await client.query(`
      ALTER TABLE don_hang_chi_tiet 
      ADD COLUMN IF NOT EXISTS gia_von_thuc_te DECIMAL(10,2) DEFAULT 0;
    `);
    
    await client.query(`
      COMMENT ON COLUMN don_hang_chi_tiet.gia_von_thuc_te IS 
      'Giá vốn thực tế tính theo % đường/đá custom của khách';
    `);
    
    console.log('   ✅ Đã thêm column gia_von_thuc_te\n');
    
    // =====================================================================
    // 2. FUNCTION: TÍNH GIÁ VỐN ĐỘNG THEO % CUSTOM
    // =====================================================================
    console.log('2️⃣ Tạo function tính giá vốn động...');
    
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
              SELECT 1 FROM tuy_chon tc
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
              FROM tuy_chon tc
              WHERE tc.id = v_tuy_chon_id;
            END IF;
            
            -- Check nếu là tùy chọn về đá
            IF EXISTS (
              SELECT 1 FROM tuy_chon tc
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
              FROM tuy_chon tc
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
    
    console.log('   ✅ Function tinh_gia_von_dong created\n');
    
    // =====================================================================
    // 3. FUNCTION: XUẤT KHO TỰ ĐỘNG
    // =====================================================================
    console.log('3️⃣ Tạo function xuất kho tự động...');
    
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
            SELECT MAX(
              CASE 
                WHEN tc.ten ILIKE '%50%' THEN 0.5
                WHEN tc.ten ILIKE '%75%' THEN 0.75
                WHEN tc.ten ILIKE '%150%' THEN 1.5
                WHEN tc.ten ILIKE '%ít%' THEN 0.5
                WHEN tc.ten ILIKE '%nhiều%' THEN 1.5
                ELSE 1.0
              END
            )
            INTO v_duong_percent
            FROM tuy_chon tc
            WHERE tc.id = ANY(v_line.tuy_chon_ids)
              AND tc.ten ILIKE '%đường%';
            
            v_duong_percent := COALESCE(v_duong_percent, 1.0);
            
            -- Tính % đá
            SELECT MAX(
              CASE 
                WHEN tc.ten ILIKE '%50%' THEN 0.5
                WHEN tc.ten ILIKE '%ít%' THEN 0.5
                WHEN tc.ten ILIKE '%nhiều%' THEN 1.5
                ELSE 1.0
              END
            )
            INTO v_da_percent
            FROM tuy_chon tc
            WHERE tc.id = ANY(v_line.tuy_chon_ids)
              AND tc.ten ILIKE '%đá%';
            
            v_da_percent := COALESCE(v_da_percent, 1.0);
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
    
    console.log('   ✅ Function auto_xuat_kho_don_hang created\n');
    
    // =====================================================================
    // 4. TRIGGER: TỰ ĐỘNG XUẤT KHO KHI ĐƠN PAID
    // =====================================================================
    console.log('4️⃣ Tạo trigger tự động xuất kho...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION trigger_auto_xuat_kho()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $$
      BEGIN
        -- Chỉ xuất kho khi đơn chuyển sang PAID (và chưa từng PAID trước đó)
        IF NEW.trang_thai = 'PAID' AND OLD.trang_thai != 'PAID' THEN
          PERFORM auto_xuat_kho_don_hang(NEW.id);
        END IF;
        
        RETURN NEW;
      END;
      $$;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trg_auto_xuat_kho ON don_hang;
      
      CREATE TRIGGER trg_auto_xuat_kho
      AFTER UPDATE ON don_hang
      FOR EACH ROW
      EXECUTE FUNCTION trigger_auto_xuat_kho();
    `);
    
    console.log('   ✅ Trigger trg_auto_xuat_kho created\n');
    
    // =====================================================================
    // 5. FUNCTION: CHECK ĐỦ NGUYÊN LIỆU TRƯỚC KHI ORDER
    // =====================================================================
    console.log('5️⃣ Tạo function check nguyên liệu...');
    
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
          FROM tuy_chon tc
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
          FROM tuy_chon tc
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
    
    console.log('   ✅ Function check_nguyen_lieu_du created\n');
    
    // =====================================================================
    // 6. VIEW: NGUYÊN LIỆU SẮP HẾT (CẢI TIẾN)
    // =====================================================================
    console.log('6️⃣ Cập nhật view cảnh báo nguyên liệu...');
    
    await client.query(`
      CREATE OR REPLACE VIEW v_nguyen_lieu_canh_bao_v2 AS
      SELECT 
        nl.id,
        nl.ma,
        nl.ten,
        nl.ton_kho,
        nl.don_vi,
        nl.gia_nhap_moi_nhat,
        (nl.ton_kho * nl.gia_nhap_moi_nhat) as gia_tri_ton_kho,
        -- Ước tính có thể làm bao nhiêu ly (dựa trên món phổ biến nhất)
        CASE 
          WHEN nl.ma = 'CF-BOT' THEN FLOOR(nl.ton_kho / 0.020)  -- 20g/ly
          WHEN nl.ma = 'SUA-TUOI' THEN FLOOR(nl.ton_kho / 0.100)  -- 100ml/ly
          WHEN nl.ma = 'DUONG-TRANG' THEN FLOOR(nl.ton_kho / 0.015)  -- 15g/ly
          WHEN nl.ma = 'DA' THEN FLOOR(nl.ton_kho / 0.150)  -- 150g/ly
          WHEN nl.ma = 'TRA-XANH' THEN FLOOR(nl.ton_kho / 0.005)  -- 5g/ly
          ELSE NULL
        END as uoc_tinh_so_ly_lam_duoc,
        CASE 
          WHEN nl.ton_kho <= 0 THEN 'HET_HANG'
          WHEN nl.ton_kho <= 10 THEN 'SAP_HET'
          ELSE 'DU'
        END as trang_thai
      FROM nguyen_lieu nl
      WHERE nl.active = TRUE
      ORDER BY 
        CASE 
          WHEN nl.ton_kho <= 0 THEN 0
          WHEN nl.ton_kho <= 10 THEN 1
          ELSE 2
        END,
        nl.ten;
    `);
    
    console.log('   ✅ View v_nguyen_lieu_canh_bao_v2 created\n');
    
    await client.query('COMMIT');
    
    // =====================================================================
    // TEST: DEMO FUNCTION
    // =====================================================================
    console.log('═'.repeat(80));
    console.log('✅ MIGRATION HOÀN TẤT!');
    console.log('═'.repeat(80));
    
    console.log('\n📊 CÁC FUNCTION ĐÃ TẠO:');
    console.log('   1. tinh_gia_von_dong(mon_id, bien_the_id, tuy_chon_ids[])');
    console.log('   2. auto_xuat_kho_don_hang(don_hang_id)');
    console.log('   3. check_nguyen_lieu_du(mon_id, bien_the_id, so_luong, tuy_chon_ids[])');
    
    console.log('\n📊 TRIGGER ĐÃ TẠO:');
    console.log('   - trg_auto_xuat_kho: Tự động xuất kho khi đơn → PAID');
    
    console.log('\n💡 CÁCH SỬ DỤNG:');
    console.log('   -- Check đủ nguyên liệu:');
    console.log('   SELECT * FROM check_nguyen_lieu_du(1, 2, 5, NULL);');
    console.log('');
    console.log('   -- Tính giá vốn động:');
    console.log('   SELECT tinh_gia_von_dong(1, 2, ARRAY[1,2]);');
    console.log('');
    console.log('   -- Xuất kho thủ công (nếu cần):');
    console.log('   SELECT auto_xuat_kho_don_hang(100);');
    console.log('');
    console.log('   -- Xem cảnh báo tồn kho:');
    console.log('   SELECT * FROM v_nguyen_lieu_canh_bao_v2;\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration thất bại:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
