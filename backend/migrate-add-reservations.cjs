// migrate-add-reservations.cjs
// Migration: Thêm hệ thống đặt bàn (reservations)
// Date: 2025-10-22

const { Pool } = require('pg');
require('dotenv').config();

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
    console.log('🚀 Bắt đầu migration: Hệ thống đặt bàn...');
    
    await client.query('BEGIN');
    
    // 1. Extension cho exclusion constraint
    console.log('📦 Cài đặt extension btree_gist...');
    await client.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);
    
    // 2. Bảng khách hàng (tùy chọn)
    console.log('👥 Tạo bảng khach_hang...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS khach_hang (
        id            SERIAL PRIMARY KEY,
        ten           TEXT NOT NULL,
        so_dien_thoai TEXT UNIQUE,
        email         TEXT,
        ghi_chu       TEXT,
        created_at    TIMESTAMPTZ DEFAULT now(),
        updated_at    TIMESTAMPTZ DEFAULT now()
      )
    `);
    
    // 3. Drop bảng cũ nếu có (backup trước nếu có data)
    console.log('🗑️ Drop bảng dat_ban cũ (nếu có)...');
    await client.query(`
      DROP TABLE IF EXISTS dat_ban_ban CASCADE;
      DROP TABLE IF EXISTS dat_ban CASCADE;
    `);
    
    // 3. Bảng đặt bàn (header) - Schema mới
    console.log('📅 Tạo bảng dat_ban mới...');
    await client.query(`
      CREATE TABLE dat_ban (
        id              SERIAL PRIMARY KEY,
        khach_hang_id   INT REFERENCES khach_hang(id),
        ten_khach       TEXT,
        so_dien_thoai   TEXT,
        so_nguoi        INT NOT NULL CHECK (so_nguoi > 0),
        khu_vuc_id      INT REFERENCES khu_vuc(id),
        start_at        TIMESTAMPTZ NOT NULL,
        end_at          TIMESTAMPTZ NOT NULL CHECK (end_at > start_at),
        trang_thai      TEXT NOT NULL DEFAULT 'PENDING',
        nguon           TEXT DEFAULT 'PHONE',
        ghi_chu         TEXT,
        dat_coc         INT DEFAULT 0,
        dat_coc_trang_thai TEXT DEFAULT 'NONE',
        don_hang_id     INT REFERENCES don_hang(id),
        created_by      INT REFERENCES users(user_id),
        created_at      TIMESTAMPTZ DEFAULT now(),
        updated_at      TIMESTAMPTZ DEFAULT now()
      )
    `);
    
    // 4. Thêm constraint
    console.log('✅ Thêm constraint trạng thái...');
    await client.query(`
      ALTER TABLE dat_ban
        ADD CONSTRAINT chk_dat_ban_status
        CHECK (trang_thai IN ('PENDING','CONFIRMED','SEATED','COMPLETED','CANCELLED','NO_SHOW'));
      
      ALTER TABLE dat_ban
        ADD CONSTRAINT chk_dat_coc_status
        CHECK (dat_coc_trang_thai IN ('NONE','HELD','PAID','REFUNDED','FORFEIT'));
    `);
    
    // 5. Bảng liên kết đặt bàn - bàn
    console.log('🔗 Tạo bảng dat_ban_ban...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS dat_ban_ban (
        dat_ban_id  INT NOT NULL REFERENCES dat_ban(id) ON DELETE CASCADE,
        ban_id      INT NOT NULL REFERENCES ban(id),
        start_at    TIMESTAMPTZ NOT NULL,
        end_at      TIMESTAMPTZ NOT NULL,
        trang_thai  TEXT NOT NULL DEFAULT 'PENDING',
        PRIMARY KEY (dat_ban_id, ban_id)
      )
    `);
    
    // 6. Trigger đồng bộ thời gian từ dat_ban -> dat_ban_ban
    console.log('⚙️ Tạo trigger đồng bộ...');
    await client.query(`
      CREATE OR REPLACE FUNCTION trg_sync_dat_ban_to_links()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE dat_ban_ban
           SET start_at = NEW.start_at,
               end_at   = NEW.end_at,
               trang_thai = NEW.trang_thai
         WHERE dat_ban_id = NEW.id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS t_sync_dat_ban_to_links ON dat_ban;
      CREATE TRIGGER t_sync_dat_ban_to_links
      AFTER UPDATE OF start_at, end_at, trang_thai ON dat_ban
      FOR EACH ROW EXECUTE FUNCTION trg_sync_dat_ban_to_links();
    `);
    
    // 7. Trigger set default values khi insert link
    await client.query(`
      CREATE OR REPLACE FUNCTION trg_default_times_on_link()
      RETURNS TRIGGER AS $$
      DECLARE v_dat_ban dat_ban;
      BEGIN
        SELECT * INTO v_dat_ban FROM dat_ban WHERE id = NEW.dat_ban_id;
        IF v_dat_ban IS NULL THEN
          RAISE EXCEPTION 'dat_ban_id % không tồn tại', NEW.dat_ban_id;
        END IF;
        NEW.start_at  := v_dat_ban.start_at;
        NEW.end_at    := v_dat_ban.end_at;
        NEW.trang_thai:= v_dat_ban.trang_thai;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS t_default_times_on_link ON dat_ban_ban;
      CREATE TRIGGER t_default_times_on_link
      BEFORE INSERT ON dat_ban_ban
      FOR EACH ROW EXECUTE FUNCTION trg_default_times_on_link();
    `);
    
    // 8. Exclusion constraint - chống trùng lịch
    console.log('🔒 Thêm exclusion constraint chống trùng lịch...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname='ex_dat_ban_ban_no_overlap'
        ) THEN
          ALTER TABLE dat_ban_ban
            ADD CONSTRAINT ex_dat_ban_ban_no_overlap
            EXCLUDE USING gist (
              ban_id WITH =,
              tstzrange(start_at, end_at) WITH &&
            )
            WHERE (trang_thai IN ('PENDING','CONFIRMED','SEATED'));
        END IF;
      END $$;
    `);
    
    // 9. Function kiểm tra bàn trống
    console.log('🔍 Tạo function kiểm tra bàn trống...');
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_tables_available(
        p_start TIMESTAMPTZ, 
        p_end TIMESTAMPTZ, 
        p_khu_vuc INT DEFAULT NULL
      )
      RETURNS TABLE (
        ban_id INT,
        ten_ban TEXT,
        khu_vuc_id INT,
        suc_chua INT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT t.id, t.ten_ban, t.khu_vuc_id, t.suc_chua
          FROM ban t
         WHERE (p_khu_vuc IS NULL OR t.khu_vuc_id = p_khu_vuc)
           AND t.trang_thai = 'TRONG'
           AND NOT EXISTS (
             SELECT 1 FROM dat_ban_ban l
             WHERE l.ban_id = t.id
               AND l.trang_thai IN ('PENDING','CONFIRMED','SEATED')
               AND tstzrange(l.start_at, l.end_at) && tstzrange(p_start, p_end)
           );
      END;
      $$ LANGUAGE plpgsql STABLE;
    `);
    
    // 10. View lịch đặt bàn (simplified - chỉ show data mới)
    console.log('👁️ Tạo view v_reservation_calendar...');
    await client.query(`
      CREATE OR REPLACE VIEW v_reservation_calendar AS
      SELECT
        r.*,
        COALESCE(k.ten, r.ten_khach) AS khach,
        COALESCE(k.so_dien_thoai, r.so_dien_thoai) AS sdt,
        NULL::TEXT AS khu_vuc_ten,
        array_agg(l.ban_id ORDER BY l.ban_id) FILTER (WHERE l.ban_id IS NOT NULL) AS ban_ids,
        string_agg(b.ten_ban, ', ' ORDER BY l.ban_id) AS ban_names
      FROM dat_ban r
      LEFT JOIN khach_hang k ON k.id = r.khach_hang_id
      LEFT JOIN dat_ban_ban l ON l.dat_ban_id = r.id
      LEFT JOIN ban b ON b.id = l.ban_id
      WHERE r.ten_khach IS NOT NULL  -- chỉ lấy data mới
      GROUP BY r.id, k.ten, k.so_dien_thoai;
    `);
    
    // 11. Index cho performance
    console.log('⚡ Tạo indexes...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dat_ban_start_at ON dat_ban(start_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dat_ban_trang_thai ON dat_ban(trang_thai)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dat_ban_sdt ON dat_ban(so_dien_thoai)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_khach_hang_sdt ON khach_hang(so_dien_thoai)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_dat_ban_ban_dates ON dat_ban_ban(start_at, end_at)`);
    
    // 12. Sample data (optional)
    console.log('📝 Thêm dữ liệu mẫu...');
    await client.query(`
      INSERT INTO khach_hang (ten, so_dien_thoai, email) VALUES
      ('Nguyễn Văn A', '0901234567', 'nguyenvana@example.com'),
      ('Trần Thị B', '0912345678', 'tranthib@example.com')
      ON CONFLICT (so_dien_thoai) DO NOTHING;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration hoàn tất!');
    console.log('');
    console.log('📋 Đã tạo:');
    console.log('  - Bảng: khach_hang, dat_ban, dat_ban_ban');
    console.log('  - Function: fn_tables_available()');
    console.log('  - View: v_reservation_calendar');
    console.log('  - Trigger: sync thời gian & trạng thái');
    console.log('  - Constraint: chống trùng lịch đặt bàn');
    console.log('');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

