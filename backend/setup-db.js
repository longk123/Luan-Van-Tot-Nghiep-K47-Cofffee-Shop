// File path: D:\my-thesis\backend\setup-db.js
// backend/setup-db.js - Complete Database Setup Script
const { Pool } = require('pg');

// Cấu hình database (có thể thay đổi theo môi trường của bạn)
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function setupDatabase() {
  try {
    console.log('🔗 Đang kết nối database...');
    
    // Test connection
    const { rows } = await pool.query('SELECT NOW() AS now');
    console.log('✅ Kết nối database thành công:', rows[0].now);

    console.log('📝 Bắt đầu tạo cấu trúc database...');

    // =========================================================
    // 1. BẢNG ROLES
    // =========================================================
    console.log('📝 Tạo bảng roles...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        role_id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT
      )
    `);

    // =========================================================
    // 2. BẢNG USERS
    // =========================================================
    console.log('📝 Tạo bảng users...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // =========================================================
    // 3. BẢNG USER_ROLES
    // =========================================================
    console.log('📝 Tạo bảng user_roles...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        role_id INT REFERENCES roles(role_id) ON DELETE CASCADE,
        PRIMARY KEY (user_id, role_id)
      )
    `);

    // =========================================================
    // 4. BẢNG BAN (TABLES)
    // =========================================================
    console.log('📝 Tạo bảng ban...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ban (
        id SERIAL PRIMARY KEY,
        ten_ban TEXT NOT NULL UNIQUE,
        khu_vuc TEXT,
        suc_chua INT DEFAULT 2 CHECK (suc_chua > 0),
        trang_thai TEXT NOT NULL DEFAULT 'TRONG' CHECK (trang_thai IN ('TRONG','DANG_DUNG','KHOA')),
        ghi_chu TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tạo indexes cho bảng ban
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ban_trang_thai ON ban(trang_thai)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ban_khu_vuc ON ban(khu_vuc)`);

    // =========================================================
    // 5. EXTENSION CHO RÀNG BUỘC CHỒNG CA
    // =========================================================
    console.log('📝 Tạo extension btree_gist...');
    await pool.query(`CREATE EXTENSION IF NOT EXISTS btree_gist`);

    // =========================================================
    // 6. BẢNG CA_LAM (SHIFTS)
    // =========================================================
    console.log('📝 Tạo bảng ca_lam...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ca_lam (
        id              SERIAL PRIMARY KEY,
        nhan_vien_id    INT NOT NULL REFERENCES users(user_id),
        started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ended_at        TIMESTAMPTZ,
        status          TEXT NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN','CLOSED')),
        business_day    DATE,
        opening_cash    INT CHECK (opening_cash >= 0),
        closing_cash    INT CHECK (closing_cash >= 0),
        opened_by       INT REFERENCES users(user_id),
        closed_by       INT REFERENCES users(user_id),
        note            TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CHECK (ended_at IS NULL OR ended_at > started_at)
      )
    `);

    // =========================================================
    // 7. TRIGGER CHO CA_LAM
    // =========================================================
    console.log('📝 Tạo trigger cho ca_lam...');
    await pool.query(`
      CREATE OR REPLACE FUNCTION trg_set_business_day_fn()
      RETURNS trigger AS $$
      BEGIN
        NEW.business_day := ((NEW.started_at AT TIME ZONE 'Asia/Ho_Chi_Minh') - INTERVAL '6 hours')::date;
        NEW.updated_at := NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await pool.query(`DROP TRIGGER IF EXISTS trg_set_business_day ON ca_lam`);
    await pool.query(`
      CREATE TRIGGER trg_set_business_day
      BEFORE INSERT OR UPDATE OF started_at ON ca_lam
      FOR EACH ROW EXECUTE FUNCTION trg_set_business_day_fn()
    `);

    // Ràng buộc chống chồng ca
    await pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'no_overlap_per_user'
            AND conrelid = 'ca_lam'::regclass
        ) THEN
          ALTER TABLE ca_lam DROP CONSTRAINT no_overlap_per_user;
        END IF;
      END$$;
    `);

    await pool.query(`
      ALTER TABLE ca_lam
        ADD CONSTRAINT no_overlap_per_user EXCLUDE USING gist (
          nhan_vien_id WITH =,
          tstzrange(started_at, COALESCE(ended_at, 'infinity')) WITH &&
        )
    `);

    // Indexes cho ca_lam
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ca_lam_user_status ON ca_lam(nhan_vien_id, status)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ca_lam_bday_user ON ca_lam(business_day, nhan_vien_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ca_lam_open_user ON ca_lam(nhan_vien_id) WHERE status = 'OPEN'`);

    // =========================================================
    // 8. BẢNG KHU_VUC (AREAS)
    // =========================================================
    console.log('📝 Tạo bảng khu_vuc...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS khu_vuc (
        id SERIAL PRIMARY KEY,
        ten TEXT NOT NULL UNIQUE,
        mo_ta TEXT,
        thu_tu INT DEFAULT 0,
        active BOOLEAN DEFAULT TRUE
      )
    `);

    // Thêm cột khu_vuc_id vào ban
    await pool.query(`ALTER TABLE ban ADD COLUMN IF NOT EXISTS khu_vuc_id INT REFERENCES khu_vuc(id)`);

    // =========================================================
    // 9. BẢNG DON_HANG (ORDERS)
    // =========================================================
    console.log('📝 Tạo bảng don_hang...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS don_hang (
        id SERIAL PRIMARY KEY,
        ban_id INT REFERENCES ban(id),
        nhan_vien_id INT REFERENCES users(user_id),
        ca_lam_id INT REFERENCES ca_lam(id),
        trang_thai TEXT NOT NULL DEFAULT 'OPEN' CHECK (trang_thai IN ('OPEN','PAID','CANCELLED')),
        opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMPTZ,
        order_type TEXT DEFAULT 'DINE_IN' CHECK (order_type IN ('DINE_IN','TAKEAWAY')),
        ly_do_huy TEXT NULL
      )
    `);

    // Unique constraint cho đơn mở
    await pool.query(`DROP INDEX IF EXISTS uq_open_order_per_table`);
    await pool.query(`
      CREATE UNIQUE INDEX uq_open_order_per_table
        ON don_hang (ban_id)
        WHERE trang_thai = 'OPEN' AND ban_id IS NOT NULL AND order_type = 'DINE_IN'
    `);

    // Thêm cột ly_do_huy nếu chưa có (migration)
    await pool.query(`ALTER TABLE don_hang ADD COLUMN IF NOT EXISTS ly_do_huy TEXT NULL`);

    // Indexes cho don_hang
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_don_hang_ban ON don_hang(ban_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_don_hang_ca ON don_hang(ca_lam_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_don_hang_status ON don_hang(trang_thai)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_don_hang_opened_at ON don_hang(opened_at)`);

    // =========================================================
    // 10. BẢNG LOAI_MON (CATEGORIES)
    // =========================================================
    console.log('📝 Tạo bảng loai_mon...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS loai_mon (
        id        SERIAL PRIMARY KEY,
        ten       TEXT NOT NULL UNIQUE,
        mo_ta     TEXT,
        thu_tu    INT DEFAULT 0,
        active    BOOLEAN DEFAULT TRUE
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_loai_mon_active ON loai_mon(active)`);

    // =========================================================
    // 11. BẢNG MON (MENU ITEMS)
    // =========================================================
    console.log('📝 Tạo bảng mon...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mon (
        id              SERIAL PRIMARY KEY,
        ten             TEXT NOT NULL,
        ma              TEXT UNIQUE,
        loai_id         INT REFERENCES loai_mon(id),
        don_vi          TEXT DEFAULT 'ly',
        gia_mac_dinh    INT NOT NULL CHECK (gia_mac_dinh >= 0),
        active          BOOLEAN DEFAULT TRUE,
        thu_tu          INT DEFAULT 0,
        mo_ta           TEXT,
        hinh_anh        TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Indexes cho mon
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mon_loai ON mon(loai_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mon_active ON mon(active)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_mon_thu_tu ON mon(thu_tu)`);

    // =========================================================
    // 12. BẢNG MON_BIEN_THE (VARIATIONS)
    // =========================================================
    console.log('📝 Tạo bảng mon_bien_the...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mon_bien_the (
        id           SERIAL PRIMARY KEY,
        mon_id       INT NOT NULL REFERENCES mon(id) ON DELETE CASCADE,
        ten_bien_the TEXT NOT NULL,
        gia          INT NOT NULL CHECK (gia >= 0),
        thu_tu       INT DEFAULT 0,
        active       BOOLEAN DEFAULT TRUE,
        UNIQUE(mon_id, ten_bien_the)
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bienthe_mon ON mon_bien_the(mon_id)`);

    // =========================================================
    // 13. BẢNG DON_HANG_CHI_TIET (ORDER ITEMS)
    // =========================================================
    console.log('📝 Tạo bảng don_hang_chi_tiet...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS don_hang_chi_tiet (
        id SERIAL PRIMARY KEY,
        don_hang_id INT NOT NULL REFERENCES don_hang(id) ON DELETE CASCADE,
        mon_id INT REFERENCES mon(id),
        bien_the_id INT REFERENCES mon_bien_the(id),
        so_luong INT NOT NULL CHECK (so_luong > 0),
        don_gia INT NOT NULL CHECK (don_gia >= 0),
        giam_gia INT DEFAULT 0 CHECK (giam_gia >= 0),
        ten_mon_snapshot TEXT,
        gia_niem_yet_snapshot INT CHECK (gia_niem_yet_snapshot >= 0)
      )
    `);

    // Indexes cho don_hang_chi_tiet
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dhct_order ON don_hang_chi_tiet(don_hang_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dhct_mon ON don_hang_chi_tiet(mon_id)`);

    // =========================================================
    // 13B. MỞ RỘNG DON_HANG_CHI_TIET - PER-CUP STATUS & TIMESTAMPS
    // =========================================================
    console.log('📝 Mở rộng don_hang_chi_tiet với trạng thái chế biến...');
    await pool.query(`
      ALTER TABLE don_hang_chi_tiet
        ADD COLUMN IF NOT EXISTS ghi_chu TEXT,
        ADD COLUMN IF NOT EXISTS trang_thai_che_bien TEXT DEFAULT 'QUEUED',
        ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS maker_id INT REFERENCES users(user_id)
    `);

    // Thêm constraint cho trạng thái chế biến
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.constraint_column_usage
          WHERE table_name='don_hang_chi_tiet' AND constraint_name='chk_dhct_trang_thai_che_bien'
        ) THEN
          ALTER TABLE don_hang_chi_tiet
            ADD CONSTRAINT chk_dhct_trang_thai_che_bien
            CHECK (trang_thai_che_bien IN ('QUEUED','MAKING','DONE','CANCELLED'));
        END IF;
      END$$;
    `);

    // =========================================================
    // 13C. BẢNG TÙY CHỌN MÓN (SUGAR, ICE, ...)
    // =========================================================
    console.log('📝 Tạo bảng tùy chọn món (tuy_chon_mon)...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tuy_chon_mon (
        id           SERIAL PRIMARY KEY,
        ma           TEXT UNIQUE NOT NULL,
        ten          TEXT NOT NULL,
        don_vi       TEXT,
        loai         TEXT NOT NULL DEFAULT 'PERCENT'
      )
    `);

    console.log('📝 Tạo bảng các mức tùy chọn (tuy_chon_muc)...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tuy_chon_muc (
        id           SERIAL PRIMARY KEY,
        tuy_chon_id  INT NOT NULL REFERENCES tuy_chon_mon(id) ON DELETE CASCADE,
        ten          TEXT NOT NULL,
        gia_tri      NUMERIC(6,3) NOT NULL,
        thu_tu       INT DEFAULT 1
      )
    `);

    console.log('📝 Tạo bảng áp dụng tùy chọn cho món (mon_tuy_chon_ap_dung)...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mon_tuy_chon_ap_dung (
        mon_id       INT NOT NULL REFERENCES mon(id) ON DELETE CASCADE,
        tuy_chon_id  INT NOT NULL REFERENCES tuy_chon_mon(id) ON DELETE CASCADE,
        PRIMARY KEY (mon_id, tuy_chon_id)
      )
    `);

    // =========================================================
    // 13D. BẢNG TÙY CHỌN CHO TỪNG LINE
    // =========================================================
    console.log('📝 Tạo bảng tùy chọn cho từng line (don_hang_chi_tiet_tuy_chon)...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS don_hang_chi_tiet_tuy_chon (
        id            SERIAL PRIMARY KEY,
        line_id       INT NOT NULL REFERENCES don_hang_chi_tiet(id) ON DELETE CASCADE,
        tuy_chon_id   INT NOT NULL REFERENCES tuy_chon_mon(id),
        muc_id        INT NULL REFERENCES tuy_chon_muc(id),
        he_so         NUMERIC(6,3) NOT NULL,
        created_at    TIMESTAMPTZ DEFAULT now(),
        CONSTRAINT uq_line_option UNIQUE (line_id, tuy_chon_id)
      )
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dhctopt_line ON don_hang_chi_tiet_tuy_chon(line_id)`);

    // =========================================================
    // 13E. HÀM & TRIGGER: CHẶN SỬA/XÓA KHI ĐÃ LÀM HOẶC ĐÃ PAY
    // =========================================================
    console.log('📝 Tạo hàm & trigger bảo vệ line editable...');
    
    // Hàm kiểm tra editable
    await pool.query(`
      CREATE OR REPLACE FUNCTION fn_assert_editable_line(p_line_id INT)
      RETURNS VOID AS $$
      DECLARE
        v_order_id   INT;
        v_order_stt  TEXT;
        v_line_stt   TEXT;
      BEGIN
        SELECT d.don_hang_id, d.trang_thai_che_bien
          INTO v_order_id, v_line_stt
        FROM don_hang_chi_tiet d
        WHERE d.id = p_line_id;

        IF v_order_id IS NULL THEN
          RAISE EXCEPTION 'Dòng đơn hàng không tồn tại (line_id=%).', p_line_id;
        END IF;

        SELECT trang_thai INTO v_order_stt
        FROM don_hang WHERE id = v_order_id;

        IF v_order_stt = 'PAID' THEN
          RAISE EXCEPTION 'Không thể sửa/xóa: Đơn đã thanh toán.';
        END IF;

        -- Chỉ cho thao tác khi còn QUEUED
        IF v_line_stt IS NULL OR v_line_stt <> 'QUEUED' THEN
          RAISE EXCEPTION 'Không thể sửa/xóa: Món đã/đang được làm (trạng thái: %).', v_line_stt;
        END IF;
      END;
      $$ LANGUAGE plpgsql
    `);

    // Trigger DELETE line
    await pool.query(`
      CREATE OR REPLACE FUNCTION trg_dhct_before_delete()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM fn_assert_editable_line(OLD.id);
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql
    `);

    await pool.query(`DROP TRIGGER IF EXISTS t_dhct_before_delete ON don_hang_chi_tiet`);
    await pool.query(`
      CREATE TRIGGER t_dhct_before_delete
      BEFORE DELETE ON don_hang_chi_tiet
      FOR EACH ROW
      EXECUTE FUNCTION trg_dhct_before_delete()
    `);

    // Trigger UPDATE line
    await pool.query(`
      CREATE OR REPLACE FUNCTION trg_dhct_before_update()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (OLD.mon_id        IS DISTINCT FROM NEW.mon_id)
           OR (OLD.bien_the_id IS DISTINCT FROM NEW.bien_the_id)
           OR (OLD.so_luong    IS DISTINCT FROM NEW.so_luong)
           OR (OLD.don_gia     IS DISTINCT FROM NEW.don_gia)
           OR (OLD.giam_gia    IS DISTINCT FROM NEW.giam_gia)
           OR (OLD.ghi_chu     IS DISTINCT FROM NEW.ghi_chu)
        THEN
          PERFORM fn_assert_editable_line(OLD.id);
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);

    await pool.query(`DROP TRIGGER IF EXISTS t_dhct_before_update ON don_hang_chi_tiet`);
    await pool.query(`
      CREATE TRIGGER t_dhct_before_update
      BEFORE UPDATE ON don_hang_chi_tiet
      FOR EACH ROW
      EXECUTE FUNCTION trg_dhct_before_update()
    `);

    // Trigger bảo vệ bảng tùy chọn
    await pool.query(`
      CREATE OR REPLACE FUNCTION trg_dhctopt_guard()
      RETURNS TRIGGER AS $$
      DECLARE
        v_line_id INT;
      BEGIN
        IF TG_OP = 'INSERT' THEN
          v_line_id := NEW.line_id;
        ELSIF TG_OP = 'UPDATE' THEN
          v_line_id := NEW.line_id;
        ELSE
          v_line_id := OLD.line_id;
        END IF;

        PERFORM fn_assert_editable_line(v_line_id);
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql
    `);

    await pool.query(`DROP TRIGGER IF EXISTS t_dhctopt_before_ins ON don_hang_chi_tiet_tuy_chon`);
    await pool.query(`
      CREATE TRIGGER t_dhctopt_before_ins
      BEFORE INSERT ON don_hang_chi_tiet_tuy_chon
      FOR EACH ROW
      EXECUTE FUNCTION trg_dhctopt_guard()
    `);

    await pool.query(`DROP TRIGGER IF EXISTS t_dhctopt_before_upd ON don_hang_chi_tiet_tuy_chon`);
    await pool.query(`
      CREATE TRIGGER t_dhctopt_before_upd
      BEFORE UPDATE ON don_hang_chi_tiet_tuy_chon
      FOR EACH ROW
      EXECUTE FUNCTION trg_dhctopt_guard()
    `);

    // KHÔNG cần trigger DELETE guard cho options vì:
    // - Khi xóa line, options tự động CASCADE DELETE
    // - Trigger DELETE gây race condition (line đã bị xóa trước khi check)
    // - Chỉ cần guard INSERT/UPDATE là đủ
    await pool.query(`DROP TRIGGER IF EXISTS t_dhctopt_before_del ON don_hang_chi_tiet_tuy_chon`);
    // Note: Không tạo lại trigger DELETE vì nó gây conflict với CASCADE delete từ don_hang_chi_tiet

    // =========================================================
    // 14. BẢNG DAT_BAN (RESERVATIONS)
    // =========================================================
    console.log('📝 Tạo bảng dat_ban...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dat_ban (
        id SERIAL PRIMARY KEY,
        ban_id INT NOT NULL REFERENCES ban(id),
        khach_ten TEXT,
        khach_sdt TEXT,
        start_at TIMESTAMPTZ NOT NULL,
        end_at   TIMESTAMPTZ NOT NULL,
        trang_thai TEXT NOT NULL DEFAULT 'BOOKED' CHECK (trang_thai IN ('BOOKED','SEATED','CANCELLED','NO_SHOW')),
        ghi_chu TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        CHECK (end_at > start_at)
      )
    `);

    // Indexes cho dat_ban
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dat_ban_time ON dat_ban(start_at, end_at)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dat_ban_ban ON dat_ban(ban_id)`);

    // =========================================================
    // 15. VIEWS
    // =========================================================
    console.log('📝 Tạo views...');
    await pool.query(`
      CREATE OR REPLACE VIEW v_open_order_per_table AS
      SELECT
        o.ban_id,
        o.id AS order_id,
        o.opened_at,
        COALESCE(SUM(d.so_luong), 0) AS item_count,
        COALESCE(SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0)), 0) AS subtotal
      FROM don_hang o
      LEFT JOIN don_hang_chi_tiet d ON d.don_hang_id = o.id
      WHERE o.trang_thai = 'OPEN'
      GROUP BY o.ban_id, o.id, o.opened_at
    `);

    await pool.query(`
      CREATE OR REPLACE VIEW v_open_order_items_detail AS
      SELECT
        o.id                    AS order_id,
        d.id                    AS line_id,
        d.mon_id,
        m.ten                   AS ten_mon,
        d.bien_the_id,
        mbt.ten_bien_the        AS ten_bien_the,
        d.so_luong,
        d.don_gia,
        COALESCE(d.giam_gia, 0) AS giam_gia,
        (d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0)) AS line_total
      FROM don_hang o
      JOIN don_hang_chi_tiet d ON d.don_hang_id = o.id
      LEFT JOIN mon m           ON m.id = d.mon_id
      LEFT JOIN mon_bien_the mbt ON mbt.id = d.bien_the_id
      WHERE o.trang_thai = 'OPEN'
    `);

    // View: Tùy chọn đã chọn cho từng line
    await pool.query(`
      CREATE OR REPLACE VIEW v_order_line_options AS
      SELECT
        d.id              AS line_id,
        d.don_hang_id     AS order_id,
        o.tuy_chon_id,
        tc.ma             AS tuy_chon_ma,
        tc.ten            AS tuy_chon_ten,
        o.muc_id,
        m.ten             AS muc_ten,
        o.he_so,
        d.trang_thai_che_bien
      FROM don_hang_chi_tiet d
      JOIN don_hang_chi_tiet_tuy_chon o ON o.line_id = d.id
      JOIN tuy_chon_mon tc ON tc.id = o.tuy_chon_id
      LEFT JOIN tuy_chon_muc m ON m.id = o.muc_id
    `);

    // View: Tổng quan chuẩn bị theo đơn
    await pool.query(`
      CREATE OR REPLACE VIEW v_order_prep_overview AS
      SELECT
        o.id AS order_id,
        o.ban_id,
        o.trang_thai AS order_status,
        COUNT(*) FILTER (WHERE d.id IS NOT NULL)                       AS total_lines,
        COUNT(*) FILTER (WHERE d.trang_thai_che_bien = 'QUEUED')       AS q_count,
        COUNT(*) FILTER (WHERE d.trang_thai_che_bien = 'MAKING')       AS m_count,
        COUNT(*) FILTER (WHERE d.trang_thai_che_bien = 'DONE')         AS done_count,
        BOOL_OR(d.trang_thai_che_bien = 'MAKING')                      AS any_making,
        BOOL_AND(d.trang_thai_che_bien = 'DONE')                       AS all_done,
        CASE WHEN o.trang_thai <> 'PAID'
                  AND COUNT(*) FILTER (WHERE d.trang_thai_che_bien='QUEUED') > 0
             THEN TRUE ELSE FALSE END AS has_editable_lines
      FROM don_hang o
      LEFT JOIN don_hang_chi_tiet d ON d.don_hang_id = o.id
      GROUP BY o.id, o.ban_id, o.trang_thai
    `);

    // View: Chi tiết line kèm options (để render giỏ hàng đầy đủ)
    await pool.query(`
      CREATE OR REPLACE VIEW v_open_order_items_detail_ext AS
      SELECT
        base.order_id,
        base.line_id,
        base.mon_id,
        base.ten_mon,
        base.bien_the_id,
        base.ten_bien_the,
        base.so_luong,
        base.don_gia,
        base.giam_gia,
        base.line_total,
        d.ghi_chu,
        d.trang_thai_che_bien,
        jsonb_agg(
          jsonb_build_object(
            'ma',  tc.ma,
            'ten', tc.ten,
            'muc', COALESCE(m.ten, NULL),
            'he_so', o.he_so
          )
          ORDER BY tc.ma
        ) FILTER (WHERE o.id IS NOT NULL) AS options
      FROM v_open_order_items_detail base
      JOIN don_hang_chi_tiet d ON d.id = base.line_id
      LEFT JOIN don_hang_chi_tiet_tuy_chon o ON o.line_id = d.id
      LEFT JOIN tuy_chon_mon tc ON tc.id = o.tuy_chon_id
      LEFT JOIN tuy_chon_muc m ON m.id = o.muc_id
      GROUP BY
        base.order_id, base.line_id, base.mon_id, base.ten_mon,
        base.bien_the_id, base.ten_bien_the, base.so_luong,
        base.don_gia, base.giam_gia, base.line_total, d.ghi_chu, d.trang_thai_che_bien
    `);

    // =========================================================
    // 16. INSERT DỮ LIỆU MẪU
    // =========================================================
    console.log('📝 Thêm dữ liệu mẫu...');

    // Thêm roles
    await pool.query(`
      INSERT INTO roles (role_name, description) VALUES
      ('admin', 'Quản trị hệ thống, toàn quyền'),
      ('manager', 'Quản lý quán, menu, nhân viên, báo cáo'),
      ('cashier', 'Thu ngân, tạo đơn, thanh toán'),
      ('kitchen', 'Bếp/Pha chế, xử lý order'),
      ('customer', 'Khách hàng, đặt món')
      ON CONFLICT (role_name) DO NOTHING
    `);

    // Thêm users
    const bcrypt = require('bcrypt');
    const adminPassword = await bcrypt.hash('123456', 10);
    const cashierPassword = await bcrypt.hash('123456', 10);

    await pool.query(`
      INSERT INTO users (username, password_hash, full_name, email) VALUES
      ('admin', $1, 'Admin User', 'admin@coffee.com'),
      ('cashier01', $2, 'Thu Ngân 01', 'cashier01@coffee.com')
      ON CONFLICT (username) DO NOTHING
    `, [adminPassword, cashierPassword]);

    // Gán roles
    await pool.query(`
      INSERT INTO user_roles (user_id, role_id) VALUES
      ((SELECT user_id FROM users WHERE username='admin'), (SELECT role_id FROM roles WHERE role_name='admin')),
      ((SELECT user_id FROM users WHERE username='cashier01'), (SELECT role_id FROM roles WHERE role_name='cashier'))
      ON CONFLICT DO NOTHING
    `);

    // Thêm khu vực
    await pool.query(`
      INSERT INTO khu_vuc (ten, mo_ta, thu_tu, active) VALUES
      ('Tầng trệt',  'Khu gần quầy', 1, TRUE),
      ('Tầng 2',     'Khu trên lầu', 2, TRUE),
      ('Sân vườn',   'Khu ngoài trời', 3, TRUE),
      ('Sân thượng', 'Khu rooftop', 4, TRUE)
      ON CONFLICT (ten) DO NOTHING
    `);

    // Thêm bàn
    await pool.query(`
      INSERT INTO ban (ten_ban, khu_vuc, suc_chua, trang_thai, ghi_chu) VALUES
      ('Bàn 1', 'Tầng trệt', 2, 'TRONG', 'Gần cửa chính'),
      ('Bàn 2', 'Tầng trệt', 4, 'TRONG', 'Bàn lớn 4 ghế'),
      ('Bàn 3', 'Tầng trệt', 2, 'DANG_DUNG', 'Khách đang ngồi'),
      ('Bàn 4', 'Sân vườn', 2, 'TRONG', 'Góc có cây xanh'),
      ('Bàn 5', 'Sân vườn', 4, 'KHOA', 'Đang sửa ghế'),
      ('Bàn 6', 'Tầng 2', 2, 'TRONG', 'Cạnh lan can'),
      ('Bàn 7', 'Tầng 2', 2, 'TRONG', 'Gần cầu thang'),
      ('Bàn 8', 'Tầng 2', 4, 'DANG_DUNG', 'Khách đặt trước'),
      ('Bàn 9', 'Sân thượng', 2, 'TRONG', 'View đẹp'),
      ('Bàn 10', 'Sân thượng', 4, 'TRONG', 'Bàn lớn, nhiều ánh sáng')
      ON CONFLICT (ten_ban) DO NOTHING
    `);

    // Map khu_vuc_id cho bảng ban
    await pool.query(`
      UPDATE ban b
      SET khu_vuc_id = kv.id
      FROM khu_vuc kv
      WHERE b.khu_vuc IS NOT NULL AND b.khu_vuc = kv.ten
        AND (b.khu_vuc_id IS NULL OR b.khu_vuc_id <> kv.id)
    `);

    await pool.query(`CREATE INDEX IF NOT EXISTS idx_ban_khu_vuc_id ON ban(khu_vuc_id)`);

    // Thêm loại món
    await pool.query(`
      INSERT INTO loai_mon (ten, mo_ta, thu_tu, active) VALUES
      ('Cà phê',  'Các món cà phê', 1, TRUE),
      ('Trà',     'Các loại trà',   2, TRUE),
      ('Đá xay',  'Sinh tố/đá xay', 3, TRUE)
      ON CONFLICT (ten) DO NOTHING
    `);

    // Thêm món
    await pool.query(`
      INSERT INTO mon (ten, ma, loai_id, don_vi, gia_mac_dinh, active, thu_tu) VALUES
      ('Cà phê sữa đá',   'CF-SUA-DA',  (SELECT id FROM loai_mon WHERE ten='Cà phê'), 'ly', 30000, TRUE, 1),
      ('Bạc xỉu',         'CF-BAC-XIU', (SELECT id FROM loai_mon WHERE ten='Cà phê'), 'ly', 32000, TRUE, 2),
      ('Espresso',        'CF-ESP',     (SELECT id FROM loai_mon WHERE ten='Cà phê'), 'ly', 28000, TRUE, 3),
      ('Americano',       'CF-AME',     (SELECT id FROM loai_mon WHERE ten='Cà phê'), 'ly', 30000, TRUE, 4),
      ('Trà đào cam sả',  'TRA-DAO',    (SELECT id FROM loai_mon WHERE ten='Trà'),    'ly', 45000, TRUE, 1),
      ('Trà olong sữa',   'TRA-OLONG',  (SELECT id FROM loai_mon WHERE ten='Trà'),    'ly', 40000, TRUE, 2),
      ('Cookie đá xay',   'DX-COOKIE',  (SELECT id FROM loai_mon WHERE ten='Đá xay'), 'ly', 55000, TRUE, 1),
      ('Matcha đá xay',   'DX-MATCHA',  (SELECT id FROM loai_mon WHERE ten='Đá xay'), 'ly', 59000, TRUE, 2)
      ON CONFLICT (ma) DO NOTHING
    `);

    // =========================================================
    // TÙY CHỌN MÓN: SUGAR & ICE
    // =========================================================
    console.log('📝 Thêm tùy chọn món (Sugar, Ice)...');
    
    // Thêm nhóm tùy chọn SUGAR và ICE
    await pool.query(`
      INSERT INTO tuy_chon_mon (ma, ten, don_vi, loai) VALUES
      ('SUGAR', 'Độ ngọt', '%', 'PERCENT'),
      ('ICE', 'Mức đá', '%', 'PERCENT')
      ON CONFLICT (ma) DO NOTHING
    `);

    // Các mức cho SUGAR
    await pool.query(`
      INSERT INTO tuy_chon_muc (tuy_chon_id, ten, gia_tri, thu_tu)
      SELECT tc.id, v.ten, v.gia_tri, v.thu_tu
      FROM tuy_chon_mon tc
      CROSS JOIN (VALUES
        ('0%',   0.0, 1),
        ('30%',  0.3, 2),
        ('50%',  0.5, 3),
        ('70%',  0.7, 4),
        ('100%', 1.0, 5)
      ) AS v(ten, gia_tri, thu_tu)
      WHERE tc.ma = 'SUGAR'
      ON CONFLICT DO NOTHING
    `);

    // Các mức cho ICE
    await pool.query(`
      INSERT INTO tuy_chon_muc (tuy_chon_id, ten, gia_tri, thu_tu)
      SELECT tc.id, v.ten, v.gia_tri, v.thu_tu
      FROM tuy_chon_mon tc
      CROSS JOIN (VALUES
        ('0%',   0.0, 1),
        ('30%',  0.3, 2),
        ('50%',  0.5, 3),
        ('70%',  0.7, 4),
        ('100%', 1.0, 5)
      ) AS v(ten, gia_tri, thu_tu)
      WHERE tc.ma = 'ICE'
      ON CONFLICT DO NOTHING
    `);

    // =========================================================
    // BIẾN THỂ MÓN (Size)
    // =========================================================
    console.log('📝 Thêm biến thể món...');
    
    // Cà phê sữa đá: S/M/L
    await pool.query(`
      INSERT INTO mon_bien_the (mon_id, ten_bien_the, gia, thu_tu, active) VALUES
      ((SELECT id FROM mon WHERE ma='CF-SUA-DA'), 'Size S', 30000, 1, TRUE),
      ((SELECT id FROM mon WHERE ma='CF-SUA-DA'), 'Size M', 35000, 2, TRUE),
      ((SELECT id FROM mon WHERE ma='CF-SUA-DA'), 'Size L', 39000, 3, TRUE)
      ON CONFLICT (mon_id, ten_bien_the) DO NOTHING
    `);

    // Trà đào: M/L
    await pool.query(`
      INSERT INTO mon_bien_the (mon_id, ten_bien_the, gia, thu_tu, active) VALUES
      ((SELECT id FROM mon WHERE ma='TRA-DAO'), 'Size M', 45000, 1, TRUE),
      ((SELECT id FROM mon WHERE ma='TRA-DAO'), 'Size L', 49000, 2, TRUE)
      ON CONFLICT (mon_id, ten_bien_the) DO NOTHING
    `);

    // Cookie đá xay: M/L
    await pool.query(`
      INSERT INTO mon_bien_the (mon_id, ten_bien_the, gia, thu_tu, active) VALUES
      ((SELECT id FROM mon WHERE ma='DX-COOKIE'), 'Size M', 55000, 1, TRUE),
      ((SELECT id FROM mon WHERE ma='DX-COOKIE'), 'Size L', 59000, 2, TRUE)
      ON CONFLICT (mon_id, ten_bien_the) DO NOTHING
    `);

    // =========================================================
    // CA LÀM: mở 1 ca cho cashier01
    // =========================================================
    console.log('📝 Tạo ca làm mẫu...');
    await pool.query(`
      INSERT INTO ca_lam (nhan_vien_id, started_at, status, opening_cash, note, opened_by)
      SELECT
        u_nv.user_id,
        NOW() - INTERVAL '30 minutes',
        'OPEN',
        300000,
        'Ca test seed',
        u_ad.user_id
      FROM (SELECT user_id FROM users WHERE username='cashier01') u_nv,
           (SELECT user_id FROM users WHERE username='admin')    u_ad
      WHERE NOT EXISTS (
        SELECT 1 FROM ca_lam
        WHERE nhan_vien_id = u_nv.user_id AND status = 'OPEN'
      )
    `);

    // =========================================================
    // MỞ ĐƠN HÀNG MẪU (OPEN) Ở VÀI BÀN
    // =========================================================
    console.log('📝 Tạo đơn hàng mẫu...');
    
    // Bàn 1
    await pool.query(`
      INSERT INTO don_hang (ban_id, nhan_vien_id, ca_lam_id, trang_thai, opened_at)
      SELECT
        (SELECT id FROM ban WHERE ten_ban='Bàn 1'),
        (SELECT user_id FROM users WHERE username='cashier01'),
        (SELECT id FROM ca_lam WHERE nhan_vien_id=(SELECT user_id FROM users WHERE username='cashier01') AND status='OPEN' ORDER BY id DESC LIMIT 1),
        'OPEN',
        NOW() - INTERVAL '15 minutes'
      WHERE NOT EXISTS (
        SELECT 1 FROM don_hang
        WHERE ban_id = (SELECT id FROM ban WHERE ten_ban='Bàn 1')
          AND trang_thai='OPEN'
      )
    `);

    // Bàn 3
    await pool.query(`
      INSERT INTO don_hang (ban_id, nhan_vien_id, ca_lam_id, trang_thai, opened_at)
      SELECT
        (SELECT id FROM ban WHERE ten_ban='Bàn 3'),
        (SELECT user_id FROM users WHERE username='cashier01'),
        (SELECT id FROM ca_lam WHERE nhan_vien_id=(SELECT user_id FROM users WHERE username='cashier01') AND status='OPEN' ORDER BY id DESC LIMIT 1),
        'OPEN',
        NOW() - INTERVAL '10 minutes'
      WHERE NOT EXISTS (
        SELECT 1 FROM don_hang
        WHERE ban_id = (SELECT id FROM ban WHERE ten_ban='Bàn 3')
          AND trang_thai='OPEN'
      )
    `);

    // =========================================================
    // CHI TIẾT ĐƠN HÀNG MẪU
    // =========================================================
    console.log('📝 Thêm chi tiết đơn hàng mẫu...');
    
    // Thêm line cho đơn ở Bàn 1: Cà phê sữa đá Size M x2
    await pool.query(`
      WITH oid AS (
        SELECT id AS order_id FROM don_hang
        WHERE ban_id = (SELECT id FROM ban WHERE ten_ban='Bàn 1') AND trang_thai='OPEN'
        ORDER BY id DESC LIMIT 1
      )
      INSERT INTO don_hang_chi_tiet (don_hang_id, mon_id, bien_the_id, so_luong, don_gia, giam_gia, ten_mon_snapshot, gia_niem_yet_snapshot)
      SELECT (SELECT order_id FROM oid),
             m.id,
             bt.id,
             2,
             bt.gia,
             0,
             m.ten,
             m.gia_mac_dinh
      FROM mon m
      JOIN mon_bien_the bt ON bt.mon_id = m.id
      WHERE m.ma='CF-SUA-DA' AND bt.ten_bien_the='Size M'
      ON CONFLICT DO NOTHING
    `);

    // Thêm line 2 cho đơn ở Bàn 1: Trà đào Size L x1
    await pool.query(`
      WITH oid AS (
        SELECT id AS order_id FROM don_hang
        WHERE ban_id = (SELECT id FROM ban WHERE ten_ban='Bàn 1') AND trang_thai='OPEN'
        ORDER BY id DESC LIMIT 1
      )
      INSERT INTO don_hang_chi_tiet (don_hang_id, mon_id, bien_the_id, so_luong, don_gia, giam_gia, ten_mon_snapshot, gia_niem_yet_snapshot)
      SELECT (SELECT order_id FROM oid),
             m.id,
             bt.id,
             1,
             bt.gia,
             0,
             m.ten,
             m.gia_mac_dinh
      FROM mon m
      JOIN mon_bien_the bt ON bt.mon_id = m.id
      WHERE m.ma='TRA-DAO' AND bt.ten_bien_the='Size L'
      ON CONFLICT DO NOTHING
    `);

    // Thêm line cho đơn ở Bàn 3: Cookie đá xay Size M x1
    await pool.query(`
      WITH oid AS (
        SELECT id AS order_id FROM don_hang
        WHERE ban_id = (SELECT id FROM ban WHERE ten_ban='Bàn 3') AND trang_thai='OPEN'
        ORDER BY id DESC LIMIT 1
      )
      INSERT INTO don_hang_chi_tiet (don_hang_id, mon_id, bien_the_id, so_luong, don_gia, giam_gia, ten_mon_snapshot, gia_niem_yet_snapshot)
      SELECT (SELECT order_id FROM oid),
             m.id,
             bt.id,
             1,
             bt.gia,
             0,
             m.ten,
             m.gia_mac_dinh
      FROM mon m
      JOIN mon_bien_the bt ON bt.mon_id = m.id
      WHERE m.ma='DX-COOKIE' AND bt.ten_bien_the='Size M'
      ON CONFLICT DO NOTHING
    `);

    // Cập nhật trạng thái bàn có đơn OPEN về DANG_DUNG
    await pool.query(`
      UPDATE ban b
      SET trang_thai = 'DANG_DUNG'
      WHERE b.id IN (
        SELECT ban_id FROM don_hang WHERE trang_thai='OPEN'
      )
      AND b.trang_thai <> 'KHOA'
    `);

    // =========================================================
    // ĐẶT BÀN (Reservation) - ví dụ 2 lịch
    // =========================================================
    console.log('📝 Tạo đặt bàn mẫu...');
    
    // Đặt bàn 5 vào chiều nay
    await pool.query(`
      INSERT INTO dat_ban (ban_id, khach_ten, khach_sdt, start_at, end_at, trang_thai, ghi_chu)
      SELECT
        (SELECT id FROM ban WHERE ten_ban='Bàn 5'),
        'Anh Nam', '0909000001',
        NOW() + INTERVAL '2 hours',
        NOW() + INTERVAL '3 hours',
        'BOOKED',
        'Sinh nhật nhỏ'
      WHERE NOT EXISTS (
        SELECT 1 FROM dat_ban
        WHERE ban_id=(SELECT id FROM ban WHERE ten_ban='Bàn 5')
          AND start_at::date = (NOW() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
      )
    `);

    // Đặt bàn 9 vào tối mai
    await pool.query(`
      INSERT INTO dat_ban (ban_id, khach_ten, khach_sdt, start_at, end_at, trang_thai, ghi_chu)
      SELECT
        (SELECT id FROM ban WHERE ten_ban='Bàn 9'),
        'Chị Hương', '0909000002',
        (NOW()::date + INTERVAL '1 day') + TIME '19:00',
        (NOW()::date + INTERVAL '1 day') + TIME '21:00',
        'BOOKED',
        'View đẹp'
      WHERE NOT EXISTS (
        SELECT 1 FROM dat_ban
        WHERE ban_id=(SELECT id FROM ban WHERE ten_ban='Bàn 9')
          AND start_at::date = (NOW()::date + INTERVAL '1 day')
      )
    `);

    // =========================================================
    // THÊM CỘT HÌNH ẢNH CHO MÓN
    // =========================================================
    console.log('📝 Thêm cột hình ảnh cho món...');
    await pool.query(`ALTER TABLE public.mon ADD COLUMN IF NOT EXISTS hinh_anh TEXT`);

    // =========================================================
    // HỖ TRỢ ĐƠN MANG ĐI
    // =========================================================
    console.log('📝 Cập nhật hỗ trợ đơn mang đi...');
    
    // Cho phép đơn mang đi: ban_id có thể NULL
    await pool.query(`ALTER TABLE don_hang ALTER COLUMN ban_id DROP NOT NULL`);

    // Thêm loại đơn: DINE_IN / TAKEAWAY
    await pool.query(`
      ALTER TABLE don_hang
      ADD COLUMN IF NOT EXISTS order_type TEXT
      DEFAULT 'DINE_IN'
      CHECK (order_type IN ('DINE_IN','TAKEAWAY'))
    `);

    // Unique "1 đơn OPEN mỗi bàn" chỉ áp dụng cho DINE_IN có ban_id
    await pool.query(`DROP INDEX IF EXISTS uq_open_order_per_table`);
    await pool.query(`
      CREATE UNIQUE INDEX uq_open_order_per_table
      ON don_hang (ban_id)
      WHERE trang_thai = 'OPEN' AND ban_id IS NOT NULL AND order_type = 'DINE_IN'
    `);

    // =========================================================
    // VIEW THỐNG KÊ DOANH THU HÀNG NGÀY
    // =========================================================
    console.log('📝 Tạo view thống kê doanh thu hàng ngày...');
    await pool.query(`
      CREATE OR REPLACE VIEW v_daily_sales_summary AS
      SELECT 
        DATE(o.closed_at) AS ngay,
        COUNT(*) AS tong_don_hang,
        SUM(CASE WHEN o.order_type = 'DINE_IN' THEN 1 ELSE 0 END) AS don_tai_ban,
        SUM(CASE WHEN o.order_type = 'TAKEAWAY' THEN 1 ELSE 0 END) AS don_mang_di,
        SUM(
          COALESCE(
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d 
             WHERE d.don_hang_id = o.id), 0
          )
        ) AS tong_doanh_thu,
        SUM(
          COALESCE(
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d 
             WHERE d.don_hang_id = o.id AND o.order_type = 'DINE_IN'), 0
          )
        ) AS doanh_thu_tai_ban,
        SUM(
          COALESCE(
            (SELECT SUM(d.so_luong * d.don_gia - COALESCE(d.giam_gia, 0))
             FROM don_hang_chi_tiet d 
             WHERE d.don_hang_id = o.id AND o.order_type = 'TAKEAWAY'), 0
          )
        ) AS doanh_thu_mang_di,
        u.full_name AS thu_ngan_chinh,
        ca.ten_ca_lam AS ca_lam_viec
      FROM don_hang o
      LEFT JOIN users u ON u.user_id = o.nhan_vien_id
      LEFT JOIN ca_lam ca ON ca.id = o.ca_lam_id
      WHERE o.trang_thai = 'PAID' 
        AND o.closed_at IS NOT NULL
      GROUP BY DATE(o.closed_at), u.full_name, ca.ten_ca_lam
      ORDER BY ngay DESC, tong_doanh_thu DESC
    `);

    // =========================================================
    // VIEW THỐNG KÊ ĐƠN HỦY
    // =========================================================
    console.log('📝 Tạo view thống kê đơn hủy...');
    await pool.query(`
      CREATE OR REPLACE VIEW v_cancelled_orders_summary AS
      SELECT 
        DATE(o.opened_at) AS ngay,
        COUNT(*) AS tong_don_huy,
        COUNT(CASE WHEN o.ly_do_huy IS NOT NULL THEN 1 END) AS don_huy_co_ly_do,
        COUNT(CASE WHEN o.ly_do_huy IS NULL THEN 1 END) AS don_huy_khong_ly_do,
        STRING_AGG(DISTINCT o.ly_do_huy, ', ') AS cac_ly_do_huy,
        u.full_name AS thu_ngan,
        ca.ten_ca_lam AS ca_lam_viec
      FROM don_hang o
      LEFT JOIN users u ON u.user_id = o.nhan_vien_id
      LEFT JOIN ca_lam ca ON ca.id = o.ca_lam_id
      WHERE o.trang_thai = 'CANCELLED'
      GROUP BY DATE(o.opened_at), u.full_name, ca.ten_ca_lam
      ORDER BY ngay DESC, tong_don_huy DESC
    `);

    console.log('🎉 Setup database hoàn tất!');
    console.log('\n📋 Thông tin đăng nhập:');
    console.log('👑 Admin: username=admin, password=123456 (có tất cả quyền)');
    console.log('💳 Cashier: username=cashier01, password=123456 (chỉ có quyền thu ngân)');

  } catch (error) {
    console.error('❌ Lỗi setup database:', error.message);
  } finally {
    await pool.end();
  }
}

// Chạy setup
setupDatabase();