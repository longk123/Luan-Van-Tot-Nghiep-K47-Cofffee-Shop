require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function demo() {
  const client = await pool.connect();
  try {
    console.log('📊 GIÁ VỐN MÓN (từ view v_gia_von_mon):\n');
  const giaVon = await client.query('SELECT * FROM v_gia_von_mon ORDER BY ten_mon LIMIT 10');
  giaVon.rows.forEach(m => {
    const von = parseInt(m.gia_von);
    const ban = parseInt(m.gia_ban);
    const lai = parseInt(m.loi_nhuan);
    console.log(`   ${m.ten_mon}: Vốn ${von.toLocaleString('vi-VN')}đ, Bán ${ban.toLocaleString('vi-VN')}đ, Lãi ${lai.toLocaleString('vi-VN')}đ (${m.ty_le_loi_nhuan}%)`);
  });
  
  console.log('\n\n📦 TỒN KHO CẢNH BÁO (từ view v_nguyen_lieu_canh_bao):\n');
  const tonKho = await client.query('SELECT * FROM v_nguyen_lieu_canh_bao');
  if (tonKho.rows.length === 0) {
    console.log('   ✅ Không có nguyên liệu nào cảnh báo hết!');
  } else {
    tonKho.rows.forEach(nl => {
      console.log(`   ⚠️ ${nl.ten} - Tồn: ${nl.ton_kho} ${nl.don_vi} (Mức cảnh báo: ${nl.muc_canh_bao} ${nl.don_vi})`);
    });
  }
  
  console.log('\n\n💸 CHI PHÍ THÁNG 10/2025 (từ view v_chi_phi_thang):\n');
  const chiPhi = await client.query(`SELECT * FROM v_chi_phi_thang WHERE thang = '2025-10-01'`);
  let tongChi = 0;
  chiPhi.rows.forEach(c => {
    const tien = parseInt(c.tong_chi_phi);
    tongChi += tien;
    console.log(`   ${c.loai_chi_phi}: ${tien.toLocaleString('vi-VN')}đ`);
  });
  console.log(`   ${'─'.repeat(50)}`);
  console.log(`   TỔNG CHI PHÍ: ${tongChi.toLocaleString('vi-VN')}đ`);
  
  console.log('\n\n💰 ĐƠN HÀNG THÁNG 10 (từ don_hang):\n');
  const doanhThu = await client.query(`
    SELECT 
      DATE(closed_at) as ngay,
      COUNT(*) as so_don
    FROM don_hang
    WHERE closed_at >= '2025-10-01' AND closed_at < '2025-11-01'
      AND trang_thai = 'PAID'
    GROUP BY DATE(closed_at)
    ORDER BY ngay DESC
    LIMIT 10
  `);
  
  let tongDon = 0;
  if (doanhThu.rows.length > 0) {
    doanhThu.rows.forEach(d => {
      tongDon += parseInt(d.so_don);
      console.log(`   ${d.ngay.toLocaleDateString('vi-VN')}: ${d.so_don} đơn`);
    });
    console.log(`   ${'─'.repeat(50)}`);
    console.log(`   TỔNG ĐƠN ĐÃ THANH TOÁN: ${tongDon} đơn`);
  } else {
    console.log('   Không có đơn PAID nào trong tháng 10');
  }
  
  // Lấy tổng tất cả các đơn trong tháng 10
  const allOrders = await client.query(`
    SELECT trang_thai, COUNT(*) as so_luong
    FROM don_hang
    WHERE closed_at >= '2025-10-01' AND closed_at < '2025-11-01'
    GROUP BY trang_thai
  `);
  
  if (allOrders.rows.length > 0) {
    console.log('\n   Thống kê theo trạng thái:');
    allOrders.rows.forEach(o => {
      console.log(`   - ${o.trang_thai}: ${o.so_luong} đơn`);
    });
  }
  
  const recipeCount = await client.query('SELECT COUNT(*) FROM cong_thuc_mon');
  const nhapKhoCount = await client.query('SELECT COUNT(*) FROM nhap_kho');
  const chiPhiCount = await client.query('SELECT COUNT(*) FROM chi_phi');
  const giaVonResult = await client.query('SELECT * FROM v_gia_von_mon WHERE gia_von > 0');
  
  console.log('\n\n📈 TỔNG KẾT:');
  console.log(`   ✅ Đã tạo ${recipeCount.rows[0].count} công thức món`);
  console.log(`   ✅ Đã tạo ${nhapKhoCount.rows[0].count} lần nhập kho`);
  console.log(`   ✅ Đã tạo ${chiPhiCount.rows[0].count} bút chi phí`);
  console.log(`   ✅ Giá vốn đã cập nhật cho ${giaVonResult.rows.length} món`);
  console.log(`   ✅ Có ${tongDon} đơn PAID trong tháng 10`);
  console.log('\n   🚀 SẴN SÀNG XÂY DỰNG BÁO CÁO NÂNG CAO!');
  
  } finally {
    client.release();
    await pool.end();
  }
}

demo();
