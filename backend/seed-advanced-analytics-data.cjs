/**
 * Script: Tạo dữ liệu mẫu đầy đủ cho báo cáo nâng cao
 * - Công thức món (recipe) cho tất cả món hiện có
 * - Lịch sử nhập kho
 * - Cập nhật giá vốn món
 * - Bảng công nhân viên
 * - Chi phí đa dạng hơn
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

async function seedData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Bắt đầu seed dữ liệu mẫu...\n');
    
    await client.query('BEGIN');
    
    // =====================================================================
    // 1. CÔNG THỨC MÓN (Recipe)
    // =====================================================================
    console.log('📋 1. Tạo công thức món...');
    
    // Lấy danh sách món hiện có
    const monsResult = await client.query(`
      SELECT m.id, m.ten, mbt.id as bien_the_id, mbt.ten_bien_the
      FROM mon m
      LEFT JOIN mon_bien_the mbt ON mbt.mon_id = m.id AND mbt.active = TRUE
      WHERE m.active = TRUE
      ORDER BY m.id, mbt.id
    `);
    
    console.log(`   Tìm thấy ${monsResult.rows.length} món/biến thể\n`);
    
    // Công thức cho Cà phê sữa đá (Size S, M, L)
    await client.query(`
      INSERT INTO cong_thuc_mon (mon_id, bien_the_id, nguyen_lieu_id, so_luong, ghi_chu) VALUES
      -- Cà phê sữa đá Size S (id món: 1, Size S) - Đơn vị: gram/ml
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size S'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'CF-BOT'), 0.015, 'Cà phê bột cho ly S (15g)'),
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size S'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'SUA-TUOI'), 0.080, 'Sữa tươi cho ly S (80ml)'),
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size S'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'DUONG-TRANG'), 0.010, 'Đường cho ly S (10g)'),
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size S'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 0.100, 'Đá cho ly S (100g)'),
      
      -- Cà phê sữa đá Size M
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size M'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'CF-BOT'), 0.020, 'Cà phê bột cho ly M (20g)'),
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size M'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'SUA-TUOI'), 0.100, 'Sữa tươi cho ly M (100ml)'),
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size M'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'DUONG-TRANG'), 0.015, 'Đường cho ly M (15g)'),
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size M'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 0.150, 'Đá cho ly M (150g)'),
      
      -- Cà phê sữa đá Size L
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size L'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'CF-BOT'), 0.025, 'Cà phê bột cho ly L (25g)'),
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size L'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'SUA-TUOI'), 0.120, 'Sữa tươi cho ly L (120ml)'),
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size L'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'DUONG-TRANG'), 0.020, 'Đường cho ly L (20g)'),
      (1, (SELECT id FROM mon_bien_the WHERE mon_id = 1 AND ten_bien_the = 'Size L'), 
       (SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 0.200, 'Đá cho ly L (200g)')
      
      ON CONFLICT (mon_id, bien_the_id, nguyen_lieu_id) DO NOTHING
    `);
    
    // Công thức cho Bạc xỉu (id: 2, không có biến thể)
    await client.query(`
      INSERT INTO cong_thuc_mon (mon_id, bien_the_id, nguyen_lieu_id, so_luong, ghi_chu) VALUES
      (2, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'CF-BOT'), 0.015, 'Ít cà phê hơn (15g)'),
      (2, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'SUA-TUOI'), 0.120, 'Nhiều sữa hơn (120ml)'),
      (2, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'DUONG-TRANG'), 0.010, 'Đường (10g)'),
      (2, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 0.150, 'Đá (150g)')
      ON CONFLICT DO NOTHING
    `);
    
    // Công thức cho Espresso (id: 3, không có biến thể)
    await client.query(`
      INSERT INTO cong_thuc_mon (mon_id, bien_the_id, nguyen_lieu_id, so_luong, ghi_chu) VALUES
      (3, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'CF-BOT'), 0.018, 'Cà phê nguyên chất (18g)')
      ON CONFLICT DO NOTHING
    `);
    
    // Công thức cho Americano (id: 4, không có biến thể)
    await client.query(`
      INSERT INTO cong_thuc_mon (mon_id, bien_the_id, nguyen_lieu_id, so_luong, ghi_chu) VALUES
      (4, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'CF-BOT'), 0.020, 'Cà phê pha loãng (20g)'),
      (4, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 0.100, 'Đá (100g)')
      ON CONFLICT DO NOTHING
    `);
    
    // Công thức cho Trà đào cam sả - Size M, L (id: 5)
    await client.query(`
      INSERT INTO cong_thuc_mon (mon_id, bien_the_id, nguyen_lieu_id, so_luong, ghi_chu) VALUES
      (5, 4, (SELECT id FROM nguyen_lieu WHERE ma = 'TRA-XANH'), 0.005, 'Trà xanh Size M (5g)'),
      (5, 4, (SELECT id FROM nguyen_lieu WHERE ma = 'DUONG-TRANG'), 0.015, 'Đường Size M (15g)'),
      (5, 4, (SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 0.150, 'Đá Size M (150g)'),
      (5, 5, (SELECT id FROM nguyen_lieu WHERE ma = 'TRA-XANH'), 0.007, 'Trà xanh Size L (7g)'),
      (5, 5, (SELECT id FROM nguyen_lieu WHERE ma = 'DUONG-TRANG'), 0.020, 'Đường Size L (20g)'),
      (5, 5, (SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 0.200, 'Đá Size L (200g)')
      ON CONFLICT DO NOTHING
    `);
    
    // Công thức cho Trà olong sữa (id: 6)
    await client.query(`
      INSERT INTO cong_thuc_mon (mon_id, bien_the_id, nguyen_lieu_id, so_luong, ghi_chu) VALUES
      (6, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'TRA-XANH'), 0.005, 'Trà olong (5g)'),
      (6, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'SUA-TUOI'), 0.080, 'Sữa tươi (80ml)'),
      (6, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'DUONG-TRANG'), 0.010, 'Đường (10g)'),
      (6, NULL, (SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 0.150, 'Đá (150g)')
      ON CONFLICT DO NOTHING
    `);
    
    const recipeCount = await client.query('SELECT COUNT(*) FROM cong_thuc_mon');
    console.log(`   ✅ Đã tạo ${recipeCount.rows[0].count} công thức món\n`);
    
    // =====================================================================
    // 2. CÂP NHẬT GIÁ VỐN MÓN (từ view)
    // =====================================================================
    console.log('💰 2. Cập nhật giá vốn món từ công thức...');
    
    await client.query(`
      UPDATE mon m
      SET gia_von = COALESCE((
        SELECT SUM(ct.so_luong * nl.gia_nhap_moi_nhat)
        FROM cong_thuc_mon ct
        JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
        WHERE ct.mon_id = m.id AND ct.bien_the_id IS NULL
      ), 0)
      WHERE m.active = TRUE
    `);
    
    const giaVonResult = await client.query(`
      SELECT id, ten, gia_von, gia_mac_dinh, 
             (gia_mac_dinh - gia_von) AS loi_nhuan,
             CASE 
               WHEN gia_mac_dinh > 0 
               THEN ROUND((gia_mac_dinh - gia_von)::NUMERIC / gia_mac_dinh * 100, 1)
               ELSE 0 
             END AS ty_le_loi_nhuan
      FROM mon 
      WHERE active = TRUE AND gia_von > 0
      ORDER BY id
    `);
    
    console.log('   Giá vốn đã cập nhật:');
    giaVonResult.rows.forEach(m => {
      console.log(`   - ${m.ten}: Giá vốn ${m.gia_von}đ, Bán ${m.gia_mac_dinh}đ, Lãi ${m.loi_nhuan}đ (${m.ty_le_loi_nhuan}%)`);
    });
    console.log('');
    
    // =====================================================================
    // 3. LỊCH SỬ NHẬP KHO (tháng 9 & 10)
    // =====================================================================
    console.log('📥 3. Tạo lịch sử nhập kho...');
    
    await client.query(`
      INSERT INTO nhap_kho (nguyen_lieu_id, so_luong, don_gia, nha_cung_cap, ngay_nhap, ghi_chu) VALUES
      -- Tháng 9/2025
      ((SELECT id FROM nguyen_lieu WHERE ma = 'CF-BOT'), 100, 250000, 'Cà phê Highlands', '2025-09-05', 'Nhập đầu tháng 9'),
      ((SELECT id FROM nguyen_lieu WHERE ma = 'SUA-TUOI'), 200, 60000, 'Vinamilk', '2025-09-05', 'Sữa tươi không đường'),
      ((SELECT id FROM nguyen_lieu WHERE ma = 'DUONG-TRANG'), 50, 20000, 'Biên Hòa Sugar', '2025-09-05', 'Đường tinh luyện'),
      ((SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 500, 5000, 'Đá Sài Gòn', '2025-09-05', 'Đá viên đóng túi'),
      
      -- Tháng 10/2025 - Đầu tháng
      ((SELECT id FROM nguyen_lieu WHERE ma = 'CF-BOT'), 80, 250000, 'Cà phê Highlands', '2025-10-01', 'Nhập đầu tháng 10'),
      ((SELECT id FROM nguyen_lieu WHERE ma = 'SUA-TUOI'), 180, 60000, 'Vinamilk', '2025-10-01', 'Nhập đầu tháng 10'),
      ((SELECT id FROM nguyen_lieu WHERE ma = 'DUONG-TRANG'), 40, 20000, 'Biên Hòa Sugar', '2025-10-01', 'Nhập đầu tháng 10'),
      ((SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 400, 5000, 'Đá Sài Gòn', '2025-10-01', 'Nhập đầu tháng 10'),
      ((SELECT id FROM nguyen_lieu WHERE ma = 'TRA-XANH'), 30, 180000, 'Trà Thái Nguyên', '2025-10-01', 'Trà xanh nguyên chất'),
      
      -- Tháng 10/2025 - Giữa tháng
      ((SELECT id FROM nguyen_lieu WHERE ma = 'BANH-FLAN'), 100, 8000, 'Topping House', '2025-10-15', 'Bánh flan topping'),
      ((SELECT id FROM nguyen_lieu WHERE ma = 'THACH-DUA'), 50, 15000, 'Topping House', '2025-10-15', 'Thạch dừa'),
      ((SELECT id FROM nguyen_lieu WHERE ma = 'SUA-TUOI'), 100, 60000, 'Vinamilk', '2025-10-20', 'Nhập bổ sung giữa tháng'),
      ((SELECT id FROM nguyen_lieu WHERE ma = 'DA'), 300, 5000, 'Đá Sài Gòn', '2025-10-20', 'Nhập bổ sung')
    `);
    
    // Cập nhật tồn kho = tổng nhập
    await client.query(`
      UPDATE nguyen_lieu nl
      SET ton_kho = COALESCE((
        SELECT SUM(nk.so_luong)
        FROM nhap_kho nk
        WHERE nk.nguyen_lieu_id = nl.id
      ), 0)
    `);
    
    const nhapKhoCount = await client.query('SELECT COUNT(*) FROM nhap_kho');
    console.log(`   ✅ Đã tạo ${nhapKhoCount.rows[0].count} lần nhập kho`);
    
    const tonKhoResult = await client.query(`
      SELECT nl.ten, nl.ton_kho, nl.don_vi, 
             (nl.ton_kho * nl.gia_nhap_moi_nhat) AS gia_tri
      FROM nguyen_lieu nl
      WHERE nl.active = TRUE
      ORDER BY nl.ten
    `);
    
    console.log('\n   Tồn kho hiện tại:');
    tonKhoResult.rows.forEach(nl => {
      console.log(`   - ${nl.ten}: ${nl.ton_kho} ${nl.don_vi} (${nl.gia_tri?.toLocaleString('vi-VN')}đ)`);
    });
    console.log('');
    
    // =====================================================================
    // 4. THÊM CHI PHÍ ĐA DẠNG (tháng 9 & 10)
    // =====================================================================
    console.log('💸 4. Thêm chi phí đa dạng...');
    
    await client.query(`
      INSERT INTO chi_phi (loai_chi_phi, ten, so_tien, ngay_chi, ghi_chu) VALUES
      -- Tháng 9/2025
      ('DIEN', 'Tiền điện tháng 9/2025', 3200000, '2025-09-05', 'Hóa đơn EVN tháng 9'),
      ('NUOC', 'Tiền nước tháng 9/2025', 750000, '2025-09-05', 'Hóa đơn Sawaco tháng 9'),
      ('THUE_MB', 'Thuê mặt bằng tháng 9/2025', 15000000, '2025-09-01', 'Thuê quán tháng 9'),
      ('NGUYEN_LIEU', 'Mua cà phê bột', 25000000, '2025-09-05', 'Nhập kho tháng 9'),
      ('NGUYEN_LIEU', 'Mua sữa tươi', 12000000, '2025-09-05', 'Nhập kho tháng 9'),
      ('VAN_PHONG', 'Văn phòng phẩm', 500000, '2025-09-10', 'Giấy in, bút, kẹp'),
      
      -- Tháng 10/2025 - Đã có trong migration, thêm nữa
      ('NGUYEN_LIEU', 'Mua cà phê bột', 20000000, '2025-10-01', 'Nhập kho đầu tháng 10'),
      ('NGUYEN_LIEU', 'Mua sữa tươi', 10800000, '2025-10-01', 'Nhập kho đầu tháng 10'),
      ('NGUYEN_LIEU', 'Mua topping', 2300000, '2025-10-15', 'Bánh flan, thạch dừa'),
      ('BAO_TRI', 'Vệ sinh máy lạnh', 800000, '2025-10-12', 'Bảo trì định kỳ'),
      ('MARKETING', 'In banner quảng cáo', 1200000, '2025-10-18', 'Banner khuyến mãi'),
      ('VAN_PHONG', 'Mực in hóa đơn', 350000, '2025-10-20', 'Mực in nhiệt'),
      ('KHAC', 'Quà tặng khách hàng thân thiết', 1000000, '2025-10-22', 'Voucher, quà tặng')
      
      ON CONFLICT DO NOTHING
    `);
    
    const chiPhiCount = await client.query('SELECT COUNT(*) FROM chi_phi');
    const tongChiPhi = await client.query(`
      SELECT 
        DATE_TRUNC('month', ngay_chi) AS thang,
        SUM(so_tien) AS tong
      FROM chi_phi
      GROUP BY DATE_TRUNC('month', ngay_chi)
      ORDER BY thang DESC
    `);
    
    console.log(`   ✅ Đã tạo ${chiPhiCount.rows[0].count} bút chi phí`);
    console.log('\n   Tổng chi phí theo tháng:');
    tongChiPhi.rows.forEach(row => {
      const thang = new Date(row.thang).toLocaleDateString('vi-VN', { year: 'numeric', month: '2-digit' });
      console.log(`   - ${thang}: ${parseInt(row.tong).toLocaleString('vi-VN')}đ`);
    });
    console.log('');
    
    // =====================================================================
    // 5. CẬP NHẬT LƯƠNG NHÂN VIÊN
    // =====================================================================
    console.log('💵 5. Cập nhật lương nhân viên...');
    
    await client.query(`
      UPDATE users
      SET 
        luong_co_ban = CASE 
          WHEN username = 'admin' THEN 15000000
          WHEN username = 'cashier' THEN 8000000
          WHEN username LIKE 'kitchen%' THEN 7000000
          WHEN username LIKE 'manager%' THEN 12000000
          ELSE 6000000
        END,
        luong_theo_gio = CASE 
          WHEN username = 'admin' THEN 0
          WHEN username = 'cashier' THEN 35000
          WHEN username LIKE 'kitchen%' THEN 30000
          WHEN username LIKE 'manager%' THEN 50000
          ELSE 25000
        END
      WHERE is_active = TRUE
    `);
    
    const usersLuong = await client.query(`
      SELECT username, full_name, luong_co_ban, luong_theo_gio
      FROM users
      WHERE is_active = TRUE
      ORDER BY luong_co_ban DESC
    `);
    
    console.log('   Lương nhân viên:');
    usersLuong.rows.forEach(u => {
      console.log(`   - ${u.full_name} (${u.username}): ${u.luong_co_ban.toLocaleString('vi-VN')}đ/tháng + ${u.luong_theo_gio.toLocaleString('vi-VN')}đ/giờ`);
    });
    console.log('');
    
    // =====================================================================
    // 6. TẠO BẢNG CÔNG MẪU (tháng 10)
    // =====================================================================
    console.log('🕐 6. Tạo bảng công mẫu tháng 10...');
    
    // Lấy các ca đã đóng trong tháng 10
    const casResult = await client.query(`
      SELECT id, nhan_vien_id, started_at, ended_at, closed_at
      FROM ca_lam
      WHERE status = 'CLOSED'
        AND started_at >= '2025-10-01'
        AND started_at < '2025-11-01'
      ORDER BY started_at
      LIMIT 10
    `);
    
    for (const ca of casResult.rows) {
      const gioVao = ca.started_at;
      const gioRa = ca.closed_at || ca.ended_at;
      
      // Tính số giờ làm việc
      const soGio = (new Date(gioRa) - new Date(gioVao)) / (1000 * 60 * 60);
      
      // Lấy lương theo giờ
      const luongResult = await client.query(
        'SELECT luong_theo_gio FROM users WHERE user_id = $1',
        [ca.nhan_vien_id]
      );
      const luongTheoGio = luongResult.rows[0]?.luong_theo_gio || 0;
      const luongCa = soGio * luongTheoGio;
      
      await client.query(`
        INSERT INTO bang_cong (user_id, ca_lam_id, gio_vao, gio_ra, luong_ca, trang_thai)
        VALUES ($1, $2, $3, $4, $5, 'DA_TINH_LUONG')
        ON CONFLICT DO NOTHING
      `, [ca.nhan_vien_id, ca.id, gioVao, gioRa, luongCa]);
    }
    
    const bangCongCount = await client.query('SELECT COUNT(*) FROM bang_cong');
    const tongLuong = await client.query(`
      SELECT SUM(luong_ca) AS tong
      FROM bang_cong
      WHERE trang_thai = 'DA_TINH_LUONG'
    `);
    
    console.log(`   ✅ Đã tạo ${bangCongCount.rows[0].count} bản ghi bảng công`);
    console.log(`   💰 Tổng lương đã tính: ${parseInt(tongLuong.rows[0].tong || 0).toLocaleString('vi-VN')}đ\n`);
    
    await client.query('COMMIT');
    
    // =====================================================================
    // TỔNG KẾT
    // =====================================================================
    console.log('='.repeat(80));
    console.log('✅ SEED DỮ LIỆU HOÀN TẤT!');
    console.log('='.repeat(80));
    console.log('\n📊 DỮ LIỆU ĐÃ TẠO:');
    console.log(`  ✅ ${recipeCount.rows[0].count} công thức món`);
    console.log(`  ✅ ${nhapKhoCount.rows[0].count} lần nhập kho`);
    console.log(`  ✅ ${chiPhiCount.rows[0].count} bút chi phí`);
    console.log(`  ✅ ${bangCongCount.rows[0].count} bản ghi bảng công`);
    console.log(`  ✅ Giá vốn đã cập nhật cho ${giaVonResult.rows.length} món`);
    console.log(`  ✅ Lương cho ${usersLuong.rows.length} nhân viên`);
    
    console.log('\n💡 BẠN CÓ THỂ XEM:');
    console.log('  - Giá vốn món: SELECT * FROM v_gia_von_mon;');
    console.log('  - Tồn kho cảnh báo: SELECT * FROM v_nguyen_lieu_canh_bao;');
    console.log('  - Chi phí tháng: SELECT * FROM v_chi_phi_thang;');
    console.log('\n🚀 SẴN SÀNG LÀM BÁO CÁO NÂNG CAO!\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Seed thất bại:', error.message);
    console.error(error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedData();
