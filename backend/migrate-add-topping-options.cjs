// File: backend/migrate-add-topping-options.js
// Migration: Add TOPPING/AMOUNT options with pricing support
// Date: 2025-10-20

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Đang kết nối database...');
    await client.query('BEGIN');

    // ========== 1) THÊM CỘT gia_mac_dinh VÀO tuy_chon_mon ==========
    console.log('📝 Thêm cột gia_mac_dinh vào tuy_chon_mon...');
    await client.query(`
      ALTER TABLE tuy_chon_mon
        ADD COLUMN IF NOT EXISTS gia_mac_dinh INT DEFAULT 0
    `);

    // ========== 2) THÊM CONSTRAINT CHO AMOUNT TYPE ==========
    console.log('📝 Thêm constraint cho loại AMOUNT...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname='chk_tcm_amount_unit_hint'
        ) THEN
          ALTER TABLE tuy_chon_mon
          ADD CONSTRAINT chk_tcm_amount_unit_hint
          CHECK (loai <> 'AMOUNT' OR don_vi IS NOT NULL);
        END IF;
      END$$;
    `);

    // ========== 3) THÊM CỘT so_luong VÀO don_hang_chi_tiet_tuy_chon ==========
    console.log('📝 Thêm cột so_luong vào don_hang_chi_tiet_tuy_chon...');
    await client.query(`
      ALTER TABLE don_hang_chi_tiet_tuy_chon
        ADD COLUMN IF NOT EXISTS so_luong NUMERIC(8,3) DEFAULT 1
    `);

    // ========== 4) TẠO BẢNG GIÁ TOPPING (tuy_chon_gia) ==========
    console.log('📝 Tạo bảng tuy_chon_gia...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tuy_chon_gia (
        id SERIAL PRIMARY KEY,
        tuy_chon_id INT NOT NULL REFERENCES tuy_chon_mon(id) ON DELETE CASCADE,
        mon_id INT NULL REFERENCES mon(id) ON DELETE CASCADE,
        mon_bien_the_id INT NULL REFERENCES mon_bien_the(id) ON DELETE CASCADE,
        gia INT NOT NULL CHECK (gia >= 0),
        CONSTRAINT uq_tuy_chon_gia UNIQUE (tuy_chon_id, mon_id, mon_bien_the_id)
      )
    `);

    // ========== 5) TẠO VIEW: ĐỊNH GIÁ TOPPING AMOUNT ==========
    console.log('📝 Tạo view v_line_option_amount_pricing...');
    await client.query(`
      CREATE OR REPLACE VIEW v_line_option_amount_pricing AS
      SELECT
        o.id                      AS line_option_id,
        d.id                      AS line_id,
        d.don_hang_id            AS order_id,
        d.mon_id,
        d.bien_the_id,
        o.tuy_chon_id,
        tc.ma                    AS tuy_chon_ma,
        tc.ten                   AS tuy_chon_ten,
        tc.don_vi,
        COALESCE(o.so_luong,1)   AS so_luong_don_vi,
        COALESCE(
          (SELECT gia FROM tuy_chon_gia g WHERE g.tuy_chon_id=o.tuy_chon_id AND g.mon_bien_the_id=d.bien_the_id LIMIT 1),
          (SELECT gia FROM tuy_chon_gia g WHERE g.tuy_chon_id=o.tuy_chon_id AND g.mon_id=d.mon_id AND g.mon_bien_the_id IS NULL LIMIT 1),
          tc.gia_mac_dinh
        )                         AS gia_moi_don_vi,
        (COALESCE(o.so_luong,1) *
         COALESCE(
           (SELECT gia FROM tuy_chon_gia g WHERE g.tuy_chon_id=o.tuy_chon_id AND g.mon_bien_the_id=d.bien_the_id LIMIT 1),
           (SELECT gia FROM tuy_chon_gia g WHERE g.tuy_chon_id=o.tuy_chon_id AND g.mon_id=d.mon_id AND g.mon_bien_the_id IS NULL LIMIT 1),
           tc.gia_mac_dinh
         )
        )::INT                    AS tien_topping_line
      FROM don_hang_chi_tiet_tuy_chon o
      JOIN don_hang_chi_tiet d ON d.id = o.line_id
      JOIN tuy_chon_mon tc ON tc.id = o.tuy_chon_id
      WHERE tc.loai = 'AMOUNT'
    `);

    // ========== 6) TẠO VIEW: LINE CHI TIẾT + TOPPING ==========
    console.log('📝 Tạo view v_open_order_items_with_addons...');
    await client.query(`
      CREATE OR REPLACE VIEW v_open_order_items_with_addons AS
      WITH base AS (
        SELECT
          o.id AS order_id,
          d.id AS line_id,
          d.mon_id,
          m.ten AS ten_mon,
          d.bien_the_id,
          mbt.ten_bien_the,
          d.so_luong,
          d.don_gia,
          COALESCE(d.giam_gia,0) AS giam_gia,
          (d.so_luong*d.don_gia - COALESCE(d.giam_gia,0)) AS base_line_total,
          d.ghi_chu,
          d.trang_thai_che_bien
        FROM don_hang o
        JOIN don_hang_chi_tiet d ON d.don_hang_id=o.id
        LEFT JOIN mon m ON m.id=d.mon_id
        LEFT JOIN mon_bien_the mbt ON mbt.id=d.bien_the_id
        WHERE o.trang_thai='OPEN'
      ),
      tops AS (
        SELECT line_id, COALESCE(SUM(tien_topping_line),0)::INT AS topping_total
        FROM v_line_option_amount_pricing
        GROUP BY line_id
      ),
      opts AS (
        SELECT
          d.id AS line_id,
          jsonb_agg(
            jsonb_build_object(
              'ma',  tc.ma,
              'ten', tc.ten,
              'loai', tc.loai,
              'don_vi', tc.don_vi,
              'muc', COALESCE(m.ten,NULL),
              'he_so', o.he_so,
              'so_luong', o.so_luong
            )
            ORDER BY tc.ma
          ) FILTER (WHERE o.id IS NOT NULL) AS options
        FROM don_hang_chi_tiet d
        LEFT JOIN don_hang_chi_tiet_tuy_chon o ON o.line_id=d.id
        LEFT JOIN tuy_chon_mon tc ON tc.id=o.tuy_chon_id
        LEFT JOIN tuy_chon_muc m ON m.id=o.muc_id
        GROUP BY d.id
      )
      SELECT
        b.*,
        COALESCE(t.topping_total,0) AS topping_total,
        (b.base_line_total + COALESCE(t.topping_total,0))::INT AS line_total_with_addons,
        o.options
      FROM base b
      LEFT JOIN tops t ON t.line_id=b.line_id
      LEFT JOIN opts o ON o.line_id=b.line_id
      ORDER BY b.line_id
    `);

    // ========== 7) THÊM LẠI DELETE TRIGGER CHO OPTIONS ==========
    console.log('📝 Thêm lại DELETE trigger cho don_hang_chi_tiet_tuy_chon...');
    await client.query(`
      DROP TRIGGER IF EXISTS t_dhctopt_before_del ON don_hang_chi_tiet_tuy_chon
    `);
    await client.query(`
      CREATE TRIGGER t_dhctopt_before_del
      BEFORE DELETE ON don_hang_chi_tiet_tuy_chon
      FOR EACH ROW
      EXECUTE FUNCTION trg_dhctopt_guard()
    `);

    // ========== 8) SEED: THÊM TOPPING OPTIONS ==========
    console.log('📝 Thêm tùy chọn topping (AMOUNT)...');
    await client.query(`
      INSERT INTO tuy_chon_mon(ma, ten, loai, don_vi, gia_mac_dinh) VALUES
        ('TOPPING_FLAN',  'Bánh flan', 'AMOUNT', 'viên', 8000),
        ('TOPPING_THACH', 'Thạch dừa', 'AMOUNT', 'vá',   3000)
      ON CONFLICT (ma) DO NOTHING
    `);

    await client.query('COMMIT');
    console.log('✅ Migration hoàn tất!');
    console.log('\n📋 Những gì đã thêm:');
    console.log('  • Cột gia_mac_dinh cho tuy_chon_mon');
    console.log('  • Cột so_luong cho don_hang_chi_tiet_tuy_chon');
    console.log('  • Bảng tuy_chon_gia (bảng giá topping theo món/biến thể)');
    console.log('  • View v_line_option_amount_pricing');
    console.log('  • View v_open_order_items_with_addons (có tính topping)');
    console.log('  • DELETE trigger cho options');
    console.log('  • Topping: Bánh flan (8,000đ/viên), Thạch dừa (3,000đ/vá)');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration thất bại:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy migration
migrate().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

