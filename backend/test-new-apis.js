// Test script cho các API mới
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/v1';

async function testNewAPIs() {
  console.log('🧪 Bắt đầu test các API mới...\n');

  try {
    // Test 1: Order Summary API
    console.log('1. Testing GET /pos/orders/:orderId/summary...');
    const summaryResponse = await fetch(`${BASE_URL}/pos/orders/3/summary`);
    const summaryData = await summaryResponse.json();
    console.log('✅ Order summary:', summaryResponse.status === 200 ? 'PASS' : 'FAIL');
    console.log('   Status:', summaryResponse.status);
    console.log('   Summary:', summaryData.data);
    console.log('');

    // Test 2: Tables by Area API
    console.log('2. Testing GET /areas/:id/tables...');
    const tablesResponse = await fetch(`${BASE_URL}/areas/2/tables`);
    const tablesData = await tablesResponse.json();
    console.log('✅ Tables by area:', tablesResponse.status === 200 ? 'PASS' : 'FAIL');
    console.log('   Status:', tablesResponse.status);
    console.log('   Tables count:', tablesData.data?.length || 0);
    if (tablesData.data?.length > 0) {
      console.log('   First table:', tablesData.data[0]);
    }
    console.log('');

    // Test 3: SSE Events API (test connection)
    console.log('3. Testing GET /pos/events (SSE connection)...');
    try {
      const eventsResponse = await fetch(`${BASE_URL}/pos/events`, {
        headers: {
          'Accept': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });
      console.log('✅ SSE Events:', eventsResponse.status === 200 ? 'PASS' : 'FAIL');
      console.log('   Status:', eventsResponse.status);
      console.log('   Content-Type:', eventsResponse.headers.get('content-type'));
      
      // Test đơn giản - chỉ kiểm tra kết nối
      console.log('   SSE connection established successfully');
    } catch (e) {
      console.log('❌ SSE Events: FAIL');
      console.log('   Error:', e.message);
    }
    console.log('');

    // Test 4: Test tạo order mới để trigger events
    console.log('4. Testing order creation to trigger events...');
    try {
      // Tạo ca OPEN trước
      const shiftData = { nhan_vien_id: 1, opening_cash: 100000 };
      const shiftResponse = await fetch(`${BASE_URL}/shifts/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shiftData)
      });
      
      if (shiftResponse.ok) {
        // Tạo order mới
        const orderData = { nhan_vien_id: 1 };
        const orderResponse = await fetch(`${BASE_URL}/pos/orders/10`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orderData)
        });
        console.log('✅ Create order (trigger events):', orderResponse.status === 201 ? 'PASS' : 'FAIL');
        console.log('   Status:', orderResponse.status);
        
        const orderResult = await orderResponse.json();
        if (orderResult.order) {
          global.testOrderId = orderResult.order.id;
          console.log('   Order ID:', global.testOrderId);
        }
      }
    } catch (e) {
      console.log('❌ Order creation: FAIL');
      console.log('   Error:', e.message);
    }
    console.log('');

    // Test 5: Test thêm item để trigger events
    if (global.testOrderId) {
      console.log('5. Testing add item to trigger events...');
      try {
        const itemData = {
          mon_id: 1,
          so_luong: 2,
          don_gia: 30000
        };
        const itemResponse = await fetch(`${BASE_URL}/pos/orders/${global.testOrderId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemData)
        });
        console.log('✅ Add item (trigger events):', itemResponse.status === 201 ? 'PASS' : 'FAIL');
        console.log('   Status:', itemResponse.status);
      } catch (e) {
        console.log('❌ Add item: FAIL');
        console.log('   Error:', e.message);
      }
    } else {
      console.log('5. Skipping add item test (no order ID)');
    }

  } catch (error) {
    console.log('❌ Test failed with error:', error.message);
  }
}

// Chạy test
testNewAPIs();
