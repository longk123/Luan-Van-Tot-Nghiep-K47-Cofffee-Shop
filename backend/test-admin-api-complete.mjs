// test-admin-api-complete.mjs
// Kiểm tra toàn diện API cho role Admin

const BASE_URL = 'http://localhost:5000/api/v1';
let token = '';
let passed = 0, failed = 0;

async function fetchApi(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS - ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL - ${name}`);
    console.log(`   Error: ${e.message}`);
    failed++;
  }
}

console.log('🧪 BẮT ĐẦU TEST TẤT CẢ API CỦA ADMIN\n');
console.log('='.repeat(60) + '\n');

// ========== GROUP 1: AUTHENTICATION ==========
console.log('📋 GROUP 1: AUTHENTICATION\n');

await test('Login với admin', async () => {
  const { status, data } = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: '123456' })
  });
  if (status !== 200) throw new Error(`Status ${status}: ${data.error || data.message}`);
  token = data.token;
  console.log(`   Status ${status}`);
});

await test('Verify role admin', async () => {
  const { status, data } = await fetchApi('/auth/me');
  if (status !== 200) throw new Error(`Status ${status}`);
  const roles = data.user?.roles || data.data?.roles || data.roles || [];
  if (!roles.includes('admin')) throw new Error(`Missing admin role, has: ${roles.join(', ')}`);
  console.log(`   Roles: ${roles.join(', ')}`);
});

// ========== GROUP 2: USER MANAGEMENT ==========
console.log('\n📋 GROUP 2: USER MANAGEMENT\n');

await test('Get all users', async () => {
  const { status, data } = await fetchApi('/auth/users');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Users: ${data.data?.length || 0}`);
});

await test('Get all roles', async () => {
  const { status, data } = await fetchApi('/auth/roles');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Roles: ${data.data?.map(r => r.role_name).join(', ')}`);
});

let testUserId = null;
// Get waiter role_id first
let waiterRoleId = null;
let kitchenRoleId = null;
await test('Get role IDs', async () => {
  const { status, data } = await fetchApi('/auth/roles');
  if (status !== 200) throw new Error(`Status ${status}`);
  const roles = data.data || data;
  waiterRoleId = roles.find(r => r.role_name.toLowerCase() === 'waiter')?.role_id;
  kitchenRoleId = roles.find(r => r.role_name.toLowerCase() === 'kitchen')?.role_id;
  if (!waiterRoleId) throw new Error('Waiter role not found');
  console.log(`   Waiter role_id: ${waiterRoleId}, Kitchen role_id: ${kitchenRoleId}`);
});

await test('Create new user', async () => {
  const { status, data } = await fetchApi('/auth/users', {
    method: 'POST',
    body: JSON.stringify({
      username: 'test_user_' + Date.now(),
      password: 'test123456',
      full_name: 'Test User',
      email: `test${Date.now()}@test.com`,
      phone: '0901234567',
      roles: [waiterRoleId]
    })
  });
  if (status !== 201 && status !== 200) throw new Error(`Status ${status}: ${data.error || data.message}`);
  testUserId = data.data?.user_id || data.user_id;
  console.log(`   Status ${status}`);
  console.log(`   Created user ID: ${testUserId}`);
});

await test('Get user by ID', async () => {
  if (!testUserId) throw new Error('No test user created');
  const { status, data } = await fetchApi(`/auth/users/${testUserId}`);
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Username: ${data.data?.username}`);
});

await test('Update user', async () => {
  if (!testUserId) throw new Error('No test user created');
  const { status, data } = await fetchApi(`/auth/users/${testUserId}`, {
    method: 'PUT',
    body: JSON.stringify({
      full_name: 'Updated Test User',
      roles: [waiterRoleId, kitchenRoleId].filter(Boolean)
    })
  });
  if (status !== 200) throw new Error(`Status ${status}: ${data.error || data.message}`);
  console.log(`   Status ${status}`);
});

