/**
 * TEST TOPPING TRONG BÁO CÁO LỢI NHUẬN
 * Kiểm tra xem giá vốn topping có được tính hay không
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

async function test() {
  console.log('\n🧪 TEST TOPPING TRONG BÁO CÁO LỢI NHUẬN');
  console.log('='.repeat(70));
  console.log('\n');
  
  try {
    // 1. Kiểm tra cấu trúc bảng don_hang_chi_tiet
    console.log('1️⃣ Cấu trúc bảng don_hang_chi_tiet:');
    console.log('-'.repeat(70));
    const structure = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'don_hang_chi_tiet'
      ORDER BY ordinal_position
    `);
    structure.rows.forEach(row => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });
    console.log();
    
    // 2. Xem 1 đơn hàng mẫu có topping
    console.log('2️⃣ Tìm đơn hàng có ghi chú (có thể có topping):');
    console.log('-'.repeat(70));
    const orderWithTopping = await pool.query(`
      SELECT 
        dh.id as don_hang_id,
        dh.trang_thai,
        ct.id as chi_tiet_id,
        m.ten as mon,
        ct.so_luong,
        ct.don_gia,
        ct.giam_gia,
        ct.ghi_chu,
        ct.gia_von_thuc_te
      FROM don_hang dh
      JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
      JOIN mon m ON m.id = ct.mon_id
      WHERE dh.trang_thai = 'da_thanh_toan'
        AND ct.ghi_chu IS NOT NULL
        AND ct.ghi_chu != ''
      ORDER BY dh.id DESC
      LIMIT 5
    `);
    
    if (orderWithTopping.rows.length > 0) {
      console.log(`\nTìm thấy ${orderWithTopping.rows.length} đơn hàng:\n`);
      orderWithTopping.rows.forEach(order => {
        console.log(`Đơn hàng #${order.don_hang_id}:`);
        console.log(`  Món: ${order.mon}`);
        console.log(`  Số lượng: ${order.so_luong}`);
        console.log(`  Đơn giá: ${order.don_gia}đ`);
        console.log(`  Giảm giá: ${order.giam_gia}đ`);
        console.log(`  Giá vốn thực tế: ${order.gia_von_thuc_te}đ`);
        console.log(`  Ghi chú: ${order.ghi_chu}`);
        console.log();
      });
    } else {
      console.log('❌ Không tìm thấy đơn hàng có ghi chú!\n');
    }
    
    // 3. Kiểm tra view/function tính lợi nhuận
    console.log('3️⃣ Kiểm tra view báo cáo lợi nhuận:');
    console.log('-'.repeat(70));
    
    const views = await pool.query(`
      SELECT table_name
      FROM information_schema.views
      WHERE table_schema = 'public'
        AND (table_name LIKE '%profit%' 
          OR table_name LIKE '%loi_nhuan%'
          OR table_name LIKE '%doanh_thu%'
          OR table_name LIKE '%money%')
      ORDER BY table_name
    `);
    
    if (views.rows.length > 0) {
      console.log('Views tìm thấy:');
      views.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      console.log();
      
      // Xem định nghĩa của view quan trọng nhất
      console.log('4️⃣ Định nghĩa view tính lợi nhuận:');
      console.log('-'.repeat(70));
      const viewDef = await pool.query(`
        SELECT definition
        FROM pg_views
        WHERE viewname LIKE '%money%' OR viewname LIKE '%profit%'
        LIMIT 1
      `);
      
      if (viewDef.rows.length > 0) {
        console.log(viewDef.rows[0].definition);
      }
    } else {
      console.log('Không tìm thấy view báo cáo lợi nhuận');
    }
    
    console.log();
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

test();
