// Test Customer API directly
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/v1/customer/menu/categories',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers:`, res.headers);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('\nResponse Body:');
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {
      console.log(data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error.message);
  console.error('\n⚠️  Backend có thể chưa chạy!');
  console.error('   Hãy chạy: cd backend && npm start');
});

req.end();

