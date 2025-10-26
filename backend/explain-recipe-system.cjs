require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function explain() {
  console.log('═'.repeat(80));
  console.log('📋 HỆ THỐNG CÔNG THỨC & GIÁ VỐN');
  console.log('═'.repeat(80));
  
  // 1. Ví dụ công thức cụ thể
  console.log('\n1️⃣ VÍ DỤ CÔNG THỨC: CÀ PHÊ SỮA ĐÁ - SIZE M\n');
  
  const recipe = await pool.query(`
    SELECT 
      m.ten as mon,
      mbt.ten_bien_the as size,
      nl.ten as nguyen_lieu,
      nl.ma,
      ct.so_luong,
      nl.don_vi,
      nl.gia_nhap_moi_nhat,
      (ct.so_luong * nl.gia_nhap_moi_nhat) as thanh_tien,
      ct.ghi_chu
    FROM cong_thuc_mon ct
    JOIN mon m ON m.id = ct.mon_id
    LEFT JOIN mon_bien_the mbt ON mbt.id = ct.bien_the_id
    JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
    WHERE m.id = 1 AND mbt.ten_bien_the = 'Size M'
    ORDER BY nl.ten
  `);
  
  let tongGiaVon = 0;
  recipe.rows.forEach(r => {
    const soLuong = parseFloat(r.so_luong);
    const donViHienThi = soLuong < 1 ? (soLuong * 1000) : soLuong;
    const dvText = soLuong < 1 ? (r.don_vi === 'kg' ? 'g' : 'ml') : r.don_vi;
    const thanhTien = parseFloat(r.thanh_tien);
    tongGiaVon += thanhTien;
    
    console.log(`   ▸ ${r.nguyen_lieu} (${r.ma})`);
    console.log(`     Số lượng: ${donViHienThi} ${dvText}`);
    console.log(`     Giá nhập: ${parseInt(r.gia_nhap_moi_nhat).toLocaleString('vi-VN')}đ/${r.don_vi}`);
    console.log(`     Thành tiền: ${thanhTien.toLocaleString('vi-VN')}đ`);
    console.log('');
  });
  
  console.log(`   ${'─'.repeat(70)}`);
  console.log(`   💰 TỔNG GIÁ VỐN: ${tongGiaVon.toLocaleString('vi-VN')}đ`);
  console.log(`   💵 GIÁ BÁN: 35.000đ`);
  console.log(`   📈 LÃI: ${(35000 - tongGiaVon).toLocaleString('vi-VN')}đ (${((35000 - tongGiaVon) / 35000 * 100).toFixed(1)}%)`);
  
  // 2. Tồn kho và khả năng làm món
  console.log('\n\n2️⃣ TỒN KHO & KHẢ NĂNG LÀM MÓN (Size M)\n');
  
  const inventory = await pool.query(`
    SELECT 
      nl.ten as nguyen_lieu,
      nl.ton_kho,
      nl.don_vi,
      ct.so_luong as so_luong_can,
      FLOOR(nl.ton_kho / NULLIF(ct.so_luong, 0)) as so_ly_lam_duoc
    FROM cong_thuc_mon ct
    JOIN mon_bien_the mbt ON mbt.id = ct.bien_the_id
    JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
    WHERE ct.mon_id = 1 AND mbt.ten_bien_the = 'Size M'
    ORDER BY so_ly_lam_duoc ASC
  `);
  
  console.log('   Nguyên liệu hiện có:');
  let minLy = Infinity;
  inventory.rows.forEach(i => {
    const tonKho = parseFloat(i.ton_kho);
    const canDung = parseFloat(i.so_luong_can);
    const soLy = parseInt(i.so_ly_lam_duoc);
    if (soLy < minLy) minLy = soLy;
    
    const tonKhoDisplay = canDung < 1 ? (tonKho * 1000) : tonKho;
    const canDungDisplay = canDung < 1 ? (canDung * 1000) : canDung;
    const dvText = canDung < 1 ? (i.don_vi === 'kg' ? 'g' : 'ml') : i.don_vi;
    
    console.log(`   ▸ ${i.nguyen_lieu.padEnd(20)} - Tồn: ${tonKhoDisplay.toString().padStart(8)} ${dvText} | Cần: ${canDungDisplay} ${dvText}/ly → Làm được: ${soLy.toLocaleString('vi-VN').padStart(6)} ly`);
  });
  
  console.log(`\n   ${'─'.repeat(70)}`);
  console.log(`   🔴 GIỚI HẠN: Chỉ làm được TỐI ĐA ${minLy.toLocaleString('vi-VN')} ly Cà phê sữa đá Size M`);
  console.log(`   (Bị giới hạn bởi nguyên liệu cạn nhất)`);
  
  // 3. Vấn đề: % đường, đá khác nhau
  console.log('\n\n3️⃣ VẤN ĐỀ: KHÁCH YÊU CẦU % ĐƯỜNG/ĐÁ KHÁC NHAU\n');
  
  console.log('   ❌ HỆ THỐNG HIỆN TẠI:');
  console.log('      - Công thức CỐ ĐỊNH: 1 món = 1 công thức');
  console.log('      - Không tính toán khi khách chọn: "50% đường", "Ít đá", "Nhiều đá"');
  console.log('      - Giá vốn KHÔNG CHÍNH XÁC khi khách custom!');
  
  console.log('\n   📊 VÍ DỤ THỰC TẾ:');
  const duong = await pool.query(`
    SELECT so_luong * gia_nhap_moi_nhat as gia_duong_chuan
    FROM cong_thuc_mon ct
    JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
    WHERE ct.mon_id = 1 AND ct.bien_the_id = 2 AND nl.ma = 'DUONG-TRANG'
  `);
  const giaDuongChuan = parseFloat(duong.rows[0]?.gia_duong_chuan || 0);
  
  console.log(`      📌 Công thức chuẩn: 15g đường = ${giaDuongChuan.toLocaleString('vi-VN')}đ`);
  console.log(`      📌 Khách chọn 50% đường: 7.5g = ${(giaDuongChuan * 0.5).toLocaleString('vi-VN')}đ (tiết kiệm ${(giaDuongChuan * 0.5).toLocaleString('vi-VN')}đ)`);
  console.log(`      📌 Khách chọn 150% đường: 22.5g = ${(giaDuongChuan * 1.5).toLocaleString('vi-VN')}đ (tốn thêm ${(giaDuongChuan * 0.5).toLocaleString('vi-VN')}đ)`);
  
  console.log('\n   ✅ GIẢI PHÁP ĐỀ XUẤT:');
  console.log('      1. Lưu % đường/đá vào `don_hang_chi_tiet_tuy_chon`');
  console.log('      2. Tính giá vốn ĐỘNG khi tạo đơn:');
  console.log('         gia_von_thuc_te = gia_von_chuan * (1 + (% thay đổi))');
  console.log('      3. Trừ tồn kho CHÍNH XÁC theo % thực tế');
  
  // 4. Xuất kho tự động
  console.log('\n\n4️⃣ XUẤT KHO TỰ ĐỘNG KHI BÁN HÀNG\n');
  
  console.log('   💡 LOGIC ĐỀ XUẤT:');
  console.log('      - Khi đơn chuyển từ OPEN → PAID');
  console.log('      - Tự động tạo bản ghi `xuat_kho`:');
  console.log('        • Duyệt tất cả món trong đơn');
  console.log('        • Tính nguyên liệu cần dùng (từ công thức × số lượng × % custom)');
  console.log('        • Trừ `ton_kho` và ghi log xuất kho');
  console.log('      - Cảnh báo nếu tồn kho < 0 (bán quá số lượng có)');
  
  console.log('\n   📝 VÍ DỤ: Đơn hàng #100 có 3 ly Cà phê sữa Size M');
  console.log('      ▸ Cà phê bột: 20g × 3 = 60g (0.06kg)');
  console.log('      ▸ Sữa tươi: 100ml × 3 = 300ml (0.3 lít)');
  console.log('      ▸ Đường: 15g × 3 = 45g (0.045kg)');
  console.log('      ▸ Đá: 150g × 3 = 450g (0.45kg)');
  
  console.log('\n   🔍 TRUY XUẤT ĐƯỢC:');
  console.log('      - Đơn hàng nào dùng bao nhiêu nguyên liệu');
  console.log('      - Ngày nào xuất bao nhiêu (theo ca, theo ngày, theo tháng)');
  console.log('      - So sánh doanh số vs nguyên liệu xuất → phát hiện thất thoát');
  
  // 5. Cảnh báo hết hàng
  console.log('\n\n5️⃣ CẢNH BÁO HẾT NGUYÊN LIỆU\n');
  
  const warning = await pool.query(`
    SELECT 
      nl.ten,
      nl.ton_kho,
      nl.don_vi,
      CASE 
        WHEN nl.ton_kho <= 0 THEN '🔴 HẾT HÀNG'
        WHEN nl.ton_kho <= 10 THEN '🟡 SẮP HẾT' 
        ELSE '🟢 ĐỦ'
      END as trang_thai
    FROM nguyen_lieu nl
    WHERE nl.active = TRUE
    ORDER BY 
      CASE 
        WHEN nl.ton_kho <= 0 THEN 0
        WHEN nl.ton_kho <= 10 THEN 1
        ELSE 2
      END,
      nl.ten
  `);
  
  console.log('   📦 TRẠNG THÁI TỒN KHO:');
  warning.rows.forEach(w => {
    const tonKho = parseFloat(w.ton_kho);
    console.log(`   ${w.trang_thai} ${w.ten.padEnd(20)} - Tồn: ${tonKho} ${w.don_vi}`);
  });
  
  console.log('\n   💡 VIEW `v_nguyen_lieu_canh_bao` đã tạo sẵn để check!');
  
  // 6. Tổng kết
  console.log('\n\n' + '═'.repeat(80));
  console.log('📌 TỔNG KẾT & HÀNH ĐỘNG TIẾP THEO');
  console.log('═'.repeat(80));
  
  console.log('\n✅ ĐÃ CÓ:');
  console.log('   ✓ Bảng cong_thuc_mon (công thức cho từng món/size)');
  console.log('   ✓ Bảng nguyen_lieu (quản lý tồn kho)');
  console.log('   ✓ Bảng nhap_kho (lịch sử nhập)');
  console.log('   ✓ Bảng xuat_kho (sẵn sàng - chưa dùng)');
  console.log('   ✓ View v_gia_von_mon (tính giá vốn tự động)');
  console.log('   ✓ View v_nguyen_lieu_canh_bao (cảnh báo hết hàng)');
  
  console.log('\n❌ CHƯA CÓ:');
  console.log('   ✗ Tính giá vốn ĐỘNG theo % đường/đá custom');
  console.log('   ✗ Tự động xuất kho khi đơn PAID');
  console.log('   ✗ Cảnh báo real-time khi món không đủ nguyên liệu');
  console.log('   ✗ Báo cáo thất thoát (doanh thu vs nguyên liệu xuất)');
  
  console.log('\n🎯 HÀNH ĐỘNG ĐỀ XUẤT:');
  console.log('   1. Tạo trigger tự động xuất kho khi đơn PAID');
  console.log('   2. Sửa logic tính giá vốn có tính % custom');
  console.log('   3. API check món có đủ nguyên liệu trước khi order');
  console.log('   4. Dashboard cảnh báo nguyên liệu sắp hết');
  console.log('   5. Báo cáo so sánh doanh thu vs chi phí nguyên liệu');
  
  console.log('\n💬 BẠN MUỐN LÀM PHẦN NÀO TRƯỚC?\n');
  
  await pool.end();
}

explain().catch(console.error);
