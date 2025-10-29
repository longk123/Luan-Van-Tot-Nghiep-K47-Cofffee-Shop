/**
 * =====================================================================
 * MIGRATION: BATCH INVENTORY + FEFO SYSTEM
 * =====================================================================
 * 
 * Mục đích:
 * - Quản lý nguyên liệu theo từng lô hàng (batch)
 * - Theo dõi ngày hết hạn cho mỗi lô
 * - Tự động xuất kho theo FEFO (First Expired First Out)
 * - Block nguyên liệu đã hết hạn
 * 
 * Thay đổi:
 * 1. Tạo bảng batch_inventory - Quản lý từng lô hàng
 * 2. Sửa bảng nhap_kho - Thêm batch_id reference
 * 3. Sửa bảng xuat_kho - Thêm batch_id reference
 * 4. Tạo views mới cho batch tracking
 * 5. Tạo functions FEFO logic
 * 6. Tạo triggers tự động
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
    console.log('🚀 BẮT ĐẦU MIGRATION: BATCH INVENTORY + FEFO SYSTEM');
    console.log('='.repeat(80) + '\n');
    
    await client.query('BEGIN');
    
    // =====================================================================
    // 1. TẠO BẢNG BATCH_INVENTORY
    // =====================================================================
    console.log('📦 1. Tạo bảng batch_inventory...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS batch_inventory (
        id SERIAL PRIMARY KEY,
        
        -- Thông tin cơ bản
        batch_code VARCHAR(50) UNIQUE NOT NULL,  -- Mã lô: BT-20250101-001
        nguyen_lieu_id INT NOT NULL REFERENCES nguyen_lieu(id) ON DELETE RESTRICT,
        
        -- Số lượng
        so_luong_nhap NUMERIC(10,2) NOT NULL CHECK (so_luong_nhap > 0),  -- Số lượng nhập ban đầu
        so_luong_ton NUMERIC(10,2) NOT NULL CHECK (so_luong_ton >= 0),   -- Số lượng còn lại
        don_vi TEXT NOT NULL,  -- Lưu lại đơn vị tại thời điểm nhập
        
        -- Giá
        don_gia INT NOT NULL CHECK (don_gia >= 0),  -- Giá nhập/đơn vị
        thanh_tien_nhap INT GENERATED ALWAYS AS (CAST(so_luong_nhap * don_gia AS INT)) STORED,
        gia_tri_ton INT GENERATED ALWAYS AS (CAST(so_luong_ton * don_gia AS INT)) STORED,
        
        -- Ngày tháng
        ngay_nhap TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ngay_san_xuat DATE,  -- Ngày sản xuất (optional)
        ngay_het_han DATE,   -- Ngày hết hạn (optional)
        
        -- Trạng thái
        trang_thai VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (trang_thai IN (
          'ACTIVE',      -- Đang sử dụng
          'EXPIRED',     -- Đã hết hạn
          'DEPLETED',    -- Đã hết (so_luong_ton = 0)
          'BLOCKED'      -- Bị khóa (lỗi, thu hồi, etc.)
        )),
        
        -- Thông tin bổ sung
        nha_cung_cap TEXT,
        so_lo_nha_cung_cap TEXT,  -- Số lô của nhà cung cấp
        ghi_chu TEXT,
        ly_do_block TEXT,  -- Lý do khóa lô hàng
        
        -- Audit
        nguoi_nhap_id INT REFERENCES users(user_id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    // Indexes cho batch_inventory
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_batch_nguyen_lieu ON batch_inventory(nguyen_lieu_id);
      CREATE INDEX IF NOT EXISTS idx_batch_ngay_het_han ON batch_inventory(ngay_het_han) WHERE ngay_het_han IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_batch_trang_thai ON batch_inventory(trang_thai);
      CREATE INDEX IF NOT EXISTS idx_batch_active_fefo ON batch_inventory(nguyen_lieu_id, ngay_het_han, so_luong_ton) 
        WHERE trang_thai = 'ACTIVE' AND so_luong_ton > 0;
    `);
    
    console.log('   ✅ Bảng batch_inventory đã tạo');
    
    // =====================================================================
    // 2. THÊM CỘT BATCH_ID VÀO NHAP_KHO
    // =====================================================================
    console.log('📥 2. Cập nhật bảng nhap_kho...');
    
    // Kiểm tra xem cột đã tồn tại chưa
    const checkNhapKho = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'nhap_kho' AND column_name = 'batch_id'
    `);
    
    if (checkNhapKho.rows.length === 0) {
      await client.query(`
        ALTER TABLE nhap_kho
        ADD COLUMN batch_id INT REFERENCES batch_inventory(id) ON DELETE SET NULL,
        ADD COLUMN ngay_san_xuat DATE,
        ADD COLUMN ngay_het_han DATE
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_nhap_kho_batch ON nhap_kho(batch_id);
      `);
      
      console.log('   ✅ Đã thêm batch_id vào nhap_kho');
    } else {
      console.log('   ⚠️  Cột batch_id đã tồn tại trong nhap_kho');
    }
    
    // =====================================================================
    // 3. THÊM CỘT BATCH_ID VÀO XUAT_KHO
    // =====================================================================
    console.log('📤 3. Cập nhật bảng xuat_kho...');
    
    const checkXuatKho = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'xuat_kho' AND column_name = 'batch_id'
    `);
    
    if (checkXuatKho.rows.length === 0) {
      await client.query(`
        ALTER TABLE xuat_kho
        ADD COLUMN batch_id INT REFERENCES batch_inventory(id) ON DELETE SET NULL
      `);
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_xuat_kho_batch ON xuat_kho(batch_id);
      `);
      
      console.log('   ✅ Đã thêm batch_id vào xuat_kho');
    } else {
      console.log('   ⚠️  Cột batch_id đã tồn tại trong xuat_kho');
    }
    
    // =====================================================================
    // 4. TẠO FUNCTION: GENERATE BATCH CODE
    // =====================================================================
    console.log('🔧 4. Tạo function generate_batch_code...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_batch_code(p_nguyen_lieu_id INT)
      RETURNS TEXT
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_ma TEXT;
        v_date TEXT;
        v_count INT;
        v_batch_code TEXT;
      BEGIN
        -- Lấy mã nguyên liệu
        SELECT ma INTO v_ma FROM nguyen_lieu WHERE id = p_nguyen_lieu_id;
        
        -- Format: BT-YYYYMMDD-XXX
        v_date := TO_CHAR(NOW(), 'YYYYMMDD');
        
        -- Đếm số lô trong ngày
        SELECT COUNT(*) INTO v_count
        FROM batch_inventory
        WHERE batch_code LIKE 'BT-' || v_date || '%';
        
        v_batch_code := 'BT-' || v_date || '-' || LPAD((v_count + 1)::TEXT, 3, '0');
        
        RETURN v_batch_code;
      END;
      $$;
    `);
    
    console.log('   ✅ Function generate_batch_code đã tạo');
    
    // =====================================================================
    // 5. TẠO FUNCTION: CHECK EXPIRED BATCHES
    // =====================================================================
    console.log('🔧 5. Tạo function check_expired_batches...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION check_expired_batches()
      RETURNS TABLE(
        batch_id INT,
        batch_code VARCHAR,
        nguyen_lieu_id INT,
        nguyen_lieu_ten TEXT,
        so_luong_ton NUMERIC,
        ngay_het_han DATE,
        ngay_con_lai INT
      )
      LANGUAGE plpgsql
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          bi.id,
          bi.batch_code,
          bi.nguyen_lieu_id,
          nl.ten,
          bi.so_luong_ton,
          bi.ngay_het_han,
          (bi.ngay_het_han - CURRENT_DATE) AS ngay_con_lai
        FROM batch_inventory bi
        JOIN nguyen_lieu nl ON nl.id = bi.nguyen_lieu_id
        WHERE bi.trang_thai = 'ACTIVE'
          AND bi.so_luong_ton > 0
          AND bi.ngay_het_han IS NOT NULL
          AND bi.ngay_het_han <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY bi.ngay_het_han ASC;
      END;
      $$;
    `);
    
    console.log('   ✅ Function check_expired_batches đã tạo');
    
    // =====================================================================
    // 6. TẠO FUNCTION: GET BATCHES FOR FEFO
    // =====================================================================
    console.log('🔧 6. Tạo function get_batches_fefo...');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION get_batches_fefo(
        p_nguyen_lieu_id INT,
        p_so_luong_can NUMERIC
      )
      RETURNS TABLE(
        batch_id INT,
        batch_code VARCHAR,
        so_luong_ton NUMERIC,
        don_gia INT,
        ngay_het_han DATE,
        so_luong_xuat NUMERIC
      )
      LANGUAGE plpgsql
      AS $$
      DECLARE
        v_remaining NUMERIC := p_so_luong_can;
        v_batch RECORD;
      BEGIN
        -- Lấy các batch theo thứ tự FEFO:
        -- 1. Có ngày hết hạn -> ưu tiên hết hạn sớm nhất
        -- 2. Không có ngày hết hạn -> theo ngày nhập cũ nhất (FIFO)
        FOR v_batch IN
          SELECT 
            bi.id,
            bi.batch_code,
            bi.so_luong_ton,
            bi.don_gia,
            bi.ngay_het_han
          FROM batch_inventory bi
          WHERE bi.nguyen_lieu_id = p_nguyen_lieu_id
            AND bi.trang_thai = 'ACTIVE'
            AND bi.so_luong_ton > 0
            AND (bi.ngay_het_han IS NULL OR bi.ngay_het_han > CURRENT_DATE)  -- Không lấy hàng đã hết hạn
          ORDER BY 
            CASE WHEN bi.ngay_het_han IS NULL THEN 1 ELSE 0 END,  -- Có hạn lên trước
            bi.ngay_het_han ASC NULLS LAST,  -- Hết hạn sớm lên trước
            bi.ngay_nhap ASC  -- Nhập cũ lên trước
        LOOP
          IF v_remaining <= 0 THEN
            EXIT;
          END IF;
          
          batch_id := v_batch.id;
          batch_code := v_batch.batch_code;
          so_luong_ton := v_batch.so_luong_ton;
          don_gia := v_batch.don_gia;
          ngay_het_han := v_batch.ngay_het_han;
          
          -- Tính số lượng xuất từ batch này
          IF v_batch.so_luong_ton >= v_remaining THEN
            so_luong_xuat := v_remaining;
            v_remaining := 0;
          ELSE
            so_luong_xuat := v_batch.so_luong_ton;
            v_remaining := v_remaining - v_batch.so_luong_ton;
          END IF;
          
          RETURN NEXT;
        END LOOP;
        
        -- Nếu vẫn còn thiếu, raise warning
        IF v_remaining > 0 THEN
          RAISE WARNING 'Không đủ tồn kho! Còn thiếu: %', v_remaining;
        END IF;
      END;
      $$;
    `);
    
    console.log('   ✅ Function get_batches_fefo đã tạo');
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION PHASE 1 HOÀN TẤT!');
    console.log('='.repeat(80));
    console.log('\n📊 ĐÃ TẠO:');
    console.log('  ✅ Bảng batch_inventory với đầy đủ tracking');
    console.log('  ✅ Cập nhật nhap_kho + xuat_kho với batch_id');
    console.log('  ✅ Function generate_batch_code()');
    console.log('  ✅ Function check_expired_batches()');
    console.log('  ✅ Function get_batches_fefo()');
    console.log('\n💡 TIẾP THEO:');
    console.log('  → Tạo trigger tự động cập nhật batch');
    console.log('  → Tạo views cho batch tracking');
    console.log('  → Refactor backend repository\n');
    
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

