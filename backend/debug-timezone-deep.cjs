const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456'
});

async function debugTimezone() {
  try {
    console.log('🔍 Deep dive into timezone issue...\n');
    
    // Kiểm tra một đơn cụ thể
    const detail = await pool.query(`
      SELECT 
        id,
        opened_at as raw_timestamp,
        pg_typeof(opened_at) as column_type,
        to_char(opened_at, 'YYYY-MM-DD HH24:MI:SS TZ') as formatted_with_tz,
        opened_at::timestamp as as_timestamp,
        opened_at::timestamptz as as_timestamptz,
        (opened_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::timestamp as converted_vietnam,
        extract(timezone_hour from opened_at) as tz_hour,
        extract(timezone_minute from opened_at) as tz_minute
      FROM don_hang 
      WHERE id = 213
    `);
    console.log('📋 Order #213 detailed analysis:');
    console.table(detail.rows);
    
    // Kiểm tra đơn trong khoảng thời gian
    const rangeCheck = await pool.query(`
      SELECT 
        id,
        to_char(opened_at, 'YYYY-MM-DD HH24:MI:SS') as opened_local,
        extract(hour from opened_at) as hour_local,
        CASE 
          WHEN extract(hour from opened_at) >= 0 AND extract(hour from opened_at) < 7 THEN 'Before 7AM (previous day in Vietnam)'
          ELSE 'After 7AM (same day)'
        END as time_category,
        trang_thai
      FROM don_hang 
      WHERE opened_at >= '2025-10-24 00:00:00+07'::timestamptz
        AND opened_at < '2025-10-25 00:00:00+07'::timestamptz
      ORDER BY opened_at
      LIMIT 10
    `);
    console.log('\n📋 Orders in Vietnam date range 2025-10-24:');
    console.table(rangeCheck.rows);
    
    // Đếm đúng
    const correctCount = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE trang_thai = 'PAID') as paid_orders
      FROM don_hang 
      WHERE opened_at >= '2025-10-24 00:00:00+07'::timestamptz
        AND opened_at < '2025-10-25 00:00:00+07'::timestamptz
    `);
    console.log('\n✅ Correct count using timestamptz range:');
    console.table(correctCount.rows);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugTimezone();
