// Test script cho API areas và menu
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000/api/v1';

async function testAreasAPI() {
  console.log('🧪 Bắt đầu test API areas...\n');

  try {
    // Test 1: Lấy danh sách areas (không có counts)
    console.log('1. Testing GET /areas (without counts)...');
    const areasResponse = await fetch(`${BASE_URL}/areas`);
    const areasData = await areasResponse.json();
    console.log('✅ Get areas:', areasResponse.status === 200 ? 'PASS' : 'FAIL');
    console.log('   Status:', areasResponse.status);
    console.log('   Areas count:', areasData.data?.length || 0);
    console.log('');

    // Test 2: Lấy danh sách areas (có counts)
    console.log('2. Testing GET /areas?include_counts=1...');
    const areasWithCountsResponse = await fetch(`${BASE_URL}/areas?include_counts=1`);
    const areasWithCountsData = await areasWithCountsResponse.json();
    console.log('✅ Get areas with counts:', areasWithCountsResponse.status === 200 ? 'PASS' : 'FAIL');
    console.log('   Status:', areasWithCountsResponse.status);
    console.log('   Areas count:', areasWithCountsData.data?.length || 0);
    if (areasWithCountsData.data?.length > 0) {
      console.log('   First area with counts:', areasWithCountsData.data[0]);
    }
    console.log('');

    // Test 3: Tạo area mới
    console.log('3. Testing POST /areas...');
    try {
      const newAreaData = {
        ten: 'Test Area',
        mo_ta: 'Test description',
        thu_tu: 10,
        active: true
      };
      const createResponse = await fetch(`${BASE_URL}/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAreaData)
      });
      const createResult = await createResponse.json();
      console.log('✅ Create area:', createResponse.status === 201 ? 'PASS' : 'FAIL');
      console.log('   Status:', createResponse.status);
      console.log('   Area ID:', createResult.area?.id);
      
      // Lưu area ID để test tiếp
      global.testAreaId = createResult.area?.id;
    } catch (e) {
      console.log('❌ Create area: FAIL');
      console.log('   Error:', e.message);
    }
    console.log('');

    // Test 4: Cập nhật area
    if (global.testAreaId) {
      console.log('4. Testing PUT /areas/:id...');
      try {
        const updateData = {
          ten: 'Updated Test Area',
          mo_ta: 'Updated description',
          thu_tu: 15
        };
        const updateResponse = await fetch(`${BASE_URL}/areas/${global.testAreaId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData)
        });
        const updateResult = await updateResponse.json();
        console.log('✅ Update area:', updateResponse.status === 200 ? 'PASS' : 'FAIL');
        console.log('   Status:', updateResponse.status);
        console.log('   Updated area:', updateResult.area);
      } catch (e) {
        console.log('❌ Update area: FAIL');
        console.log('   Error:', e.message);
      }
    } else {
      console.log('4. Skipping update area test (no area ID)');
    }
    console.log('');

    // Test 5: Xóa area (soft delete)
    if (global.testAreaId) {
      console.log('5. Testing DELETE /areas/:id...');
      try {
        const deleteResponse = await fetch(`${BASE_URL}/areas/${global.testAreaId}`, {
          method: 'DELETE'
        });
        console.log('✅ Delete area:', deleteResponse.status === 204 ? 'PASS' : 'FAIL');
        console.log('   Status:', deleteResponse.status);
      } catch (e) {
        console.log('❌ Delete area: FAIL');
        console.log('   Error:', e.message);
      }
    } else {
      console.log('5. Skipping delete area test (no area ID)');
    }
    console.log('');

    // Test 6: Validation errors
    console.log('6. Testing validation errors...');
    try {
      // Test missing required field
      const invalidResponse = await fetch(`${BASE_URL}/areas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      console.log('✅ Missing required field validation:', invalidResponse.status === 400 ? 'PASS' : 'FAIL');
      console.log('   Status:', invalidResponse.status);
    } catch (e) {
      console.log('❌ Validation test: FAIL');
      console.log('   Error:', e.message);
    }

  } catch (error) {
    console.log('❌ Areas test failed with error:', error.message);
  }
}

async function testMenuAPI() {
  console.log('\n🧪 Bắt đầu test API menu...\n');

  try {
    // Test 1: Lấy danh sách categories
    console.log('1. Testing GET /menu/categories...');
    const categoriesResponse = await fetch(`${BASE_URL}/menu/categories`);
    const categoriesData = await categoriesResponse.json();
    console.log('✅ Get categories:', categoriesResponse.status === 200 ? 'PASS' : 'FAIL');
    console.log('   Status:', categoriesResponse.status);
    console.log('   Categories count:', categoriesData.data?.length || 0);
    if (categoriesData.data?.length > 0) {
      console.log('   First category:', categoriesData.data[0]);
    }
    console.log('');

    // Test 2: Lấy items theo category
    if (categoriesData.data?.length > 0) {
      const categoryId = categoriesData.data[0].id;
      console.log(`2. Testing GET /menu/categories/${categoryId}/items...`);
      const itemsResponse = await fetch(`${BASE_URL}/menu/categories/${categoryId}/items`);
      const itemsData = await itemsResponse.json();
      console.log('✅ Get items by category:', itemsResponse.status === 200 ? 'PASS' : 'FAIL');
      console.log('   Status:', itemsResponse.status);
      console.log('   Items count:', itemsData.data?.length || 0);
      if (itemsData.data?.length > 0) {
        console.log('   First item:', itemsData.data[0]);
        global.testItemId = itemsData.data[0].id;
      }
    } else {
      console.log('2. Skipping get items by category test (no categories)');
    }
    console.log('');

    // Test 3: Lấy chi tiết item với variants
    if (global.testItemId) {
      console.log(`3. Testing GET /menu/items/${global.testItemId}...`);
      const itemResponse = await fetch(`${BASE_URL}/menu/items/${global.testItemId}`);
      const itemData = await itemResponse.json();
      console.log('✅ Get item with variants:', itemResponse.status === 200 ? 'PASS' : 'FAIL');
      console.log('   Status:', itemResponse.status);
      console.log('   Item:', itemData.data);
    } else {
      console.log('3. Skipping get item test (no item ID)');
    }
    console.log('');

    // Test 4: Tìm kiếm menu
    console.log('4. Testing GET /menu/search?q=coffee...');
    const searchResponse = await fetch(`${BASE_URL}/menu/search?q=coffee`);
    const searchData = await searchResponse.json();
    console.log('✅ Search menu:', searchResponse.status === 200 ? 'PASS' : 'FAIL');
    console.log('   Status:', searchResponse.status);
    console.log('   Search results count:', searchData.data?.length || 0);
    console.log('');

    // Test 5: Validation errors
    console.log('5. Testing validation errors...');
    try {
      // Test missing search query
      const invalidResponse = await fetch(`${BASE_URL}/menu/search`);
      console.log('✅ Missing search query validation:', invalidResponse.status === 400 ? 'PASS' : 'FAIL');
      console.log('   Status:', invalidResponse.status);
    } catch (e) {
      console.log('❌ Validation test: FAIL');
      console.log('   Error:', e.message);
    }

  } catch (error) {
    console.log('❌ Menu test failed with error:', error.message);
  }
}

// Chạy test
async function runAllTests() {
  await testAreasAPI();
  await testMenuAPI();
}

runAllTests();