await test('Get user shifts', async () => {
  if (!testUserId) throw new Error('No test user created');
  const { status, data } = await fetchApi(`/auth/users/${testUserId}/shifts`);
  if (status !== 200 && status !== 404) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Shifts: ${data.data?.length || 0}`);
});

await test('Get user stats', async () => {
  if (!testUserId) throw new Error('No test user created');
  const { status, data } = await fetchApi(`/auth/users/${testUserId}/stats`);
  if (status !== 200 && status !== 404) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
});

await test('Delete user', async () => {
  if (!testUserId) throw new Error('No test user created');
  const { status, data } = await fetchApi(`/auth/users/${testUserId}`, {
    method: 'DELETE'
  });
  if (status !== 200 && status !== 204) throw new Error(`Status ${status}: ${data.error || data.message}`);
  console.log(`   Status ${status}`);
});

// ========== GROUP 3: SYSTEM SETTINGS ==========
console.log('\n📋 GROUP 3: SYSTEM SETTINGS (Admin only)\n');

await test('Get system settings', async () => {
  const { status, data } = await fetchApi('/admin/settings');
  if (status !== 200 && status !== 404) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  if (status === 200 && data.data) {
    console.log(`   Settings keys: ${Object.keys(data.data).slice(0, 5).join(', ')}...`);
  }
});

await test('Update system settings', async () => {
  const { status, data } = await fetchApi('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({
      test_setting: 'test_value_' + Date.now()
    })
  });
  if (status !== 200 && status !== 404) throw new Error(`Status ${status}: ${data.error || data.message}`);
  console.log(`   Status ${status}`);
});

// ========== GROUP 4: SYSTEM LOGS ==========
console.log('\n📋 GROUP 4: SYSTEM LOGS (Admin only)\n');

await test('Get system logs', async () => {
  const { status, data } = await fetchApi('/admin/logs?limit=10');
  if (status !== 200 && status !== 404) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  if (status === 200) {
    console.log(`   Logs: ${data.data?.length || 0}`);
  }
});

await test('Get system logs with filter', async () => {
  const { status, data } = await fetchApi('/admin/logs?level=ERROR&limit=5');
  if (status !== 200 && status !== 404) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
});

// ========== GROUP 5: SYSTEM HEALTH ==========
console.log('\n📋 GROUP 5: SYSTEM HEALTH (Admin only)\n');

await test('Get system health', async () => {
  const { status, data } = await fetchApi('/admin/health');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  if (data.data) {
    console.log(`   System: ${data.data.system?.status}`);
    console.log(`   Database: ${data.data.database?.status}`);
    console.log(`   DB Size: ${data.data.database?.size}`);
    console.log(`   Active Users: ${data.data.business?.total_users}`);
    console.log(`   Active Shifts: ${data.data.business?.active_shifts}`);
  }
});

// ========== GROUP 6: MANAGER APIs (Admin cũng có thể truy cập) ==========
console.log('\n📋 GROUP 6: MANAGER APIs (Admin inherits)\n');

await test('Get analytics overview', async () => {
  const { status, data } = await fetchApi('/analytics/overview');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Orders today: ${data.data?.ordersToday || 0}`);
});

await test('Get all promotions', async () => {
  const { status, data } = await fetchApi('/promotions');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Promotions: ${data.data?.length || 0}`);
});

await test('Get inventory warnings', async () => {
  const { status, data } = await fetchApi('/inventory/warnings');
  if (status !== 200 && status !== 404) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
});

await test('Get all tables', async () => {
  const { status, data } = await fetchApi('/tables');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Tables: ${data.data?.length || 0}`);
});

await test('Get menu categories', async () => {
  const { status, data } = await fetchApi('/menu/categories');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Categories: ${data.data?.length || 0}`);
});

// ========== GROUP 7: WALLET MANAGEMENT (Admin) ==========
console.log('\n📋 GROUP 7: WALLET MANAGEMENT\n');

await test('Get all shipper wallets', async () => {
  const { status, data } = await fetchApi('/wallet/all');
  if (status !== 200) throw new Error(`Status ${status}`);
  console.log(`   Status ${status}`);
  console.log(`   Wallets: ${data.data?.length || 0}`);
});

// ========== GROUP 8: VALIDATION & SECURITY ==========
console.log('\n📋 GROUP 8: VALIDATION & SECURITY\n');

await test('Manager cannot access admin routes', async () => {
  // Login as manager
  const loginRes = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'manager01', password: 'manager123' })
  });
  const managerToken = loginRes.data.token;
  
  // Try to access admin route
  const res = await fetch(`${BASE_URL}/admin/health`, {
    headers: { Authorization: `Bearer ${managerToken}` }
  });
  
  if (res.status !== 403 && res.status !== 401) {
    throw new Error(`Expected 401/403, got ${res.status}`);
  }
  console.log(`   Status ${res.status} (expected 401/403)`);
});

await test('Cashier cannot manage users', async () => {
  // Login as cashier
  const loginRes = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'cashier01', password: 'cashier123' })
  });
  const cashierToken = loginRes.data.token;
  
  // Try to list users
  const res = await fetch(`${BASE_URL}/auth/users`, {
    headers: { Authorization: `Bearer ${cashierToken}` }
  });
  
  if (res.status !== 403 && res.status !== 401) {
    throw new Error(`Expected 401/403, got ${res.status}`);
  }
  console.log(`   Status ${res.status} (expected 401/403)`);
});

await test('Cannot assign admin role without admin privileges', async () => {
  // First get admin role_id
  const rolesRes = await fetchApi('/auth/roles');
  const allRoles = rolesRes.data.data || rolesRes.data;
  const adminRoleId = allRoles.find(r => r.role_name.toLowerCase() === 'admin')?.role_id;
  if (!adminRoleId) throw new Error('Admin role not found');
  
  // Login as manager
  const loginRes = await fetchApi('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'manager01', password: 'manager123' })
  });
  const managerToken = loginRes.data.token;
  
  // Try to create user with admin role
  const res = await fetch(`${BASE_URL}/auth/users`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${managerToken}` 
    },
    body: JSON.stringify({
      username: 'try_admin_' + Date.now(),
      password: 'test123',
      full_name: 'Try Admin',
      roles: [adminRoleId]
    })
  });
  
  // Should fail - only admin can assign admin role
  if (res.status !== 403 && res.status !== 400) {
    throw new Error(`Expected 400/403, got ${res.status}`);
  }
  console.log(`   Status ${res.status} (expected 400/403)`);
});

// ========== SUMMARY ==========
console.log('\n' + '='.repeat(60) + '\n');
console.log('📊 KẾT QUẢ TEST');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📝 Total: ${passed + failed}`);
console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
console.log('\n' + '='.repeat(60));

process.exit(failed > 0 ? 1 : 0);
