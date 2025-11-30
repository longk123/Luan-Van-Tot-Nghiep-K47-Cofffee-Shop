// Test toàn bộ API của Waiter - Frontend và Backend
const API_BASE = 'http://localhost:5000/api/v1';

let token = null;
let testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, message = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} - ${name}`);
  if (message) console.log(`   ${message}`);
  
  testResults.tests.push({ name, passed, message });
  if (passed) testResults.passed++;
  else testResults.failed++;
}

async function testAPI(name, method, endpoint, body = null, expectedStatus = 200, validate = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json().catch(() => ({}));
    
    if (response.status !== expectedStatus) {
      logTest(name, false, `Expected status ${expectedStatus}, got ${response.status}`);
      return null;
    }
    
    if (validate) {
      const validationResult = validate(data);
      if (!validationResult.valid) {
        logTest(name, false, validationResult.message);
        return null;
      }
    }
    
    logTest(name, true, `Status ${response.status}`);
    return data;
  } catch (err) {
    logTest(name, false, err.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 BẮT ĐẦU TEST TẤT CẢ API CỦA WAITER\n');
  console.log('='.repeat(60));
  
  // ===== TEST 1: LOGIN =====
  console.log('\n📋 GROUP 1: AUTHENTICATION');
  const loginData = await testAPI(
    'Login với waiter01',
    'POST',
    '/auth/login',
    { username: 'waiter01', password: 'waiter123' },
    200,
    (data) => {
      if (!data.token) return { valid: false, message: 'Missing token' };
      if (!data.user) return { valid: false, message: 'Missing user data' };
      if (!data.user.roles || !data.user.roles.includes('waiter')) {
        return { valid: false, message: 'User does not have waiter role' };
      }
      return { valid: true };
    }
  );
  
  if (!loginData) {
    console.log('\n❌ Cannot continue without login');
    return;
  }
  
  token = loginData.token;
  const userId = loginData.user.user_id;
  
  // ===== TEST 2: SHIFT OPERATIONS =====
  console.log('\n📋 GROUP 2: SHIFT OPERATIONS');
  
  await testAPI(
    'Get current shift orders',
    'GET',
    '/pos/orders/current-shift',
    null,
    200,
    (data) => {
      if (!data.success) return { valid: false, message: 'success = false' };
      if (!data.data) return { valid: false, message: 'Missing data' };
      if (data.data.isWaiter !== true) {
        return { valid: false, message: 'isWaiter flag should be true' };
      }
      if (!Array.isArray(data.data.orders)) {
        return { valid: false, message: 'orders should be array' };
      }
      return { valid: true };
    }
  );
  
  // ===== TEST 3: WALLET APIs =====
  console.log('\n📋 GROUP 3: WALLET APIs');
  
  const walletData = await testAPI(
    'Get my wallet',
    'GET',
    '/wallet/me',
    null,
    200,
    (data) => {
      if (!data.success) return { valid: false, message: 'success = false' };
      const wallet = data.data || data;
      if (wallet.balance === undefined) {
        return { valid: false, message: 'Missing balance field' };
      }
      if (wallet.total_collected === undefined) {
        return { valid: false, message: 'Missing total_collected field' };
      }
      if (wallet.total_settled === undefined) {
        return { valid: false, message: 'Missing total_settled field' };
      }
      return { valid: true };
    }
  );
  
  await testAPI(
    'Get wallet transactions',
    'GET',
    '/wallet/transactions',
    null,
    200,
    (data) => {
      if (!data.success) return { valid: false, message: 'success = false' };
      if (!Array.isArray(data.data)) {
        return { valid: false, message: 'data should be array' };
      }
      return { valid: true };
    }
  );
  
  await testAPI(
    'Check wallet limit',
    'GET',
    '/wallet/check-limit',
    null,
    200,
    (data) => {
      if (!data.success) return { valid: false, message: 'success = false' };
      return { valid: true };
    }
  );
  
  await testAPI(
    'Get unrecorded orders',
    'GET',
    '/wallet/unrecorded',
    null,
    200,
    (data) => {
      if (!data.success) return { valid: false, message: 'success = false' };
      if (!Array.isArray(data.data)) {
        return { valid: false, message: 'data should be array' };
      }
      return { valid: true };
    }
  );
  
  // ===== TEST 4: DELIVERY APIs =====
  console.log('\n📋 GROUP 4: DELIVERY APIs');
  
  const deliveryData = await testAPI(
    'Get my assigned deliveries',
    'GET',
    '/pos/delivery/my-assigned',
    null,
    200,
    (data) => {
      if (!data.success) return { valid: false, message: 'success = false' };
      if (!Array.isArray(data.data)) {
        return { valid: false, message: 'data should be array' };
      }
      return { valid: true };
    }
  );
  
  await testAPI(
    'Get my assigned deliveries (filtered by ASSIGNED)',
    'GET',
    '/pos/delivery/my-assigned?status=ASSIGNED',
    null,
    200,
    (data) => {
      if (!data.success) return { valid: false, message: 'success = false' };
      if (!Array.isArray(data.data)) {
        return { valid: false, message: 'data should be array' };
      }
      return { valid: true };
    }
  );
  
  // ===== TEST 5: CLAIM/UNCLAIM DELIVERY (nếu có đơn PENDING) =====
  console.log('\n📋 GROUP 5: CLAIM/UNCLAIM DELIVERY');
  
  // Tìm đơn PENDING để test
  const { Pool } = await import('pg');
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '123456',
    database: 'coffee_shop'
  });
  
  const pendingOrders = await pool.query(`
    SELECT dh.id 
    FROM don_hang dh
    JOIN don_hang_delivery_info di ON di.order_id = dh.id
    WHERE dh.trang_thai = 'PAID'
      AND dh.order_type = 'DELIVERY'
      AND di.delivery_status = 'PENDING'
    LIMIT 1
  `);
  
  if (pendingOrders.rows.length > 0) {
    const pendingOrderId = pendingOrders.rows[0].id;
    
    // Test claim
    const claimResult = await testAPI(
      'Claim delivery order',
      'POST',
      '/pos/orders/claim-delivery',
      { orderIds: [pendingOrderId] },
      200,
      (data) => {
        if (!data.success) return { valid: false, message: 'success = false' };
        return { valid: true };
      }
    );
    
    if (claimResult) {
      // Test unclaim với lý do hợp lệ
      await testAPI(
        'Unclaim delivery order (valid reason)',
        'POST',
        '/pos/orders/unclaim-delivery',
        { 
          orderIds: [pendingOrderId], 
          reason: 'Test unclaim - địa chỉ quá xa, không giao được' 
        },
        200,
        (data) => {
          if (!data.success) return { valid: false, message: 'success = false' };
          return { valid: true };
        }
      );
    }
  } else {
    console.log('   ⚠️  Không có đơn PENDING để test claim/unclaim');
  }
  
  // ===== TEST 6: UPDATE DELIVERY STATUS =====
  console.log('\n📋 GROUP 6: UPDATE DELIVERY STATUS');
  
  // Tìm đơn ASSIGNED của waiter để test update status
  const assignedOrders = await pool.query(`
    SELECT dh.id 
    FROM don_hang dh
    JOIN don_hang_delivery_info di ON di.order_id = dh.id
    WHERE di.shipper_id = $1
      AND di.delivery_status = 'ASSIGNED'
    LIMIT 1
  `, [userId]);
  
  if (assignedOrders.rows.length > 0) {
    const assignedOrderId = assignedOrders.rows[0].id;
    
    // Test update to OUT_FOR_DELIVERY
    await testAPI(
      'Update delivery status to OUT_FOR_DELIVERY',
      'PATCH',
      `/pos/orders/${assignedOrderId}/delivery-status`,
      { status: 'OUT_FOR_DELIVERY' },
      200,
      (data) => {
        if (!data.success) return { valid: false, message: 'success = false' };
        return { valid: true };
      }
    );
    
    // Test update back to ASSIGNED
    await testAPI(
      'Update delivery status back to ASSIGNED',
      'PATCH',
      `/pos/orders/${assignedOrderId}/delivery-status`,
      { status: 'ASSIGNED' },
      200,
      (data) => {
        if (!data.success) return { valid: false, message: 'success = false' };
        return { valid: true };
      }
    );
  } else {
    console.log('   ⚠️  Không có đơn ASSIGNED để test update status');
  }
  
  // ===== TEST 7: VALIDATION TESTS =====
  console.log('\n📋 GROUP 7: VALIDATION & ERROR HANDLING');
  
  await testAPI(
    'Claim with empty orderIds (should fail)',
    'POST',
    '/pos/orders/claim-delivery',
    { orderIds: [] },
    400
  );
  
  await testAPI(
    'Claim with invalid orderIds (should fail)',
    'POST',
    '/pos/orders/claim-delivery',
    { orderIds: ['abc', 'def'] },
    400
  );
  
  await testAPI(
    'Unclaim without reason (should fail - backend requires reason)',
    'POST',
    '/pos/orders/unclaim-delivery',
    { orderIds: [999999], reason: '' },
    400
  );
  
  await pool.end();
  
  // ===== SUMMARY =====
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 KẾT QUẢ TEST');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📝 Total: ${testResults.tests.length}`);
  console.log(`📈 Success Rate: ${((testResults.passed / testResults.tests.length) * 100).toFixed(2)}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => console.log(`   - ${t.name}: ${t.message}`));
  }
  
  console.log('\n' + '='.repeat(60));
  process.exit(testResults.failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('💥 Test runner error:', err);
  process.exit(1);
});
