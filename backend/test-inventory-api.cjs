/**
 * TEST INVENTORY API ENDPOINTS
 * Tests all 7 inventory endpoints with various scenarios
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/v1';

// Mock auth token (replace with real token for actual testing)
let authToken = '';

async function login() {
  console.log('🔐 Logging in to get auth token...\n');
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      username: 'admin',
      password: '123456'
    });
    
    authToken = response.data.token;
    console.log('✅ Login successful');
    console.log('Token:', authToken.substring(0, 50) + '...\n');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    return false;
  }
}

async function test1_checkIngredients() {
  console.log('📋 TEST 1: Check Ingredients Availability');
  console.log('='.repeat(60));
  
  try {
    // Test với Cà phê sữa Size M, số lượng 5 cốc
    const response = await axios.get(`${BASE_URL}/inventory/check`, {
      params: {
        mon_id: 1,
        bien_the_id: 2,
        so_luong: 5
        // Skip tuy_chon_ids for now to test basic functionality
      },
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Check ingredients successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log();
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log();
  }
}

async function test2_getWarnings() {
  console.log('📋 TEST 2: Get Inventory Warnings');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(`${BASE_URL}/inventory/warnings`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get warnings successful');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log();
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log();
  }
}

async function test3_getExportHistory() {
  console.log('📋 TEST 3: Get Export History');
  console.log('='.repeat(60));
  
  try {
    // Test với limit 5
    const response = await axios.get(`${BASE_URL}/inventory/export-history`, {
      params: {
        limit: 5
      },
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get export history successful');
    console.log('Tổng số bản ghi:', response.data.total);
    console.log('Trang hiện tại:', response.data.page);
    console.log('\nCác lần xuất kho gần nhất:');
    response.data.data.forEach(item => {
      console.log(`- ${item.ten_nguyen_lieu}: ${item.so_luong_xuat}${item.don_vi_tinh} (Đơn #${item.don_hang_id}) - ${new Date(item.ngay_xuat).toLocaleString()}`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log();
  }
}

async function test4_getImportHistory() {
  console.log('📋 TEST 4: Get Import History');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(`${BASE_URL}/inventory/import-history`, {
      params: {
        limit: 5
      },
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get import history successful');
    console.log('Tổng số bản ghi:', response.data.total);
    console.log('Trang hiện tại:', response.data.page);
    console.log('\nCác lần nhập kho gần nhất:');
    response.data.data.forEach(item => {
      console.log(`- ${item.ten_nguyen_lieu}: ${item.so_luong_nhap}${item.don_vi_tinh} (${item.don_gia}đ/${item.don_vi_tinh}) - ${new Date(item.ngay_nhap).toLocaleString()}`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log();
  }
}

async function test5_getInventoryReport() {
  console.log('📋 TEST 5: Get Inventory Report');
  console.log('='.repeat(60));
  
  try {
    // Test với tuần vừa rồi
    const today = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const response = await axios.get(`${BASE_URL}/inventory/report`, {
      params: {
        from_date: weekAgo.toISOString().split('T')[0],
        to_date: today.toISOString().split('T')[0]
      },
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get inventory report successful');
    console.log('Khoảng thời gian:', response.data.period.from, '-', response.data.period.to);
    console.log('\nTổng kết:');
    console.log('- Tổng nhập:', response.data.summary.total_imports.toLocaleString(), 'đ');
    console.log('- Tổng xuất:', response.data.summary.total_exports.toLocaleString(), 'đ');
    console.log('- Chênh lệch:', response.data.summary.net_value.toLocaleString(), 'đ');
    console.log('\nChi tiết theo nguyên liệu (5 đầu tiên):');
    response.data.data.slice(0, 5).forEach(item => {
      console.log(`- ${item.ten_nguyen_lieu}:`);
      console.log(`  Nhập: ${item.tong_nhap}${item.don_vi_tinh} (${item.gia_tri_nhap?.toLocaleString() || 0}đ)`);
      console.log(`  Xuất: ${item.tong_xuat}${item.don_vi_tinh} (${item.gia_tri_xuat?.toLocaleString() || 0}đ)`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log();
  }
}

async function test6_getIngredients() {
  console.log('📋 TEST 6: Get All Ingredients');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(`${BASE_URL}/inventory/ingredients`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get ingredients successful');
    console.log('Tổng số nguyên liệu:', response.data.total);
    console.log('\nDanh sách nguyên liệu (5 đầu tiên):');
    response.data.data.slice(0, 5).forEach(item => {
      console.log(`- ${item.ten_nguyen_lieu}: ${item.ton_kho_hien_tai}${item.don_vi_tinh} (Giá: ${item.gia_nhap_trung_binh?.toLocaleString() || 0}đ/${item.don_vi_tinh})`);
      console.log(`  Tối thiểu: ${item.muc_ton_toi_thieu}${item.don_vi_tinh}, Tối đa: ${item.muc_ton_toi_da}${item.don_vi_tinh}`);
    });
    console.log();
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log();
  }
}

async function test7_getIngredientById() {
  console.log('📋 TEST 7: Get Ingredient By ID');
  console.log('='.repeat(60));
  
  try {
    // Test với ID = 1 (giả sử là cà phê)
    const response = await axios.get(`${BASE_URL}/inventory/ingredients/1`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ Get ingredient by ID successful');
    console.log('Tên nguyên liệu:', response.data.data.ten_nguyen_lieu);
    console.log('Tồn kho hiện tại:', response.data.data.ton_kho_hien_tai, response.data.data.don_vi_tinh);
    console.log('Giá nhập trung bình:', response.data.data.gia_nhap_trung_binh?.toLocaleString() || 0, 'đ');
    console.log('Mức tối thiểu:', response.data.data.muc_ton_toi_thieu, response.data.data.don_vi_tinh);
    console.log('Mức tối đa:', response.data.data.muc_ton_toi_da, response.data.data.don_vi_tinh);
    console.log();
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.log();
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('🧪 INVENTORY API TEST SUITE');
  console.log('='.repeat(60));
  console.log('\n');
  
  // Login first
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.error('Cannot proceed without authentication');
    return;
  }
  
  // Run all tests
  await test1_checkIngredients();
  await test2_getWarnings();
  await test3_getExportHistory();
  await test4_getImportHistory();
  await test5_getInventoryReport();
  await test6_getIngredients();
  await test7_getIngredientById();
  
  console.log('='.repeat(60));
  console.log('✅ ALL TESTS COMPLETED');
  console.log('='.repeat(60));
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
