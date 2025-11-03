// Test Backend Export API - Version Đơn Giản
// Cách dùng: 
// 1. Đảm bảo backend đang chạy: http://localhost:5000
// 2. Lấy token từ browser: localStorage.getItem('token')
// 3. Chạy: node test-export-simple.js

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== CONFIG ==========
const API_URL = 'http://localhost:5000/api/v1/reports/export';
// Lấy token từ browser console: localStorage.getItem('token')
const TOKEN = process.env.TEST_TOKEN || '';

if (!TOKEN) {
  console.log('❌ Chưa có TOKEN!');
  console.log('📝 Cách lấy token:');
  console.log('   1. Mở browser: http://localhost:5173');
  console.log('   2. Đăng nhập');
  console.log('   3. F12 → Console → gõ: localStorage.getItem("token")');
  console.log('   4. Copy token');
  console.log('\n💡 Sau đó chạy:');
  console.log('   Windows: $env:TEST_TOKEN="your_token" ; node test-export-simple.js');
  console.log('   Linux/Mac: export TEST_TOKEN="your_token" && node test-export-simple.js');
  process.exit(1);
}

// ========== TEST FUNCTIONS ==========

async function testExport(reportType, format) {
  console.log(`\n🧪 Testing: ${reportType} - ${format.toUpperCase()}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        reportType,
        format,
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      })
    });

    const status = response.status;
    
    if (status === 200) {
      const contentType = response.headers.get('content-type');
      const buffer = await response.buffer();
      
      console.log(`   ✅ Status: ${status}`);
      console.log(`   ✅ Content-Type: ${contentType}`);
      console.log(`   ✅ File size: ${(buffer.length / 1024).toFixed(2)} KB`);
      
      // Save file
      const ext = format === 'excel' ? 'xlsx' : format;
      const filename = `${reportType}_${format}_${Date.now()}.${ext}`;
      const filepath = path.join(__dirname, 'test-exports', filename);
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
      fs.writeFileSync(filepath, buffer);
      console.log(`   ✅ Saved: ${filename}`);
      
      return true;
    } else {
      const text = await response.text();
      console.log(`   ❌ Status: ${status}`);
      console.log(`   ❌ Error: ${text}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('   ⚠️  Backend server chưa chạy! Chạy: cd backend && npm start');
    }
    return false;
  }
}

async function testErrorCase(name, body, expectedStatus) {
  console.log(`\n🧪 Testing Error: ${name}`);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify(body)
    });

    const status = response.status;
    if (status === expectedStatus) {
      console.log(`   ✅ Status ${status} (Expected)`);
      return true;
    } else {
      const text = await response.text();
      console.log(`   ❌ Status ${status} (Expected ${expectedStatus})`);
      console.log(`   ❌ Response: ${text}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

// ========== RUN TESTS ==========

async function main() {
  console.log('🚀 Starting Backend Export API Tests');
  console.log('='.repeat(60));
  
  // Check backend is running
  try {
    const healthCheck = await fetch('http://localhost:5000/api/v1/analytics/overview', {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });
    if (healthCheck.status !== 200 && healthCheck.status !== 401) {
      console.log('⚠️  Backend có vẻ chưa chạy hoặc có vấn đề');
    }
  } catch (e) {
    console.log('⚠️  Không kết nối được backend!');
    console.log('   Chạy backend: cd backend && npm start');
    process.exit(1);
  }

  const results = { passed: 0, failed: 0 };

  // Test all combinations
  const reportTypes = ['revenue', 'profit', 'products', 'promotions', 'customers'];
  const formats = ['excel', 'pdf', 'csv'];

  for (const reportType of reportTypes) {
    for (const format of formats) {
      const success = await testExport(reportType, format);
      if (success) {
        results.passed++;
      } else {
        results.failed++;
      }
      await new Promise(r => setTimeout(r, 300)); // Wait between tests
    }
  }

  // Test error cases
  console.log('\n' + '='.repeat(60));
  console.log('🧪 Testing Error Cases');
  
  await testErrorCase('Missing reportType', { format: 'excel' }, 400);
  await testErrorCase('Invalid format', { reportType: 'revenue', format: 'invalid' }, 400);
  await testErrorCase('Invalid date range', { 
    reportType: 'revenue', 
    format: 'excel',
    startDate: '2025-01-31',
    endDate: '2025-01-01'
  }, 400);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary:');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📁 Files saved in: ${path.join(__dirname, 'test-exports')}`);
  console.log('\n✨ Done!');
}

main().catch(console.error);

