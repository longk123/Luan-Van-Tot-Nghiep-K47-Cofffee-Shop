// Test Backend Export API
// Chạy: node test-export-backend.js

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = 'http://localhost:5000/api/v1/reports/export';
const TOKEN = process.env.TEST_TOKEN || ''; // Nhập token vào đây hoặc dùng env

// Colors for console
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testExport(reportType, format, startDate = '2025-01-01', endDate = '2025-01-31') {
  const testName = `${reportType} - ${format.toUpperCase()}`;
  log(`\n🧪 Testing: ${testName}`, 'blue');
  
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
        startDate,
        endDate
      })
    });

    const status = response.status;
    const contentType = response.headers.get('content-type');
    const contentDisposition = response.headers.get('content-disposition');

    if (status === 200) {
      log(`✅ Status: ${status}`, 'green');
      log(`   Content-Type: ${contentType}`, 'green');
      log(`   Content-Disposition: ${contentDisposition}`, 'green');

      // Download file
      const buffer = await response.buffer();
      const filename = contentDisposition 
        ? contentDisposition.match(/filename="(.+)"/)?.[1] || `${reportType}_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`
        : `${reportType}_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
      
      const filepath = path.join(__dirname, 'test-exports', filename);
      fs.mkdirSync(path.dirname(filepath), { recursive: true });
      fs.writeFileSync(filepath, buffer);
      
      log(`   ✅ File saved: ${filepath}`, 'green');
      log(`   📦 File size: ${(buffer.length / 1024).toFixed(2)} KB`, 'green');
      
      return { success: true, filepath, size: buffer.length };
    } else {
      const errorText = await response.text();
      log(`❌ Status: ${status}`, 'red');
      log(`   Error: ${errorText}`, 'red');
      return { success: false, status, error: errorText };
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testErrorCases() {
  log('\n🧪 Testing Error Cases', 'yellow');
  
  // Test 1: Missing reportType
  log('\n📝 Test: Missing reportType', 'blue');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({ format: 'excel' })
    });
    const data = await response.json();
    if (response.status === 400 && data.message?.includes('reportType')) {
      log(`✅ Expected error: ${data.message}`, 'green');
    } else {
      log(`❌ Unexpected response: ${JSON.stringify(data)}`, 'red');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }

  // Test 2: Invalid format
  log('\n📝 Test: Invalid format', 'blue');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        reportType: 'revenue',
        format: 'invalid'
      })
    });
    const data = await response.json();
    if (response.status === 400 && data.message?.includes('format')) {
      log(`✅ Expected error: ${data.message}`, 'green');
    } else {
      log(`❌ Unexpected response: ${JSON.stringify(data)}`, 'red');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }

  // Test 3: Invalid date range
  log('\n📝 Test: Invalid date range', 'blue');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOKEN}`
      },
      body: JSON.stringify({
        reportType: 'revenue',
        format: 'excel',
        startDate: '2025-01-31',
        endDate: '2025-01-01'
      })
    });
    const data = await response.json();
    if (response.status === 400 && data.message?.includes('startDate')) {
      log(`✅ Expected error: ${data.message}`, 'green');
    } else {
      log(`❌ Unexpected response: ${JSON.stringify(data)}`, 'red');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }

  // Test 4: No token
  log('\n📝 Test: No token', 'blue');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reportType: 'revenue',
        format: 'excel'
      })
    });
    const data = await response.json();
    if (response.status === 401) {
      log(`✅ Expected error: ${data.error || 'Unauthorized'}`, 'green');
    } else {
      log(`❌ Unexpected response: ${JSON.stringify(data)}`, 'red');
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
  }
}

async function runTests() {
  log('\n🚀 Starting Backend Export API Tests', 'blue');
  log('='.repeat(60), 'blue');
  
  if (!TOKEN) {
    log('\n⚠️  No token provided!', 'yellow');
    log('Please set TEST_TOKEN environment variable or edit this file', 'yellow');
    log('Example: export TEST_TOKEN="your_token_here"', 'yellow');
    log('Or get token from browser: localStorage.getItem("token")', 'yellow');
    return;
  }

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test all report types with all formats
  const reportTypes = ['revenue', 'profit', 'products', 'promotions', 'customers'];
  const formats = ['excel', 'pdf', 'csv'];
  
  for (const reportType of reportTypes) {
    for (const format of formats) {
      results.total++;
      const result = await testExport(reportType, format);
      if (result.success) {
        results.passed++;
      } else {
        results.failed++;
      }
      // Wait a bit between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  // Test error cases
  await testErrorCases();

  // Summary
  log('\n' + '='.repeat(60), 'blue');
  log('\n📊 Test Summary:', 'blue');
  log(`   ✅ Passed: ${results.passed}/${results.total}`, 'green');
  log(`   ❌ Failed: ${results.failed}/${results.total}`, results.failed > 0 ? 'red' : 'green');
  log(`\n📁 Test files saved in: ${path.join(__dirname, 'test-exports')}`, 'blue');
  log('\n✨ Testing completed!', 'blue');
}

// Run tests
runTests().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

