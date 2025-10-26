/**
 * KIỂM TRA TOPPING CÓ TÍNH VÀO GIÁ VỐN KHÔNG
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD)
});

async function test() {
  console.log('\n🔍 KIỂM TRA TOPPING TRONG GIÁ VỐN');
  console.log('='.repeat(70));
  console.log('\n');
  
  try {
    // 1. Xem định nghĩa view v_line_option_amount_pricing
    console.log('1️⃣ View v_line_option_amount_pricing:');
    console.log('-'.repeat(70));
    const viewDef = await pool.query(`
      SELECT definition
      FROM pg_views
      WHERE viewname = 'v_line_option_amount_pricing'
    `);
    
    if (viewDef.rows.length > 0) {
      console.log(viewDef.rows[0].definition);
      console.log();
    }
    
    // 2. Kiểm tra bảng don_hang_chi_tiet_tuy_chon
    console.log('2️⃣ Cấu trúc bảng lưu topping:');
    console.log('-'.repeat(70));
    
    const toppingTable = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE '%tuy_chon%' OR table_name LIKE '%option%')
      ORDER BY table_name
    `);
    
    if (toppingTable.rows.length > 0) {
      console.log('Bảng tìm thấy:');
      toppingTable.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      console.log();
      
      // Xem cấu trúc bảng
      for (const row of toppingTable.rows) {
        console.log(`\n📋 Cấu trúc bảng ${row.table_name}:`);
        console.log('-'.repeat(70));
        const structure = await pool.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = $1
          ORDER BY ordinal_position
        `, [row.table_name]);
        
        structure.rows.forEach(col => {
          console.log(`  ${col.column_name} (${col.data_type})`);
        });
      }
    }
    
    // 3. Tìm đơn hàng có topping
    console.log('\n\n3️⃣ Tìm đơn hàng có topping:');
    console.log('-'.repeat(70));
    
    const ordersWithTopping = await pool.query(`
      SELECT DISTINCT
        dh.id as don_hang_id,
        COUNT(*) as so_topping
      FROM don_hang dh
      JOIN don_hang_chi_tiet dhct ON dhct.don_hang_id = dh.id
      JOIN don_hang_chi_tiet_tuy_chon dhctto ON dhctto.line_id = dhct.id
      WHERE dh.trang_thai = 'da_thanh_toan'
      GROUP BY dh.id
      ORDER BY dh.id DESC
      LIMIT 5
    `);
    
    if (ordersWithTopping.rows.length > 0) {
      console.log(`\nTìm thấy ${ordersWithTopping.rows.length} đơn hàng có topping:\n`);
      
      for (const order of ordersWithTopping.rows) {
        console.log(`\n📦 ĐƠN HÀNG #${order.don_hang_id} (${order.so_topping} topping):`);
        console.log('='.repeat(70));
        
        // Chi tiết món
        const items = await pool.query(`
          SELECT 
            m.ten as mon,
            dhct.so_luong,
            dhct.don_gia,
            dhct.gia_von_thuc_te,
            dhct.id as chi_tiet_id,
            dhct.bien_the_id,
            dhct.mon_id
          FROM don_hang_chi_tiet dhct
          JOIN mon m ON m.id = dhct.mon_id
          WHERE dhct.don_hang_id = $1
        `, [order.don_hang_id]);
        
        for (const item of items.rows) {
          console.log(`\n  🍽️  ${item.mon}:`);
          console.log(`     Số lượng: ${item.so_luong}`);
          console.log(`     Đơn giá: ${item.don_gia}đ`);
          console.log(`     Giá vốn thực tế: ${item.gia_von_thuc_te}đ`);
          
          // Xem topping của món này
          const toppings = await pool.query(`
            SELECT 
              tc.ten as topping,
              dhctto.so_luong,
              COALESCE(tcg.gia, tc.gia_mac_dinh) as gia_ban,
              nl.gia_nhap_moi_nhat as gia_von_topping
            FROM don_hang_chi_tiet_tuy_chon dhctto
            JOIN tuy_chon_mon tc ON tc.id = dhctto.tuy_chon_id
            LEFT JOIN tuy_chon_gia tcg ON tcg.tuy_chon_id = dhctto.tuy_chon_id 
              AND (tcg.mon_bien_the_id = $2 OR (tcg.mon_id = $3 AND tcg.mon_bien_the_id IS NULL))
            LEFT JOIN nguyen_lieu nl ON nl.ten = tc.ten
            WHERE dhctto.line_id = $1 AND tc.loai = 'AMOUNT'
          `, [item.chi_tiet_id, item.bien_the_id || null, item.mon_id || null]);
          
          if (toppings.rows.length > 0) {
            console.log(`\n     TOPPING:`);
            let totalToppingCost = 0;
            let totalToppingPrice = 0;
            toppings.rows.forEach(t => {
              const cost = t.so_luong * (t.gia_von_topping || 0);
              const price = t.so_luong * t.gia_ban;
              totalToppingCost += cost;
              totalToppingPrice += price;
              console.log(`       - ${t.topping} x${t.so_luong}`);
              console.log(`         Giá bán: ${t.gia_ban}đ = ${price}đ`);
              console.log(`         Giá vốn: ${t.gia_von_topping || 0}đ = ${cost}đ`);
            });
            
            console.log(`\n     💰 TỔNG TOPPING:`);
            console.log(`        Doanh thu: ${totalToppingPrice}đ`);
            console.log(`        Giá vốn: ${totalToppingCost}đ`);
            console.log(`        Lợi nhuận: ${totalToppingPrice - totalToppingCost}đ`);
            
            // So sánh với gia_von_thuc_te
            console.log(`\n     🔍 PHÂN TÍCH:`);
            console.log(`        Giá vốn món: ${item.gia_von_thuc_te}đ`);
            console.log(`        Giá vốn topping: ${totalToppingCost}đ`);
            
            if (item.gia_von_thuc_te >= totalToppingCost) {
              console.log(`        ✅ Giá vốn thực tế ĐÃ BAO GỒM topping`);
            } else {
              console.log(`        ❌ Giá vốn thực tế CHƯA BAO GỒM topping`);
            }
          }
        }
        
        console.log();
      }
    } else {
      console.log('❌ Không tìm thấy đơn hàng có topping!');
    }
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

test();
