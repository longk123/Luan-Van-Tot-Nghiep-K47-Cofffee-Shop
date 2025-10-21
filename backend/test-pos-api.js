// Test script cho API pos
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/v1';

async function testPosAPI() {
  console.log('🧪 Bắt đầu test API pos...\n');

  try {
    // Test 1: Kiểm tra health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.ok ? 'PASS' : 'FAIL');
    console.log('');

    // Test 2: Test lấy danh sách bàn
    console.log('2. Testing GET /pos/tables...');
    const tablesResponse = await fetch(`${BASE_URL}/pos/tables`);
    const tablesData = await tablesResponse.json();
    console.log('✅ Get tables:', tablesResponse.status === 200 ? 'PASS' : 'FAIL');
    console.log('   Status:', tablesResponse.status);
    console.log('   Tables count:', tablesData.data?.length || 0);
    console.log('');

    // Test 3: Tạo ca OPEN trước
    console.log('3. Testing POST /shifts/open (create shift first)...');
    try {
      const shiftData = {
        nhan_vien_id: 1,
        opening_cash: 100000
      };
      const shiftResponse = await fetch(`${BASE_URL}/shifts/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftData)
      });
      const shiftResult = await shiftResponse.json();
      console.log('✅ Create shift:', shiftResponse.status === 201 ? 'PASS' : 'FAIL');
      console.log('   Status:', shiftResponse.status);
      console.log('   Shift ID:', shiftResult.shift?.id);
    } catch (e) {
      console.log('❌ Create shift: FAIL');
      console.log('   Error:', e.message);
    }
    console.log('');

    // Test 4: Test tạo order mới
    console.log('4. Testing POST /pos/orders/:banId...');
    try {
      const orderData = {
        nhan_vien_id: 1
      };
      const orderResponse = await fetch(`${BASE_URL}/pos/orders/9`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      const orderResult = await orderResponse.json();
      console.log('✅ Create order:', orderResponse.status === 201 ? 'PASS' : 'FAIL');
      console.log('   Status:', orderResponse.status);
      console.log('   Response:', orderResult);
      console.log('   Order ID:', orderResult.order?.id);
      
      // Lưu order ID để test tiếp
      global.testOrderId = orderResult.order?.id;
    } catch (e) {
      console.log('❌ Create order: FAIL');
      console.log('   Error:', e.message);
    }
    console.log('');

    // Test 5: Test lấy items của order
    if (global.testOrderId) {
      console.log('5. Testing GET /pos/orders/:orderId/items...');
      try {
        const itemsResponse = await fetch(`${BASE_URL}/pos/orders/${global.testOrderId}/items`);
        const itemsData = await itemsResponse.json();
        console.log('✅ Get order items:', itemsResponse.status === 200 ? 'PASS' : 'FAIL');
        console.log('   Status:', itemsResponse.status);
        console.log('   Items count:', itemsData.items?.length || 0);
      } catch (e) {
        console.log('❌ Get order items: FAIL');
        console.log('   Error:', e.message);
      }
    } else {
      console.log('5. Skipping get order items test (no order ID)');
    }
    console.log('');

    // Test 6: Test validation errors
    console.log('6. Testing validation errors...');
    try {
      // Test missing nhan_vien_id
      const invalidResponse = await fetch(`${BASE_URL}/pos/orders/9`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      console.log('✅ Missing nhan_vien_id validation:', invalidResponse.status === 400 ? 'PASS' : 'FAIL');
      console.log('   Status:', invalidResponse.status);
    } catch (e) {
      console.log('❌ Validation test: FAIL');
      console.log('   Error:', e.message);
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
}

// Chạy test
testPosAPI();
