const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456'
});

async function testTimezone() {
  try {
    console.log('🔍 Testing timezone conversion...\n');
    
    // Test 1: Kiểm tra timezone hiện tại của database
    const tz1 = await pool.query(`SHOW timezone`);
    console.log('Database timezone:', tz1.rows[0].TimeZone);
    
    // Test 2: Kiểm tra một đơn hàng cụ thể
    const order = await pool.query(`
      SELECT 
        id,
        opened_at,
        opened_at AT TIME ZONE 'UTC' as opened_utc,
        opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh' as opened_vietnam,
        DATE(opened_at) as date_plain,
        DATE(opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh') as date_vietnam_wrong,
        DATE(opened_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') as date_vietnam_correct,
        (opened_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date as date_cast
      FROM don_hang 
      WHERE id = 213
    `);
    console.log('\n📋 Order #213 timezone test:');
    console.table(order.rows);
    
    // Test 3: So sánh 2 cách query
    const test1 = await pool.query(`
      SELECT COUNT(*) as count, 'Method 1: DATE(opened_at AT TIME ZONE Asia/Ho_Chi_Minh)' as method
      FROM don_hang
      WHERE DATE(opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = '2025-10-24'
        AND trang_thai = 'PAID'
    `);
    
    const test2 = await pool.query(`
      SELECT COUNT(*) as count, 'Method 2: (opened_at AT TIME ZONE UTC AT TIME ZONE Asia/Ho_Chi_Minh)::date' as method
      FROM don_hang
      WHERE (opened_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = '2025-10-24'
        AND trang_thai = 'PAID'
    `);
    
    const test3 = await pool.query(`
      SELECT COUNT(*) as count, 'Method 3: opened_at::timestamptz AT TIME ZONE Asia/Ho_Chi_Minh' as method
      FROM don_hang
      WHERE DATE(opened_at::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh') = '2025-10-24'
        AND trang_thai = 'PAID'
    `);
    
    console.log('\n📊 Comparison of query methods:');
    console.table([...test1.rows, ...test2.rows, ...test3.rows]);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testTimezone();
