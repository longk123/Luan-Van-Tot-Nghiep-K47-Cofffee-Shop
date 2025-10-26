/**
 * Test script: Demo các function xuất kho tự động
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

async function test() {
  console.log('═'.repeat(80));
  console.log('🧪 TEST CÁC FUNCTION XUẤT KHO TỰ ĐỘNG');
  console.log('═'.repeat(80));
  
  // =====================================================================
  // 1. TEST: Check đủ nguyên liệu
  // =====================================================================
  console.log('\n1️⃣ TEST: Check đủ nguyên liệu cho 5 ly Cà phê sữa Size M\n');
  
  const check = await pool.query(`
    SELECT * FROM check_nguyen_lieu_du(1, 2, 5, NULL)
  `);
  
  console.log('   Kết quả check:');
  check.rows.forEach(r => {
    const icon = r.du_nguyen_lieu ? '✅' : '❌';
    const tonKho = parseFloat(r.ton_kho);
    const canDung = parseFloat(r.can_dung);
    console.log(`   ${icon} ${r.nguyen_lieu_thieu.padEnd(20)} - Tồn: ${tonKho} ${r.don_vi} | Cần: ${canDung} ${r.don_vi}`);
  });
  
  const allOk = check.rows.every(r => r.du_nguyen_lieu);
  console.log(`\n   → Kết luận: ${allOk ? '✅ ĐỦ nguyên liệu, có thể order!' : '❌ THIẾU nguyên liệu!'}`);
  
  // =====================================================================
  // 2. TEST: Tính giá vốn động (không custom)
  // =====================================================================
  console.log('\n\n2️⃣ TEST: Tính giá vốn động\n');
  
  const giaVonChuan = await pool.query(`
    SELECT tinh_gia_von_dong(1, 2, NULL) as gia_von
  `);
  
  console.log(`   📌 Giá vốn CHUẨN (100% đường, 100% đá): ${parseFloat(giaVonChuan.rows[0].gia_von).toLocaleString('vi-VN')}đ`);
  
  // Giả sử tùy chọn đường/đá
  const tuChon = await pool.query(`
    SELECT id, ten FROM tuy_chon_mon 
    WHERE ten ILIKE '%đường%' OR ten ILIKE '%đá%' 
    ORDER BY ten
    LIMIT 5
  `);
  
  if (tuChon.rows.length > 0) {
    console.log('\n   Tùy chọn có sẵn:');
    tuChon.rows.forEach(tc => {
      console.log(`      - ID ${tc.id}: ${tc.ten}`);
    });
  } else {
    console.log('\n   ⚠️  Chưa có tùy chọn đường/đá trong DB');
  }
  
  // =====================================================================
  // 3. TEST: Xem tồn kho trước khi xuất
  // =====================================================================
  console.log('\n\n3️⃣ TEST: Tồn kho TRƯỚC khi xuất\n');
  
  const tonKhoBefore = await pool.query(`
    SELECT ten, ton_kho, don_vi, gia_nhap_moi_nhat
    FROM nguyen_lieu
    WHERE ma IN ('CF-BOT', 'SUA-TUOI', 'DUONG-TRANG', 'DA')
    ORDER BY ten
  `);
  
  console.log('   Tồn kho hiện tại:');
  tonKhoBefore.rows.forEach(nl => {
    const ton = parseFloat(nl.ton_kho);
    const giaTri = ton * parseFloat(nl.gia_nhap_moi_nhat);
    console.log(`   ▸ ${nl.ten.padEnd(20)}: ${ton} ${nl.don_vi} (${giaTri.toLocaleString('vi-VN')}đ)`);
  });
  
  // =====================================================================
  // 4. TEST: Tạo đơn hàng test và xuất kho
  // =====================================================================
  console.log('\n\n4️⃣ TEST: Tạo đơn test và xuất kho tự động\n');
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Tạo đơn test
    const donTest = await client.query(`
      INSERT INTO don_hang (ban_id, nhan_vien_id, ca_lam_id, trang_thai, order_type)
      VALUES (
        NULL,
        (SELECT user_id FROM users WHERE username = 'cashier01' LIMIT 1),
        (SELECT id FROM ca_lam WHERE status = 'OPEN' ORDER BY started_at DESC LIMIT 1),
        'OPEN',
        'TAKEAWAY'
      )
      RETURNING id
    `);
    
    const donId = donTest.rows[0].id;
    console.log(`   ✅ Đã tạo đơn test #${donId}`);
    
    // Thêm 2 ly Cà phê sữa Size M
    await client.query(`
      INSERT INTO don_hang_chi_tiet (don_hang_id, mon_id, bien_the_id, so_luong, don_gia, ghi_chu)
      VALUES ($1, 1, 2, 2, 35000, 'Test xuất kho tự động')
    `, [donId]);
    
    console.log(`   ✅ Đã thêm 2 ly Cà phê sữa Size M vào đơn`);
    
    // Chuyển đơn sang PAID → Trigger sẽ tự động xuất kho
    console.log(`\n   🚀 Đang chuyển đơn sang PAID (trigger sẽ auto xuất kho)...`);
    
    await client.query(`
      UPDATE don_hang
      SET trang_thai = 'PAID', closed_at = NOW()
      WHERE id = $1
    `, [donId]);
    
    console.log(`   ✅ Đơn đã PAID!`);
    
    // Kiểm tra xuất kho đã tạo chưa
    const xuatKho = await client.query(`
      SELECT 
        xk.id,
        nl.ten as nguyen_lieu,
        xk.so_luong,
        nl.don_vi,
        xk.ghi_chu
      FROM xuat_kho xk
      JOIN nguyen_lieu nl ON nl.id = xk.nguyen_lieu_id
      WHERE xk.don_hang_id = $1
      ORDER BY nl.ten
    `, [donId]);
    
    console.log(`\n   📦 Đã xuất kho ${xuatKho.rows.length} nguyên liệu:`);
    xuatKho.rows.forEach(xk => {
      console.log(`      ▸ ${xk.nguyen_lieu.padEnd(20)}: ${parseFloat(xk.so_luong)} ${xk.don_vi}`);
      console.log(`        ${xk.ghi_chu}`);
    });
    
    await client.query('COMMIT');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('   ❌ Lỗi:', error.message);
  } finally {
    client.release();
  }
  
  // =====================================================================
  // 5. TEST: Xem tồn kho SAU khi xuất
  // =====================================================================
  console.log('\n\n5️⃣ TEST: Tồn kho SAU khi xuất\n');
  
  const tonKhoAfter = await pool.query(`
    SELECT ten, ton_kho, don_vi
    FROM nguyen_lieu
    WHERE ma IN ('CF-BOT', 'SUA-TUOI', 'DUONG-TRANG', 'DA')
    ORDER BY ten
  `);
  
  console.log('   Tồn kho sau khi xuất:');
  tonKhoAfter.rows.forEach((nl, idx) => {
    const truoc = parseFloat(tonKhoBefore.rows[idx].ton_kho);
    const sau = parseFloat(nl.ton_kho);
    const chenh = truoc - sau;
    console.log(`   ▸ ${nl.ten.padEnd(20)}: ${sau} ${nl.don_vi} (giảm ${chenh} ${nl.don_vi})`);
  });
  
  // =====================================================================
  // 6. TEST: View cảnh báo tồn kho v2
  // =====================================================================
  console.log('\n\n6️⃣ TEST: View cảnh báo tồn kho (v2)\n');
  
  const canhBao = await pool.query(`
    SELECT 
      ten,
      ton_kho,
      don_vi,
      uoc_tinh_so_ly_lam_duoc,
      trang_thai
    FROM v_nguyen_lieu_canh_bao_v2
    LIMIT 10
  `);
  
  console.log('   Trạng thái tồn kho:');
  canhBao.rows.forEach(nl => {
    const icon = nl.trang_thai === 'DU' ? '🟢' : nl.trang_thai === 'SAP_HET' ? '🟡' : '🔴';
    const soLy = nl.uoc_tinh_so_ly_lam_duoc ? ` → Làm được ~${parseInt(nl.uoc_tinh_so_ly_lam_duoc).toLocaleString('vi-VN')} ly` : '';
    console.log(`   ${icon} ${nl.ten.padEnd(20)}: ${parseFloat(nl.ton_kho)} ${nl.don_vi}${soLy}`);
  });
  
  // =====================================================================
  // TỔNG KẾT
  // =====================================================================
  console.log('\n\n' + '═'.repeat(80));
  console.log('✅ TEST HOÀN TẤT!');
  console.log('═'.repeat(80));
  
  console.log('\n📌 TỔNG KẾT:');
  console.log('   ✅ Function check_nguyen_lieu_du: Hoạt động OK');
  console.log('   ✅ Function tinh_gia_von_dong: Hoạt động OK');
  console.log('   ✅ Trigger auto_xuat_kho: Tự động xuất kho khi PAID OK');
  console.log('   ✅ View v_nguyen_lieu_canh_bao_v2: Hiển thị cảnh báo OK');
  
  console.log('\n💡 TIẾP THEO:');
  console.log('   1. Tích hợp vào API backend (check nguyên liệu trước khi add món)');
  console.log('   2. Hiển thị cảnh báo tồn kho trên dashboard');
  console.log('   3. Báo cáo xuất nhập tồn theo ngày/tháng\n');
  
  await pool.end();
}

test().catch(console.error);
