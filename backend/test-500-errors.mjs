// test-500-errors.mjs - Kiểm tra các API đang trả 500
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/v1';
let token = '';

async function login() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'manager01', password: 'manager123' })
  });
  const data = await res.json();
  token = data.token || data.data?.token;
  console.log('✅ Logged in as manager01, token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
  console.log('   Response structure:', Object.keys(data));
}

async function testAPI(name, path) {
  console.log(`\n🔍 Testing ${name}...`);
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    console.log(`   Status: ${res.status}`);
    if (res.status !== 200) {
      console.log(`   Error: ${data.error || data.message || JSON.stringify(data)}`);
    } else {
      console.log(`   ✅ Success`);
    }
    return res.status;
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}`);
    return 0;
  }
}

async function main() {
  await login();

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];

  // Test the 3 APIs that returned 500
  await testAPI('Shift Stats', '/analytics/shift-stats?days=7');
  await testAPI('Profit Comparison', `/analytics/profit-comparison?startDate=${lastMonth}&endDate=${today}&timeRange=month`);
  await testAPI('Promotion Statistics', '/promotions/statistics');

  // Also test promotions/:id/stats
  const promoRes = await fetch(`${BASE_URL}/promotions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const promoData = await promoRes.json();
  if (promoData.data?.length > 0) {
    const promoId = promoData.data[0].id;
    await testAPI(`Promotion ${promoId} Stats`, `/promotions/${promoId}/stats`);
  }

  console.log('\n✅ Done');
  process.exit(0);
}

main();
