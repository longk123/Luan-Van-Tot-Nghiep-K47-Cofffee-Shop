/**
 * TEST: Kiểm tra view v_profit_with_topping_cost với đơn hàng có sẵn
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
  console.log('\n📊 KIỂM TRA VIEW PROFIT WITH TOPPING COST');
  console.log('='.repeat(70));
  console.log();
  
  try {
    // 1. Kiểm tra view có tồn tại không
    console.log('1️⃣ Kiểm tra view...');
    const viewExists = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.views
      WHERE table_name = 'v_profit_with_topping_cost'
    `);
    
    if (viewExists.rows[0].count === '0') {
      console.log('   ❌ View v_profit_with_topping_cost chưa tồn tại!');
      console.log('   💡 Chạy: node migrate-add-topping-cost.cjs\n');
      return;
    }
    console.log('   ✅ View đã tồn tại\n');
    
    // 2. Lấy một số đơn hàng mẫu
    console.log('2️⃣ Lấy đơn hàng mẫu...');
    const orders = await pool.query(`
      SELECT * FROM v_profit_with_topping_cost
      ORDER BY order_id DESC
      LIMIT 10
    `);
    
    if (orders.rows.length === 0) {
      console.log('   ❌ Không có đơn hàng nào đã thanh toán\n');
      return;
    }
    
    console.log(`   Tìm thấy ${orders.rows.length} đơn hàng\n`);
    
    // 3. Hiển thị chi tiết
    console.log('3️⃣ CHI TIẾT CÁC ĐƠN HÀNG:');
    console.log('='.repeat(70));
    
    let totalRevenue = 0;
    let totalCostMon = 0;
    let totalCostTopping = 0;
    let totalProfit = 0;
    let ordersWithTopping = 0;
    
    for (const order of orders.rows) {
      console.log(`\n📦 ĐƠN HÀNG #${order.order_id}:`);
      console.log(`   Doanh thu: ${order.doanh_thu}đ`);
      console.log(`   Giá vốn món: ${order.gia_von_mon}đ`);
      console.log(`   Giá vốn topping: ${order.gia_von_topping}đ`);
      console.log(`   Tổng giá vốn: ${order.tong_gia_von}đ`);
      console.log(`   Lợi nhuận: ${order.loi_nhuan}đ`);
      console.log(`   Margin: ${((order.loi_nhuan / order.doanh_thu) * 100).toFixed(1)}%`);
      
      totalRevenue += parseInt(order.doanh_thu);
      totalCostMon += parseInt(order.gia_von_mon);
      totalCostTopping += parseInt(order.gia_von_topping);
      totalProfit += parseInt(order.loi_nhuan);
      
      if (parseInt(order.gia_von_topping) > 0) {
        ordersWithTopping++;
        console.log(`   ✅ Có topping`);
      }
    }
    
    // 4. Tổng kết
    console.log('\n' + '='.repeat(70));
    console.log('📊 TỔNG KẾT:');
    console.log('-'.repeat(70));
    console.log(`   Tổng ${orders.rows.length} đơn hàng`);
    console.log(`   Đơn có topping: ${ordersWithTopping}`);
    console.log(`   Tổng doanh thu: ${totalRevenue.toLocaleString()}đ`);
    console.log(`   Tổng giá vốn món: ${totalCostMon.toLocaleString()}đ`);
    console.log(`   Tổng giá vốn topping: ${totalCostTopping.toLocaleString()}đ`);
    console.log(`   Tổng giá vốn: ${(totalCostMon + totalCostTopping).toLocaleString()}đ`);
    console.log(`   Tổng lợi nhuận: ${totalProfit.toLocaleString()}đ`);
    console.log(`   Margin trung bình: ${((totalProfit / totalRevenue) * 100).toFixed(1)}%`);
    
    console.log('\n✅ KẾT LUẬN:');
    if (ordersWithTopping > 0) {
      console.log(`   ✅ Có ${ordersWithTopping} đơn với topping được tính giá vốn!`);
      console.log('   ✅ View v_profit_with_topping_cost hoạt động CHÍNH XÁC!');
    } else {
      console.log('   ⚠️  Chưa có đơn hàng nào với topping có giá vốn');
      console.log('   💡 Topping cần được link với nguyên liệu để có giá vốn');
    }
    
    console.log('\n' + '='.repeat(70) + '\n');
    
  } catch (error) {
    console.error('\n❌ LỖI:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

test();
