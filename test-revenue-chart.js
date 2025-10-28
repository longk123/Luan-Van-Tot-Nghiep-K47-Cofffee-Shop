// Test script để kiểm tra API getRevenueChart
import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api/v1';

// Đăng nhập để lấy token
async function login() {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'manager1',
      password: 'password123'
    })
  });

  const data = await response.json();
  console.log('Login response:', data);
  return data.token || data.data?.token;
}

// Test API với startDate và endDate
async function testRevenueChart() {
  try {
    console.log('🔐 Đăng nhập...');
    const token = await login();
    console.log('✅ Đăng nhập thành công!');
    
    // Test 1: Tuần từ 20/10 đến 26/10
    console.log('\n📊 Test 1: Tuần từ 20/10 đến 26/10');
    const response1 = await fetch(`${API_URL}/analytics/revenue-chart?startDate=2025-10-20&endDate=2025-10-26`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data1 = await response1.json();
    console.log('Labels:', data1.data.labels);
    console.log('Tổng doanh thu:', data1.data.datasets[0].data);
    console.log('Tổng:', data1.data.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString('vi-VN'), 'VNĐ');
    
    // Test 2: Ngày hôm nay (27/10)
    console.log('\n📊 Test 2: Ngày hôm nay (27/10)');
    const response2 = await fetch(`${API_URL}/analytics/revenue-chart?startDate=2025-10-27&endDate=2025-10-27`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data2 = await response2.json();
    console.log('Labels:', data2.data.labels);
    console.log('Tổng doanh thu:', data2.data.datasets[0].data);
    console.log('Tổng:', data2.data.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString('vi-VN'), 'VNĐ');
    
    // Test 3: 7 ngày gần nhất (fallback với days)
    console.log('\n📊 Test 3: 7 ngày gần nhất (fallback)');
    const response3 = await fetch(`${API_URL}/analytics/revenue-chart?days=7`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data3 = await response3.json();
    console.log('Labels:', data3.data.labels);
    console.log('Tổng doanh thu:', data3.data.datasets[0].data);
    console.log('Tổng:', data3.data.datasets[0].data.reduce((a, b) => a + b, 0).toLocaleString('vi-VN'), 'VNĐ');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  }
}

testRevenueChart();

