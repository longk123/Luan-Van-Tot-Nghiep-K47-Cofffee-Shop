/**
 * TEST: Tạo đơn hàng có topping và kiểm tra giá vốn
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD)
});

const BASE_URL = 'http://localhost:5000/api/v1';

async function test() {
  console.log('\n🧪 TEST: Đơn hàng có topping');
  console.log('='.repeat(70));
  console.log();
  
  try {
    // 1. Login để lấy token
    console.log('1️⃣ Đăng nhập...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: '123456'
    });
    const token = loginRes.data.token;
    const config = { headers: { 'Authorization': `Bearer ${token}` } };
    console.log('   ✅ Đăng nhập thành công\n');
    
    // 2. Lấy thông tin món và topping
    console.log('2️⃣ Lấy thông tin món và topping...');
    const client = await pool.connect();
    
    try {
      const caPheSua = await client.query(`
        SELECT m.id as mon_id, mbt.id as bien_the_id, mbt.gia
        FROM mon m
        JOIN mon_bien_the mbt ON mbt.mon_id = m.id
        WHERE m.ten = 'Cà phê sữa' AND mbt.ten_bien_the = 'M' AND m.active = TRUE
        LIMIT 1
      `);
      
      const topping = await client.query(`
        SELECT 
          tc.id as topping_id,
          tc.ten,
          tc.gia_mac_dinh as gia_ban,
          tc.nguyen_lieu_id,
          nl.gia_nhap_moi_nhat as gia_von
        FROM tuy_chon_mon tc
        LEFT JOIN nguyen_lieu nl ON nl.id = tc.nguyen_lieu_id
        WHERE tc.loai = 'AMOUNT'
        ORDER BY tc.id
        LIMIT 1
      `);
      
      if (!caPheSua.rows[0] || !topping.rows[0]) {
        console.log('❌ Không tìm thấy món hoặc topping');
        return;
      }
      
      console.log(`   Món: Cà phê sữa M - ${caPheSua.rows[0].gia}đ`);
      console.log(`   Topping: ${topping.rows[0].ten} - Bán: ${topping.rows[0].gia_ban}đ, Vốn: ${topping.rows[0].gia_von || 0}đ\n`);
      
      // 3. Tạo đơn hàng qua API
      console.log('3️⃣ Tạo đơn hàng qua API...');
      const orderData = {
        ban_id: null,
        loai_don: 'mang_di',
        items: [
          {
            mon_id: caPheSua.rows[0].mon_id,
            bien_the_id: caPheSua.rows[0].bien_the_id,
            so_luong: 1,
            tuy_chon: [
              {
                tuy_chon_id: topping.rows[0].topping_id,
                so_luong: 1
              }
            ]
          }
        ]
      };
      
      const orderRes = await axios.post(`${BASE_URL}/orders`, orderData, config);
      const orderId = orderRes.data.order_id;
      console.log(`   ✅ Đơn hàng #${orderId}\n`);
      
      // 4. Thanh toán đơn
      console.log('4️⃣ Thanh toán đơn hàng...');
      await axios.post(`${BASE_URL}/orders/${orderId}/pay`, {
        phuong_thuc: 'tien_mat',
        so_tien_nhan: 50000
      }, config);
      console.log(`   ✅ Đã thanh toán\n`);
      
      // 5. Kiểm tra kết quả
      console.log('5️⃣ KIỂM TRA KẾT QUẢ:');
      console.log('='.repeat(70));
      
      // Từ view v_profit_with_topping_cost
      const profit = await client.query(`
        SELECT * FROM v_profit_with_topping_cost WHERE order_id = $1
      `, [orderId]);
      
      if (profit.rows.length > 0) {
        const p = profit.rows[0];
        console.log('\n💰 BÁO CÁO ĐƠN HÀNG:');
        console.log(`   Doanh thu: ${p.doanh_thu}đ`);
        console.log(`   Giá vốn món: ${p.gia_von_mon}đ`);
        console.log(`   Giá vốn topping: ${p.gia_von_topping}đ`);
        console.log(`   Tổng giá vốn: ${p.tong_gia_von}đ`);
        console.log(`   Lợi nhuận: ${p.loi_nhuan}đ`);
        
        console.log('\n🔍 PHÂN TÍCH:');
        const expectedRevenue = caPheSua.rows[0].gia + topping.rows[0].gia_ban;
        const expectedCost = await client.query(`
          SELECT COALESCE(gia_von_thuc_te, 0) as gia_von_mon
          FROM don_hang_chi_tiet
          WHERE don_hang_id = $1
          LIMIT 1
        `, [orderId]);
        
        const giaVonMon = parseFloat(expectedCost.rows[0].gia_von_mon);
        const giaVonTopping = topping.rows[0].gia_von || 0;
        
        console.log(`   Giá bán món: ${caPheSua.rows[0].gia}đ`);
        console.log(`   Giá bán topping: ${topping.rows[0].gia_ban}đ`);
        console.log(`   Tổng doanh thu (tính): ${expectedRevenue}đ`);
        console.log(`   Tổng doanh thu (thực tế): ${p.doanh_thu}đ`);
        
        console.log(`\n   Giá vốn món (tính): ${giaVonMon}đ`);
        console.log(`   Giá vốn topping (tính): ${giaVonTopping}đ`);
        console.log(`   Tổng giá vốn (tính): ${giaVonMon + giaVonTopping}đ`);
        console.log(`   Tổng giá vốn (thực tế): ${p.tong_gia_von}đ`);
        
        console.log('\n✅ KẾT LUẬN:');
        if (parseInt(p.gia_von_topping) === parseInt(giaVonTopping)) {
          console.log('   ✅ Topping ĐÃ ĐƯỢC tính vào giá vốn CHÍNH XÁC!');
          console.log('   ✅ Báo cáo lợi nhuận CHÍNH XÁC!');
        } else if (p.gia_von_topping > 0) {
          console.log('   ⚠️  Topping được tính vào giá vốn nhưng giá trị khác dự kiến');
        } else {
          console.log('   ⚠️  Topping CHƯA được tính vào giá vốn');
          console.log('   💡 Có thể topping chưa link với nguyên liệu');
        }
      } else {
        console.log('\n❌ Không tìm thấy dữ liệu từ view v_profit_with_topping_cost');
      }
      
      console.log('\n' + '='.repeat(70));
      console.log(`✅ TEST HOÀN TẤT - Đơn hàng #${orderId}`);
      console.log('='.repeat(70) + '\n');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('\n❌ LỖI:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  } finally {
    await pool.end();
  }
}

test();
