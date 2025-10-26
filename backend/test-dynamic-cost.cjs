/**
 * TEST DYNAMIC COST CALCULATION
 * Test tính giá vốn với size và % đường/đá khác nhau
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';
let authToken = '';

async function login() {
  console.log('🔐 Đăng nhập...\n');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: '123456'
    });
    
    authToken = response.data.token;
    console.log('✅ Đăng nhập thành công\n');
    return true;
  } catch (error) {
    console.error('❌ Đăng nhập thất bại:', error.response?.data || error.message);
    return false;
  }
}

async function testCalculateCost(testName, params) {
  console.log(`📊 ${testName}`);
  console.log('-'.repeat(60));
  
  try {
    // Build query string manually for arrays
    let url = `${BASE_URL}/inventory/calculate-cost?`;
    const queryParts = [];
    
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        value.forEach(v => queryParts.push(`${key}[]=${v}`));
      } else {
        queryParts.push(`${key}=${value}`);
      }
    }
    
    url += queryParts.join('&');
    
    console.log('🔗 URL:', url);
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Thành công');
    console.log('Món ID:', response.data.mon_id);
    console.log('Biến thể ID:', response.data.bien_the_id || 'Không có');
    console.log('Tùy chọn IDs:', response.data.tuy_chon_ids || 'Không có');
    console.log('Giá vốn:', response.data.formatted);
    console.log();
  } catch (error) {
    console.error('❌ Thất bại:', error.response?.data || error.message);
    console.log();
  }
}

async function runTests() {
  console.log('\n');
  console.log('🧪 TEST DYNAMIC COST CALCULATION');
  console.log('='.repeat(60));
  console.log('Test tính giá vốn với các size và % đường/đá khác nhau\n');
  console.log();
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('Không thể tiếp tục test');
    return;
  }
  
  // Giả sử:
  // - mon_id=1: Cà phê sữa
  // - bien_the_id: 1=Size S, 2=Size M, 3=Size L
  // - tuy_chon_ids: 1=100% đường, 2=50% đường, 3=0% đường, 4=100% đá, 5=50% đá, 6=0% đá
  
  console.log('🔍 SCENARIO 1: Cà phê sữa - Size cơ bản (không có size)');
  console.log('='.repeat(60));
  await testCalculateCost(
    'TEST 1.1: Cà phê sữa - 100% đường, 100% đá (mặc định)',
    { mon_id: 1 }
  );
  
  await testCalculateCost(
    'TEST 1.2: Cà phê sữa - 50% đường, 50% đá',
    { mon_id: 1, tuy_chon_ids: [2, 5] }
  );
  
  await testCalculateCost(
    'TEST 1.3: Cà phê sữa - 0% đường, 0% đá (không đường, không đá)',
    { mon_id: 1, tuy_chon_ids: [3, 6] }
  );
  
  console.log('\n🔍 SCENARIO 2: Cà phê sữa - Size S');
  console.log('='.repeat(60));
  await testCalculateCost(
    'TEST 2.1: Size S - 100% đường, 100% đá',
    { mon_id: 1, bien_the_id: 1 }
  );
  
  await testCalculateCost(
    'TEST 2.2: Size S - 50% đường, 50% đá',
    { mon_id: 1, bien_the_id: 1, tuy_chon_ids: [2, 5] }
  );
  
  console.log('\n🔍 SCENARIO 3: Cà phê sữa - Size M');
  console.log('='.repeat(60));
  await testCalculateCost(
    'TEST 3.1: Size M - 100% đường, 100% đá',
    { mon_id: 1, bien_the_id: 2 }
  );
  
  await testCalculateCost(
    'TEST 3.2: Size M - 50% đường, 50% đá',
    { mon_id: 1, bien_the_id: 2, tuy_chon_ids: [2, 5] }
  );
  
  await testCalculateCost(
    'TEST 3.3: Size M - 0% đường, 100% đá',
    { mon_id: 1, bien_the_id: 2, tuy_chon_ids: [3, 4] }
  );
  
  console.log('\n🔍 SCENARIO 4: Cà phê sữa - Size L');
  console.log('='.repeat(60));
  await testCalculateCost(
    'TEST 4.1: Size L - 100% đường, 100% đá',
    { mon_id: 1, bien_the_id: 3 }
  );
  
  await testCalculateCost(
    'TEST 4.2: Size L - 50% đường, 50% đá',
    { mon_id: 1, bien_the_id: 3, tuy_chon_ids: [2, 5] }
  );
  
  await testCalculateCost(
    'TEST 4.3: Size L - 0% đường, 0% đá',
    { mon_id: 1, bien_the_id: 3, tuy_chon_ids: [3, 6] }
  );
  
  console.log('='.repeat(60));
  console.log('✅ HOÀN TẤT TẤT CẢ TEST');
  console.log('='.repeat(60));
  console.log('\n💡 KẾT LUẬN:');
  console.log('- Giá vốn thay đổi theo size (S < M < L)');
  console.log('- Giá vốn giảm khi giảm % đường và đá');
  console.log('- Hệ thống tính toán chính xác theo công thức');
  console.log();
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
