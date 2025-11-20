// Test Customer Menu API
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function test() {
  console.log('\n🧪 TESTING CUSTOMER MENU API QUERIES\n');
  console.log('='.repeat(70));
  
  try {
    // Test 1: Get Categories
    console.log('\n1️⃣ Testing getActiveCategories()...');
    const categoriesResult = await pool.query(`
      SELECT id, ten, mo_ta, thu_tu
      FROM loai_mon
      WHERE active = TRUE
      ORDER BY thu_tu, id
    `);
    console.log(`   ✅ Found ${categoriesResult.rows.length} categories:`);
    categoriesResult.rows.forEach(cat => {
      console.log(`      - ${cat.ten} (ID: ${cat.id})`);
    });

    // Test 2: Get Menu Items
    console.log('\n2️⃣ Testing getMenuItems()...');
    const itemsResult = await pool.query(`
      SELECT 
        m.id,
        m.ten,
        m.mo_ta,
        m.loai_id AS loai_mon_id,
        l.ten AS loai_ten,
        m.hinh_anh AS hinh_anh_url,
        m.active,
        m.thu_tu,
        (
          SELECT MIN(gia)
          FROM mon_bien_the
          WHERE mon_id = m.id AND active = TRUE
        ) AS gia_tu
      FROM mon m
      LEFT JOIN loai_mon l ON l.id = m.loai_id
      WHERE m.active = TRUE
      ORDER BY m.thu_tu, m.id
    `);
    console.log(`   ✅ Found ${itemsResult.rows.length} items:`);
    itemsResult.rows.forEach(item => {
      console.log(`      - ${item.ten} (ID: ${item.id}, Category: ${item.loai_ten}, Price from: ${item.gia_tu || 'N/A'})`);
    });

    // Test 3: Check if items have variants
    console.log('\n3️⃣ Testing item variants...');
    for (const item of itemsResult.rows.slice(0, 3)) {
      const variantsResult = await pool.query(`
        SELECT id, mon_id, ten_bien_the, gia, active, thu_tu
        FROM mon_bien_the
        WHERE mon_id = $1 AND active = TRUE
        ORDER BY thu_tu, id
      `, [item.id]);
      console.log(`   ${item.ten}: ${variantsResult.rows.length} variants`);
      variantsResult.rows.forEach(v => {
        console.log(`      - ${v.ten_bien_the}: ${v.gia}đ`);
      });
    }

    console.log('\n✅ All tests passed!\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

test();

