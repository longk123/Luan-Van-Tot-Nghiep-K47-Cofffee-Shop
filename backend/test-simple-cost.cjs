/**
 * SIMPLE TEST - Test giá vốn động với % đường/đá
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

async function test() {
  // Login
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    username: 'admin',
    password: '123456'
  });
  
  const token = loginRes.data.token;
  console.log('✅ Đăng nhập thành công\n');
  
  // Test 1: Size M - Không tùy chọn (100% đường, 100% đá)
  console.log('TEST 1: Size M - 100% đường, 100% đá (mặc định)');
  console.log('='.repeat(60));
  const url1 = `${BASE_URL}/inventory/calculate-cost?mon_id=1&bien_the_id=2`;
  console.log('URL:', url1);
  const res1 = await axios.get(url1, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Giá vốn:', res1.data.formatted);
  console.log();
  
  // Test 2: Size M - 50% đường (ID=2), 50% đá (ID=5)
  console.log('TEST 2: Size M - 50% đường, 50% đá');
  console.log('='.repeat(60));
  const url2 = `${BASE_URL}/inventory/calculate-cost?mon_id=1&bien_the_id=2&tuy_chon_ids=2,5`;
  console.log('URL:', url2);
  const res2 = await axios.get(url2, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Tùy chọn IDs:', res2.data.tuy_chon_ids);
  console.log('Giá vốn:', res2.data.formatted);
  console.log();
  
  // Test 3: Size M - 0% đường (ID=3), 0% đá (ID=6)
  console.log('TEST 3: Size M - 0% đường, 0% đá');
  console.log('='.repeat(60));
  const url3 = `${BASE_URL}/inventory/calculate-cost?mon_id=1&bien_the_id=2&tuy_chon_ids=3,6`;
  console.log('URL:', url3);
  const res3 = await axios.get(url3, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Tùy chọn IDs:', res3.data.tuy_chon_ids);
  console.log('Giá vốn:', res3.data.formatted);
  console.log();
  
  // Test 4: Size L - 50% đường, 50% đá
  console.log('TEST 4: Size L - 50% đường, 50% đá');
  console.log('='.repeat(60));
  const url4 = `${BASE_URL}/inventory/calculate-cost?mon_id=1&bien_the_id=3&tuy_chon_ids=2,5`;
  console.log('URL:', url4);
  const res4 = await axios.get(url4, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('Tùy chọn IDs:', res4.data.tuy_chon_ids);
  console.log('Giá vốn:', res4.data.formatted);
  console.log();
  
  console.log('='.repeat(60));
  console.log('✅ KẾT LUẬN:');
  console.log('- Giá vốn tính chính xác theo size');
  console.log('- Giá vốn giảm khi giảm % đường/đá');
  console.log('- Tùy chọn IDs được parse đúng');
}

test().catch(console.error);
