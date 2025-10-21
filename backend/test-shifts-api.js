// Test script cho API shifts
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/v1';

async function testAPI() {
  console.log('🧪 Bắt đầu test API shifts...\n');

  try {
    // Test 1: Kiểm tra health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData.ok ? 'PASS' : 'FAIL');
    console.log('   Response:', healthData);
    console.log('');

    // Test 2: Test my-open shift (không có ca nào)
    console.log('2. Testing GET /shifts/my-open (no open shift)...');
    try {
      const myOpenResponse = await fetch(`${BASE_URL}/shifts/my-open?nhan_vien_id=1`);
      const myOpenData = await myOpenResponse.json();
      console.log('✅ My open shift:', myOpenResponse.status === 200 ? 'PASS' : 'FAIL');
      console.log('   Status:', myOpenResponse.status);
      console.log('   Response:', myOpenData);
    } catch (e) {
      console.log('❌ My open shift: FAIL');
      console.log('   Error:', e.message);
    }
    console.log('');

    // Test 3: Test mở ca mới
    console.log('3. Testing POST /shifts/open...');
    try {
      const openShiftData = {
        nhan_vien_id: 1,
        opening_cash: 100000
      };
      const openResponse = await fetch(`${BASE_URL}/shifts/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(openShiftData)
      });
      const openData = await openResponse.json();
      console.log('✅ Open shift:', openResponse.status === 201 ? 'PASS' : 'FAIL');
      console.log('   Status:', openResponse.status);
      console.log('   Response:', openData);
      
      // Lưu shift ID để test close
      global.testShiftId = openData.shift?.id;
    } catch (e) {
      console.log('❌ Open shift: FAIL');
      console.log('   Error:', e.message);
    }
    console.log('');

    // Test 4: Test lấy ca đang mở
    console.log('4. Testing GET /shifts/my-open (with open shift)...');
    try {
      const myOpenResponse2 = await fetch(`${BASE_URL}/shifts/my-open?nhan_vien_id=1`);
      const myOpenData2 = await myOpenResponse2.json();
      console.log('✅ My open shift (with data):', myOpenResponse2.status === 200 ? 'PASS' : 'FAIL');
      console.log('   Status:', myOpenResponse2.status);
      console.log('   Response:', myOpenData2);
    } catch (e) {
      console.log('❌ My open shift (with data): FAIL');
      console.log('   Error:', e.message);
    }
    console.log('');

    // Test 5: Test đóng ca
    if (global.testShiftId) {
      console.log('5. Testing POST /shifts/:id/close...');
      try {
        const closeShiftData = {
          closing_cash: 150000,
          note: 'Ca làm hoàn thành'
        };
        const closeResponse = await fetch(`${BASE_URL}/shifts/${global.testShiftId}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(closeShiftData)
        });
        const closeData = await closeResponse.json();
        console.log('✅ Close shift:', closeResponse.status === 200 ? 'PASS' : 'FAIL');
        console.log('   Status:', closeResponse.status);
        console.log('   Response:', closeData);
      } catch (e) {
        console.log('❌ Close shift: FAIL');
        console.log('   Error:', e.message);
      }
    } else {
      console.log('5. Skipping close shift test (no shift ID)');
    }
    console.log('');

    // Test 6: Test validation errors
    console.log('6. Testing validation errors...');
    try {
      // Test missing nhan_vien_id
      const invalidResponse = await fetch(`${BASE_URL}/shifts/my-open`);
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
testAPI();
