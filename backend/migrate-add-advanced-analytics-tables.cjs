/**
 * Migration: Tạo các bảng nền tảng cho báo cáo nâng cao
 * - chi_phi: Quản lý chi phí vận hành
 * - nguyen_lieu: Quản lý kho nguyên liệu
 * - cong_thuc_mon: Công thức món (recipe)
 * - bang_cong: Bảng công nhân viên
 * - muc_tieu: Mục tiêu KPI
 * - nhap_kho: Lịch sử nhập kho
 * - xuat_kho: Lịch sử xuất kho
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
    console.log('🚀 Bắt đầu migration: Các bảng nền tảng cho báo cáo nâng cao\n');
    
    await client.query('BEGIN');
    
    // =====================================================================
    // 1. BẢNG CHI PHÍ (Expenses)
    // =====================================================================
    console.log('💸 1. Tạo bảng chi_phi...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS chi_phi (
        id SERIAL PRIMARY KEY,
        loai_chi_phi TEXT NOT NULL CHECK (loai_chi_phi IN (
          'DIEN',          -- Tiền điện
          'NUOC',          -- Tiền nước
          'LUONG',         -- Lương nhân viên
          'THUE_MB',       -- Thuê mặt bằng
          'NGUYEN_LIEU',   -- Mua nguyên liệu
          'MARKETING',     -- Chi phí marketing
          'BAO_TRI',       -- Bảo trì thiết bị
          'VAN_PHONG',     -- Văn phòng phẩm
          'KHAC'           -- Chi phí khác
        )),
        ten TEXT NOT NULL,
        so_tien INT NOT NULL CHECK (so_tien >= 0),
        ngay_chi DATE NOT NULL DEFAULT CURRENT_DATE,
        nguoi_chi INT REFERENCES users(user_id),
        nha_cung_cap TEXT,
        ghi_chu TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by INT REFERENCES users(user_id)
      )
    `);
    
    // Index cho truy vấn nhanh
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_chi_phi_ngay_chi ON chi_phi(ngay_chi DESC);
      CREATE INDEX IF NOT EXISTS idx_chi_phi_loai ON chi_phi(loai_chi_phi);
    `);
    
    console.log('   ✅ Bảng chi_phi đã tạo');
    
    // =====================================================================
    // 2. BẢNG NGUYÊN LIỆU (Ingredients/Inventory)
    // =====================================================================
    console.log('📦 2. Tạo bảng nguyen_lieu...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS nguyen_lieu (
        id SERIAL PRIMARY KEY,
        ma TEXT UNIQUE,
        ten TEXT NOT NULL,
        don_vi TEXT NOT NULL CHECK (don_vi IN (
          'g',      -- gram
          'kg',     -- kilogram
          'ml',     -- mililít
          'l',      -- lít
          'cai',    -- cái/chiếc
          'goi',    -- gói
          'hop',    -- hộp
          'lo'      -- lọ
        )),
        gia_nhap_moi_nhat INT DEFAULT 0,  -- Giá nhập gần nhất (VNĐ/đơn vị)
        ton_kho NUMERIC(10,2) DEFAULT 0,   -- Số lượng tồn kho
        ton_kho_toi_thieu NUMERIC(10,2) DEFAULT 0, -- Cảnh báo khi xuống dưới mức này
        mo_ta TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nguyen_lieu_active ON nguyen_lieu(active);
      CREATE INDEX IF NOT EXISTS idx_nguyen_lieu_ton_kho ON nguyen_lieu(ton_kho);
    `);
    
    console.log('   ✅ Bảng nguyen_lieu đã tạo');
    
    // =====================================================================
    // 3. BẢNG CÔNG THỨC MÓN (Recipe)
    // =====================================================================
    console.log('📋 3. Tạo bảng cong_thuc_mon...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS cong_thuc_mon (
        id SERIAL PRIMARY KEY,
        mon_id INT NOT NULL REFERENCES mon(id) ON DELETE CASCADE,
        bien_the_id INT REFERENCES mon_bien_the(id) ON DELETE CASCADE,
        nguyen_lieu_id INT NOT NULL REFERENCES nguyen_lieu(id) ON DELETE RESTRICT,
        so_luong NUMERIC(10,3) NOT NULL CHECK (so_luong > 0), -- Số lượng nguyên liệu cần dùng
        ghi_chu TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(mon_id, bien_the_id, nguyen_lieu_id)
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_cong_thuc_mon_mon_id ON cong_thuc_mon(mon_id);
      CREATE INDEX IF NOT EXISTS idx_cong_thuc_mon_nguyen_lieu ON cong_thuc_mon(nguyen_lieu_id);
    `);
    
    // Thêm cột gia_von vào bảng mon
    await client.query(`
      ALTER TABLE mon 
      ADD COLUMN IF NOT EXISTS gia_von INT DEFAULT 0;
    `);
    
    console.log('   ✅ Bảng cong_thuc_mon đã tạo');
    console.log('   ✅ Thêm cột gia_von vào bảng mon');
    
    // =====================================================================
    // 4. BẢNG NHẬP KHO (Stock In)
    // =====================================================================
    console.log('📥 4. Tạo bảng nhap_kho...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS nhap_kho (
        id SERIAL PRIMARY KEY,
        nguyen_lieu_id INT NOT NULL REFERENCES nguyen_lieu(id) ON DELETE RESTRICT,
        so_luong NUMERIC(10,2) NOT NULL CHECK (so_luong > 0),
        don_gia INT NOT NULL CHECK (don_gia >= 0),  -- Giá nhập/đơn vị
        thanh_tien INT GENERATED ALWAYS AS (CAST(so_luong * don_gia AS INT)) STORED,
        nha_cung_cap TEXT,
        nguoi_nhap INT REFERENCES users(user_id),
        ngay_nhap TIMESTAMPTZ DEFAULT NOW(),
        ghi_chu TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nhap_kho_ngay_nhap ON nhap_kho(ngay_nhap DESC);
      CREATE INDEX IF NOT EXISTS idx_nhap_kho_nguyen_lieu ON nhap_kho(nguyen_lieu_id);
    `);
    
    console.log('   ✅ Bảng nhap_kho đã tạo');
    
    // =====================================================================
    // 5. BẢNG XUẤT KHO (Stock Out)
    // =====================================================================
    console.log('📤 5. Tạo bảng xuat_kho...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS xuat_kho (
        id SERIAL PRIMARY KEY,
        nguyen_lieu_id INT NOT NULL REFERENCES nguyen_lieu(id) ON DELETE RESTRICT,
        so_luong NUMERIC(10,2) NOT NULL CHECK (so_luong > 0),
        don_hang_id INT REFERENCES don_hang(id) ON DELETE SET NULL,
        don_hang_chi_tiet_id INT REFERENCES don_hang_chi_tiet(id) ON DELETE SET NULL,
        loai_xuat TEXT DEFAULT 'BAN_HANG' CHECK (loai_xuat IN (
          'BAN_HANG',   -- Xuất khi bán món
          'HU_HONG',    -- Hư hỏng
          'KIEM_KE',    -- Kiểm kê
          'KHAC'        -- Lý do khác
        )),
        ngay_xuat TIMESTAMPTZ DEFAULT NOW(),
        ghi_chu TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_xuat_kho_ngay_xuat ON xuat_kho(ngay_xuat DESC);
      CREATE INDEX IF NOT EXISTS idx_xuat_kho_nguyen_lieu ON xuat_kho(nguyen_lieu_id);
      CREATE INDEX IF NOT EXISTS idx_xuat_kho_don_hang ON xuat_kho(don_hang_id);
    `);
    
    console.log('   ✅ Bảng xuat_kho đã tạo');
    
    // =====================================================================
    // 6. BẢNG CÔNG NHÂN VIÊN (Timesheet)
    // =====================================================================
    console.log('🕐 6. Tạo bảng bang_cong...');
    
    // Thêm cột lương vào bảng users
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS luong_co_ban INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS luong_theo_gio INT DEFAULT 0;
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS bang_cong (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        ca_lam_id INT REFERENCES ca_lam(id) ON DELETE SET NULL,
        gio_vao TIMESTAMPTZ NOT NULL,
        gio_ra TIMESTAMPTZ,
        so_gio NUMERIC(5,2) GENERATED ALWAYS AS (
          CASE 
            WHEN gio_ra IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (gio_ra - gio_vao)) / 3600
            ELSE 0
          END
        ) STORED,
        luong_ca INT DEFAULT 0,
        ghi_chu TEXT,
        trang_thai TEXT DEFAULT 'CHUA_TINH_LUONG' CHECK (trang_thai IN (
          'CHUA_TINH_LUONG',
          'DA_TINH_LUONG'
        )),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bang_cong_user_id ON bang_cong(user_id);
      CREATE INDEX IF NOT EXISTS idx_bang_cong_ca_lam_id ON bang_cong(ca_lam_id);
      CREATE INDEX IF NOT EXISTS idx_bang_cong_gio_vao ON bang_cong(gio_vao DESC);
    `);
    
    console.log('   ✅ Bảng bang_cong đã tạo');
    console.log('   ✅ Thêm cột luong_co_ban, luong_theo_gio vào bảng users');
    
    // =====================================================================
    // 7. BẢNG MỤC TIÊU (Goals/KPI Targets)
    // =====================================================================
    console.log('🎯 7. Tạo bảng muc_tieu...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS muc_tieu (
        id SERIAL PRIMARY KEY,
        loai TEXT NOT NULL CHECK (loai IN (
          'DOANH_THU',              -- Mục tiêu doanh thu
          'SO_DON',                 -- Mục tiêu số đơn hàng
          'DOANH_THU_NHAN_VIEN',   -- Mục tiêu doanh thu cá nhân
          'SO_DON_NHAN_VIEN',      -- Mục tiêu số đơn cá nhân
          'LOI_NHUAN',             -- Mục tiêu lợi nhuận
          'KHAC'
        )),
        ten TEXT NOT NULL,
        gia_tri_muc_tieu INT NOT NULL CHECK (gia_tri_muc_tieu > 0),
        thoi_gian_bat_dau DATE NOT NULL,
        thoi_gian_ket_thuc DATE NOT NULL,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE, -- NULL = toàn quán
        mo_ta TEXT,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        created_by INT REFERENCES users(user_id),
        CHECK (thoi_gian_ket_thuc >= thoi_gian_bat_dau)
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_muc_tieu_thoi_gian ON muc_tieu(thoi_gian_bat_dau, thoi_gian_ket_thuc);
      CREATE INDEX IF NOT EXISTS idx_muc_tieu_user_id ON muc_tieu(user_id);
      CREATE INDEX IF NOT EXISTS idx_muc_tieu_active ON muc_tieu(active);
    `);
    
    console.log('   ✅ Bảng muc_tieu đã tạo');
    
    // =====================================================================
    // 8. TẠO CÁC VIEW HỖ TRỢ
    // =====================================================================
    console.log('📊 8. Tạo các view hỗ trợ...');
    
    // View tồn kho cảnh báo
    await client.query(`
      CREATE OR REPLACE VIEW v_nguyen_lieu_canh_bao AS
      SELECT 
        nl.id,
        nl.ma,
        nl.ten,
        nl.don_vi,
        nl.ton_kho,
        nl.ton_kho_toi_thieu,
        nl.gia_nhap_moi_nhat,
        CASE 
          WHEN nl.ton_kho <= 0 THEN 'HET_HANG'
          WHEN nl.ton_kho <= nl.ton_kho_toi_thieu THEN 'SAP_HET'
          ELSE 'BINH_THUONG'
        END AS trang_thai,
        (nl.ton_kho * nl.gia_nhap_moi_nhat) AS gia_tri_ton_kho
      FROM nguyen_lieu nl
      WHERE nl.active = TRUE
      ORDER BY 
        CASE 
          WHEN nl.ton_kho <= 0 THEN 1
          WHEN nl.ton_kho <= nl.ton_kho_toi_thieu THEN 2
          ELSE 3
        END,
        nl.ten
    `);
    
    // View giá vốn món
    await client.query(`
      CREATE OR REPLACE VIEW v_gia_von_mon AS
      SELECT 
        m.id AS mon_id,
        m.ten AS ten_mon,
        mbt.id AS bien_the_id,
        mbt.ten_bien_the,
        COALESCE(SUM(ct.so_luong * nl.gia_nhap_moi_nhat), 0) AS gia_von,
        m.gia_mac_dinh,
        COALESCE(mbt.gia, m.gia_mac_dinh) AS gia_ban,
        COALESCE(mbt.gia, m.gia_mac_dinh) - COALESCE(SUM(ct.so_luong * nl.gia_nhap_moi_nhat), 0) AS loi_nhuan,
        CASE 
          WHEN COALESCE(mbt.gia, m.gia_mac_dinh) > 0 
          THEN ROUND(
            ((COALESCE(mbt.gia, m.gia_mac_dinh) - COALESCE(SUM(ct.so_luong * nl.gia_nhap_moi_nhat), 0))::NUMERIC 
            / COALESCE(mbt.gia, m.gia_mac_dinh) * 100), 2
          )
          ELSE 0
        END AS ty_le_loi_nhuan_phan_tram
      FROM mon m
      LEFT JOIN mon_bien_the mbt ON mbt.mon_id = m.id AND mbt.active = TRUE
      LEFT JOIN cong_thuc_mon ct ON ct.mon_id = m.id 
        AND (ct.bien_the_id IS NULL OR ct.bien_the_id = mbt.id)
      LEFT JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id AND nl.active = TRUE
      WHERE m.active = TRUE
      GROUP BY m.id, m.ten, mbt.id, mbt.ten_bien_the, mbt.gia, m.gia_mac_dinh
      ORDER BY m.ten, mbt.ten_bien_the NULLS FIRST
    `);
    
    // View tổng hợp chi phí theo tháng
    await client.query(`
      CREATE OR REPLACE VIEW v_chi_phi_thang AS
      SELECT 
        DATE_TRUNC('month', ngay_chi) AS thang,
        loai_chi_phi,
        COUNT(*) AS so_lan_chi,
        SUM(so_tien) AS tong_tien
      FROM chi_phi
      GROUP BY DATE_TRUNC('month', ngay_chi), loai_chi_phi
      ORDER BY thang DESC, loai_chi_phi
    `);
    
    console.log('   ✅ View v_nguyen_lieu_canh_bao');
    console.log('   ✅ View v_gia_von_mon');
    console.log('   ✅ View v_chi_phi_thang');
    
    // =====================================================================
    // 9. THÊM DỮ LIỆU MẪU
    // =====================================================================
    console.log('📝 9. Thêm dữ liệu mẫu...');
    
    // Nguyên liệu mẫu
    await client.query(`
      INSERT INTO nguyen_lieu (ma, ten, don_vi, gia_nhap_moi_nhat, ton_kho, ton_kho_toi_thieu, mo_ta) VALUES
      ('CF-BOT', 'Cà phê bột', 'kg', 250000, 50, 10, 'Cà phê Robusta hạt nguyên chất'),
      ('SUA-TUOI', 'Sữa tươi', 'l', 60000, 100, 20, 'Sữa tươi không đường'),
      ('DUONG-TRANG', 'Đường trắng', 'kg', 20000, 30, 5, 'Đường tinh luyện'),
      ('DA', 'Đá viên', 'kg', 5000, 200, 50, 'Đá sạch đóng túi'),
      ('TRA-XANH', 'Trà xanh', 'kg', 180000, 20, 5, 'Trà xanh Thái Nguyên'),
      ('BANH-FLAN', 'Bánh flan', 'cai', 8000, 50, 10, 'Bánh flan topping'),
      ('THACH-DUA', 'Thạch dừa', 'goi', 15000, 30, 5, 'Thạch dừa đóng gói')
      ON CONFLICT (ma) DO NOTHING
    `);
    
    // Chi phí mẫu (tháng 10/2025)
    await client.query(`
      INSERT INTO chi_phi (loai_chi_phi, ten, so_tien, ngay_chi, ghi_chu) VALUES
      ('DIEN', 'Tiền điện tháng 10/2025', 3500000, '2025-10-05', 'Hóa đơn EVN'),
      ('NUOC', 'Tiền nước tháng 10/2025', 800000, '2025-10-05', 'Hóa đơn Sawaco'),
      ('THUE_MB', 'Thuê mặt bằng tháng 10/2025', 15000000, '2025-10-01', 'Thuê mặt bằng quán'),
      ('MARKETING', 'Chạy ads Facebook', 2000000, '2025-10-10', 'Quảng cáo online'),
      ('BAO_TRI', 'Sửa máy pha cà phê', 1500000, '2025-10-15', 'Thay linh kiện máy pha')
      ON CONFLICT DO NOTHING
    `);
    
    // Mục tiêu mẫu
    await client.query(`
      INSERT INTO muc_tieu (loai, ten, gia_tri_muc_tieu, thoi_gian_bat_dau, thoi_gian_ket_thuc, mo_ta) VALUES
      ('DOANH_THU', 'Doanh thu tháng 10/2025', 100000000, '2025-10-01', '2025-10-31', 'Mục tiêu doanh thu toàn quán'),
      ('SO_DON', 'Số đơn hàng tháng 10/2025', 1000, '2025-10-01', '2025-10-31', 'Mục tiêu 1000 đơn trong tháng'),
      ('DOANH_THU', 'Doanh thu Q4/2025', 300000000, '2025-10-01', '2025-12-31', 'Mục tiêu doanh thu quý 4')
      ON CONFLICT DO NOTHING
    `);
    
    console.log('   ✅ Đã thêm 7 nguyên liệu mẫu');
    console.log('   ✅ Đã thêm 5 chi phí mẫu');
    console.log('   ✅ Đã thêm 3 mục tiêu mẫu');
    
    await client.query('COMMIT');
    
    // =====================================================================
    // HOÀN TẤT
    // =====================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ MIGRATION HOÀN TẤT!');
    console.log('='.repeat(80));
    console.log('\n📊 ĐÃ TẠO:');
    console.log('  ✅ 7 bảng mới: chi_phi, nguyen_lieu, cong_thuc_mon, nhap_kho, xuat_kho, bang_cong, muc_tieu');
    console.log('  ✅ 3 views: v_nguyen_lieu_canh_bao, v_gia_von_mon, v_chi_phi_thang');
    console.log('  ✅ 2 cột mới trong mon: gia_von');
    console.log('  ✅ 2 cột mới trong users: luong_co_ban, luong_theo_gio');
    console.log('  ✅ Dữ liệu mẫu: 7 nguyên liệu, 5 chi phí, 3 mục tiêu');
    console.log('\n💡 BẠN CÓ THỂ LÀM:');
    console.log('  1. Quản lý kho nguyên liệu (nhập/xuất/tồn)');
    console.log('  2. Tính giá vốn món ăn chính xác');
    console.log('  3. Theo dõi chi phí vận hành');
    console.log('  4. Tính lương nhân viên theo ca');
    console.log('  5. Đặt và theo dõi mục tiêu KPI');
    console.log('  6. Báo cáo lãi/lỗ thực tế\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration thất bại:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
