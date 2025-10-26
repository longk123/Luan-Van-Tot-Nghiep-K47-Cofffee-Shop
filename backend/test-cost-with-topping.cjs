/**
 * TEST COST WITH TOPPING
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
  database: process.env.DB_NAME || 'coffee_shop'
});

async function test() {
  console.log('\n🧪 TEST COST WITH TOPPING');
  console.log('='.repeat(60));
  console.log('\n');
  
  try {
    // Kiểm tra xem có topping trong công thức không
    console.log('🔍 Kiểm tra topping trong công thức món...');
    console.log('-'.repeat(60));
    
    const checkTopping = await pool.query(`
      SELECT 
        m.ten as mon,
        nl.ten as nguyen_lieu,
        nl.ma as ma_nl,
        ct.so_luong,
        nl.gia_nhap_moi_nhat,
        (ct.so_luong * nl.gia_nhap_moi_nhat) as gia_von
      FROM cong_thuc_mon ct
      JOIN nguyen_lieu nl ON nl.id = ct.nguyen_lieu_id
      JOIN mon m ON m.id = ct.mon_id
      WHERE ct.mon_id = 1 AND ct.bien_the_id = 2
      ORDER BY nl.ten
    `);
    
    console.log(`\nCông thức "Cà phê sữa - Size M":`);
    let totalCost = 0;
    checkTopping.rows.forEach(row => {
      console.log(`  - ${row.nguyen_lieu}: ${row.so_luong} x ${row.gia_nhap_moi_nhat}đ = ${row.gia_von}đ`);
      totalCost += parseFloat(row.gia_von);
    });
    console.log(`  TỔNG: ${totalCost}đ`);
    console.log();
    
    // Test 1: Không topping
    console.log('TEST 1: Size M - Không topping');
    console.log('-'.repeat(60));
    const result1 = await pool.query(
      'SELECT tinh_gia_von_dong($1, $2, $3, $4) as gia_von',
      [1, 2, 1.0, 1.0]
    );
    console.log('Giá vốn:', result1.rows[0].gia_von, 'đ');
    console.log();
    
    // Kiểm tra topping có trong bảng nguyen_lieu không
    console.log('🔍 Kiểm tra topping trong bảng nguyên liệu...');
    console.log('-'.repeat(60));
    const toppingCheck = await pool.query(`
      SELECT id, ma, ten, gia_nhap_moi_nhat
      FROM nguyen_lieu
      WHERE ma LIKE '%FLAN%' OR ma LIKE '%THACH%' OR ma LIKE '%TOPPING%'
    `);
    
    if (toppingCheck.rows.length === 0) {
      console.log('❌ KHÔNG có topping trong bảng nguyen_lieu!');
      console.log('   Topping chỉ có trong tuy_chon_mon nhưng KHÔNG phải nguyên liệu.');
      console.log('   Function tinh_gia_von_dong() chỉ tính nguyên liệu từ cong_thuc_mon.');
      console.log();
      console.log('💡 VẤN ĐỀ:');
      console.log('   - Topping là SẢN PHẨM BÁN RA, không phải nguyên liệu thô');
      console.log('   - Giá topping được tính trực tiếp từ tuy_chon_mon.gia_mac_dinh');
      console.log('   - KHÔNG cần tính vào function tinh_gia_von_dong()');
      console.log();
      console.log('✅ KẾT LUẬN:');
      console.log('   - Giá vốn món = Tính từ nguyên liệu (cà phê, sữa, đường, đá)');
      console.log('   - Giá topping = Thêm trực tiếp từ tuy_chon_mon.gia_mac_dinh');
      console.log('   - Tổng giá bán = Giá món + Giá topping');
    } else {
      console.log('Topping tìm thấy:');
      toppingCheck.rows.forEach(row => {
        console.log(`  - ${row.ten} (${row.ma}): ${row.gia_nhap_moi_nhat}đ`);
      });
    }
    
    console.log();
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

test();
