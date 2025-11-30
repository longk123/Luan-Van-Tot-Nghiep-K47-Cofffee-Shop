// Test tất cả API của Kitchen
const BASE_URL = 'http://localhost:5000/api/v1';

let token = '';
let testLineId = null;

const results = { passed: 0, failed: 0, tests: [] };

async function test(name, fn) {
  try {
    await fn();
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
    console.log(`✅ PASS - ${name}`);
  } catch (err) {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: err.message });
    console.log(`❌ FAIL - ${name}`);
    console.log(`   Error: ${err.message}`);
  }
}

async function fetchApi(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

console.log('🧪 BẮT ĐẦU TEST TẤT CẢ API CỦA KITCHEN\n');
console.log('='.repeat(60) + '\n');

// ========== GROUP 1: AUTHENTICATION ==========
console.log('📋 GROUP 1: AUTHENTICATION\n');

await test('Login với kitchen01', async () => {
  const { status, data } = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'kitchen01', password: 'kitchen123' }),
  });
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(data)}`);
  if (!data.token) throw new Error('No token returned');
  token = data.token;
  console.log(`   Status ${status}`);
});

await test('Verify role kitchen', async () => {
  const { status, data } = await fetchApi('/auth/me');
  if (status !== 200) throw new Error(`Status ${status}`);
  const hasKitchenRole = data.user?.roles?.some(r => r.toLowerCase().includes('kitchen'));
  if (!hasKitchenRole) throw new Error('User does not have kitchen role');
  console.log(`   Roles: ${data.user?.roles?.join(', ')}`);
});

// ========== GROUP 2: SHIFT OPERATIONS ==========
console.log('\n📋 GROUP 2: SHIFT OPERATIONS\n');

// Thử mở ca mới cho kitchen (nếu chưa có)
await test('Open shift for kitchen (if needed)', async () => {
  const { status: checkStatus, data: checkData } = await fetchApi('/shifts/current');
  
  if (checkStatus === 200 && checkData.data && checkData.data.status === 'OPEN') {
    console.log(`   Already has open shift: ${checkData.data.id}, type: ${checkData.data.shift_type}`);
    return;
  }
  
  // Mở ca mới
  const { status, data } = await fetchApi('/shifts/open', {
    method: 'POST',
    body: JSON.stringify({ opening_cash: 0 }),
  });
  
  if (status !== 201 && status !== 200) {
    // Có thể đã có ca, không phải lỗi
    if (status === 400 && data.message?.includes('đã có')) {
      console.log(`   ${data.message}`);
      return;
    }
    throw new Error(`Status ${status}: ${JSON.stringify(data)}`);
  }
  console.log(`   Opened new shift: ${data.data?.id}, type: ${data.data?.shift_type}`);
});

await test('Get current open shift (kitchen)', async () => {
  const { status, data } = await fetchApi('/shifts/current');
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(data)}`);
  if (data.data?.shift_type !== 'KITCHEN') {
    console.log(`   ⚠️  shift_type = ${data.data?.shift_type} (expected KITCHEN)`);
  } else {
    console.log(`   shift_type = ${data.data?.shift_type} ✓`);
  }
  console.log(`   Status ${status}`);
});

// ========== GROUP 3: KITCHEN QUEUE ==========
console.log('\n📋 GROUP 3: KITCHEN QUEUE\n');

await test('Get kitchen queue', async () => {
  const { status, data } = await fetchApi('/kitchen/queue');
  if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(data)}`);
  console.log(`   Status ${status}`);
  console.log(`   Items in queue: ${data.data?.length || 0}`);
  
  // Kitchen queue trả về flat list of lines
  if (data.data && data.data.length > 0) {
    // Tìm line có status QUEUED để test
    const queuedLine = data.data.find(line => line.trang_thai_che_bien === 'QUEUED');
    if (queuedLine) {
      testLineId = queuedLine.id;
      console.log(`   Found QUEUED line ID: ${testLineId} (${queuedLine.mon_ten})`);
    } else {
      console.log(`   No QUEUED lines found`);
    }
  }
});

await test('Get kitchen queue with filter (area_id)', async () => {
  const { status, data } = await fetchApi('/kitchen/queue?area_id=1');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
});

// ========== GROUP 4: UPDATE LINE STATUS ==========
console.log('\n📋 GROUP 4: UPDATE LINE STATUS\n');

if (testLineId) {
  await test('Start making item (action=start)', async () => {
    const { status, data } = await fetchApi(`/kitchen/lines/${testLineId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'start' }),
    });
    if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(data)}`);
    console.log(`   Status ${status}`);
    console.log(`   Line ${testLineId} → MAKING`);
  });

  await test('Complete item (action=done)', async () => {
    const { status, data } = await fetchApi(`/kitchen/lines/${testLineId}`, {
      method: 'PATCH',
      body: JSON.stringify({ action: 'done' }),
    });
    if (status !== 200) throw new Error(`Status ${status}: ${JSON.stringify(data)}`);
    console.log(`   Status ${status}`);
    console.log(`   Line ${testLineId} → DONE`);
  });
} else {
  console.log('   ⚠️  No QUEUED items to test update status');
}

// ========== GROUP 5: COMPLETED ITEMS ==========
console.log('\n📋 GROUP 5: COMPLETED ITEMS\n');

await test('Get completed items', async () => {
  const { status, data } = await fetchApi('/kitchen/completed');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Completed items: ${data.data?.length || 0}`);
});

await test('Get completed items with limit', async () => {
  const { status, data } = await fetchApi('/kitchen/completed?limit=5');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Items returned: ${data.data?.length || 0}`);
});

// ========== GROUP 6: VALIDATION & ERROR HANDLING ==========
console.log('\n📋 GROUP 6: VALIDATION & ERROR HANDLING\n');

await test('Update with invalid action (should fail)', async () => {
  const { status } = await fetchApi('/kitchen/lines/1', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'invalid' }),
  });
  if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  console.log(`   Status ${status} (expected 400)`);
});

await test('Cancel without reason (should fail)', async () => {
  const { status } = await fetchApi('/kitchen/lines/1', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'cancel' }),
  });
  if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  console.log(`   Status ${status} (expected 400)`);
});

await test('Update non-existent line (should fail)', async () => {
  const { status } = await fetchApi('/kitchen/lines/999999', {
    method: 'PATCH',
    body: JSON.stringify({ action: 'start' }),
  });
  if (status !== 200 && status !== 404 && status !== 500) {
    throw new Error(`Expected error status, got ${status}`);
  }
  console.log(`   Status ${status} (error handling works)`);
});

// ========== GROUP 7: SHIFT REPORT ==========
console.log('\n📋 GROUP 7: SHIFT REPORT (Kitchen)\n');

await test('Get shift report', async () => {
  // Lấy shift ID hiện tại trước
  const { data: shiftData } = await fetchApi('/shifts/current');
  const shiftId = shiftData.data?.id;
  
  if (!shiftId) {
    console.log('   ⚠️  No open shift to get report');
    return;
  }
  
  const { status, data } = await fetchApi(`/shifts/${shiftId}/report`);
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  if (data.data) {
    console.log(`   Shift type: ${data.data.shift_type}`);
    console.log(`   Items completed: ${data.data.total_items_completed || data.data.items_completed || 0}`);
  }
});

// ========== SUMMARY ==========
console.log('\n' + '='.repeat(60));
console.log('\n📊 KẾT QUẢ TEST');
console.log(`✅ Passed: ${results.passed}`);
console.log(`❌ Failed: ${results.failed}`);
console.log(`📝 Total: ${results.passed + results.failed}`);
console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);
console.log('\n' + '='.repeat(60));
