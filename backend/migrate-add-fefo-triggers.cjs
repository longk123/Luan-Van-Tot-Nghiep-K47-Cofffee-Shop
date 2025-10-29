/**
 * =====================================================================
 * MIGRATION: FEFO TRIGGERS & AUTO EXPORT
 * =====================================================================
 * 
 * Mục đích:
 * - Tự động xuất kho theo FEFO khi đơn hàng PAID
 * - Cập nhật batch inventory khi xuất kho
 * - Tự động đánh dấu batch hết hạn
 * 
 * =====================================================================
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'coffee_shop',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 BẮT ĐẦU MIGRATION: FEFO TRIGGERS & AUTO EXPORT');
    console.log('='.repeat(80) + '\n');
    
    await client.query('BEGIN');
    
    // =====================================================================
    // 1. FUNCTION: XU ẤT KHO TỪ BATCH THEO FEFO
    // =====================================================================
    console.log('🔧 1. Tạo function xuat_kho_fefo...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION xuat_kho_fefo(
        p_nguyen_lieu_id INT,
        p_so_luong NUMERIC,
        p_don_hang_id INT DEFAULT NULL,
        p_don_hang_chi_tiet_id INT DEFAULT NULL,
        p_loai_xuat TEXT DEFAULT 'BAN_HANG'
      )
      RETURNS TABLE(
        batch_id INT,
        batch_code VARCHAR,
        so_luong_xuat NUMERIC
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_remaining NUMERIC := p_so_luong;
        v_batch RECORD;
        v_xuat_id INT;
      BEGIN
        -- Lấy các batch theo FEFO
        FOR v_batch IN
          SELECT 
            bi.id,
            bi.batch_code,
            bi.so_luong_ton,
            bi.don_gia
          FROM batch_inventory bi
          WHERE bi.nguyen_lieu_id = p_nguyen_lieu_id
            AND bi.trang_thai = 'ACTIVE'
            AND bi.so_luong_ton > 0
            AND (bi.ngay_het_han IS NULL OR bi.ngay_het_han > CURRENT_DATE)
          ORDER BY 
            CASE WHEN bi.ngay_het_han IS NULL THEN 1 ELSE 0 END,
            bi.ngay_het_han ASC NULLS LAST,
            bi.ngay_nhap ASC
        LOOP
          IF v_remaining <= 0 THEN
            EXIT;
          END IF;
          
          -- Tính số lượng xuất từ batch này
          DECLARE
            v_so_luong_xuat NUMERIC;
          BEGIN
            IF v_batch.so_luong_ton >= v_remaining THEN
              v_so_luong_xuat := v_remaining;
            ELSE
              v_so_luong_xuat := v_batch.so_luong_ton;
            END IF;
            
            -- Insert vào xuat_kho
            INSERT INTO xuat_kho (
              nguyen_lieu_id,
              so_luong,
              don_hang_id,
              don_hang_chi_tiet_id,
              loai_xuat,
              batch_id,
              ngay_xuat,
              ghi_chu
            ) VALUES (
              p_nguyen_lieu_id,
              v_so_luong_xuat,
              p_don_hang_id,
              p_don_hang_chi_tiet_id,
              p_loai_xuat,
              v_batch.id,
              NOW(),
              'FEFO: ' || v_batch.batch_code
            )
            RETURNING id INTO v_xuat_id;
            
            -- Cập nhật batch inventory
            UPDATE batch_inventory
            SET 
              so_luong_ton = so_luong_ton - v_so_luong_xuat,
              trang_thai = CASE 
                WHEN so_luong_ton - v_so_luong_xuat <= 0 THEN 'DEPLETED'
                ELSE 'ACTIVE'
              END,
              updated_at = NOW()
            WHERE id = v_batch.id;
            
            -- Trả về kết quả
            batch_id := v_batch.id;
            batch_code := v_batch.batch_code;
            so_luong_xuat := v_so_luong_xuat;
            RETURN NEXT;
            
            v_remaining := v_remaining - v_so_luong_xuat;
          END;
        END LOOP;
        
        -- Kiểm tra nếu không đủ hàng
        IF v_remaining > 0 THEN
          RAISE WARNING 'Không đủ tồn kho! Nguyên liệu ID: %, Còn thiếu: %', 
            p_nguyen_lieu_id, v_remaining;
        END IF;
      END;
      $$;
    `);
    
    console.log('   ✅ Function xuat_kho_fefo đã tạo');
    
    // =====================================================================
    // 2. FUNCTION: TỰ ĐỘNG ĐÁNH DẤU BATCH HẾT HẠN
    // =====================================================================
    console.log('🔧 2. Tạo function mark_expired_batches...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION mark_expired_batches()
      RETURNS INT
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_count INT;
      BEGIN
        UPDATE batch_inventory
        SET 
          trang_thai = 'EXPIRED',
          updated_at = NOW()
        WHERE trang_thai = 'ACTIVE'
          AND ngay_het_han IS NOT NULL
          AND ngay_het_han < CURRENT_DATE
          AND so_luong_ton > 0;
        
        GET DIAGNOSTICS v_count = ROW_COUNT;
        
        RETURN v_count;
      END;
      $$;
    `);
    
    console.log('   ✅ Function mark_expired_batches đã tạo');
    
    // =====================================================================
    // 3. CẬP NHẬT FUNCTION AUTO_XUAT_KHO_DON_HANG ĐỂ DÙNG FEFO
    // =====================================================================
    console.log('🔧 3. Cập nhật function auto_xuat_kho_don_hang với FEFO...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION auto_xuat_kho_don_hang(p_don_hang_id INT)
      RETURNS VOID
      LANGUAGE plpgsql
      AS $$
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
          
          -- Kiểm tra tùy chọn đường
          IF EXISTS (
            SELECT 1 FROM don_hang_chi_tiet_tuy_chon dhctto
            JOIN tuy_chon tc ON tc.id = dhctto.tuy_chon_id
            WHERE dhctto.line_id = v_item.chi_tiet_id
              AND tc.loai = 'CHOICE'
              AND tc.ten ILIKE '%đường%'
          ) THEN
            SELECT dhctto.tuy_chon_id INTO v_tuy_chon_id
            FROM don_hang_chi_tiet_tuy_chon dhctto
            JOIN tuy_chon tc ON tc.id = dhctto.tuy_chon_id
            WHERE dhctto.line_id = v_item.chi_tiet_id
              AND tc.loai = 'CHOICE'
              AND tc.ten ILIKE '%đường%'
            LIMIT 1;
            
            SELECT 
              CASE 
                WHEN tc.ten ILIKE '%50%' THEN 0.5
                WHEN tc.ten ILIKE '%ít%' THEN 0.5
                WHEN tc.ten ILIKE '%nhiều%' THEN 1.5
                ELSE 1.0
              END
            INTO v_duong_percent
            FROM tuy_chon tc
            WHERE tc.id = v_tuy_chon_id;
          END IF;
          
          -- Kiểm tra tùy chọn đá
          IF EXISTS (
            SELECT 1 FROM don_hang_chi_tiet_tuy_chon dhctto
            JOIN tuy_chon tc ON tc.id = dhctto.tuy_chon_id
            WHERE dhctto.line_id = v_item.chi_tiet_id
              AND tc.loai = 'CHOICE'
              AND tc.ten ILIKE '%đá%'
          ) THEN
            SELECT dhctto.tuy_chon_id INTO v_tuy_chon_id
            FROM don_hang_chi_tiet_tuy_chon dhctto
            JOIN tuy_chon tc ON tc.id = dhctto.tuy_chon_id
            WHERE dhctto.line_id = v_item.chi_tiet_id
              AND tc.loai = 'CHOICE'
              AND tc.ten ILIKE '%đá%'
            LIMIT 1;
            
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
        END LOOP;
      END;
      $$;
    `);
    
    console.log('   ✅ Function auto_xuat_kho_don_hang đã cập nhật với FEFO');
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION FEFO TRIGGERS HOÀN TẤT!');
    console.log('='.repeat(80));
    console.log('\n📊 ĐÃ TẠO:');
    console.log('  ✅ Function xuat_kho_fefo() - Xuất kho theo FEFO');
    console.log('  ✅ Function mark_expired_batches() - Đánh dấu hết hạn');
    console.log('  ✅ Cập nhật auto_xuat_kho_don_hang() với FEFO logic');
    console.log('\n💡 CÁCH SỬ DỤNG:');
    console.log('  → Khi đơn hàng PAID, trigger tự động gọi auto_xuat_kho_don_hang()');
    console.log('  → Function sẽ xuất kho theo FEFO (hết hạn sớm nhất trước)');
    console.log('  → Batch inventory tự động cập nhật tồn kho\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ LỖI MIGRATION:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy migration
if (require.main === module) {
  migrate()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { migrate };

