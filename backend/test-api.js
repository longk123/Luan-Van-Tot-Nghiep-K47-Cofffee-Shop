// backend/test-api.js
// Script test API endpoints

// Sử dụng built-in fetch của Node.js 18+

const BASE_URL = 'http://localhost:5000/api/v1';

async function testAPI() {
  try {
    console.log('🧪 Testing API endpoints...\n');

    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health:', healthData.ok ? 'OK' : 'FAILED');
    console.log('   Request ID:', healthResponse.headers.get('x-request-id'));
    console.log('   Rate Limit:', healthResponse.headers.get('ratelimit-limit'));
    console.log('');

    // Test hello endpoint
    console.log('2. Testing hello endpoint...');
    const helloResponse = await fetch(`${BASE_URL}/hello`);
    const helloData = await helloResponse.json();
    console.log('✅ Hello:', helloData.message);
    console.log('');

    // Test login endpoint (will fail without database)
    console.log('3. Testing login endpoint...');
    try {
      const loginResponse = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin123' })
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✅ Login successful:', loginData.user.username);
      } else {
        const errorData = await loginResponse.json();
        console.log('❌ Login failed:', errorData.error);
        console.log('   This is expected if database is not set up');
      }
    } catch (error) {
      console.log('❌ Login error:', error.message);
    }

    // Test tables endpoint (requires authentication)
    console.log('4. Testing tables endpoint...');
    try {
      const tablesResponse = await fetch(`${BASE_URL}/tables`);
      const tablesData = await tablesResponse.json();
      console.log('✅ Tables response:', tablesData.error || 'Requires authentication');
    } catch (error) {
      console.log('❌ Tables error:', error.message);
    }

    console.log('\n🎉 API testing completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Set up PostgreSQL database');
    console.log('2. Create .env file with database credentials');
    console.log('3. Run: node setup-db.js');
    console.log('4. Test login with admin/admin123');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();
