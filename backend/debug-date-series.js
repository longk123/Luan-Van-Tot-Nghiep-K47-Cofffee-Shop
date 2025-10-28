import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function debugDateSeries() {
  try {
    console.log('🔍 Debug date_series generation\n');
    
    // Test 1: Simple date cast
    console.log('Test 1: $1::date');
    const test1 = await pool.query(`SELECT $1::date AS result`, ['2025-10-22']);
    console.log('Result:', test1.rows[0].result);
    console.log('');
    
    // Test 2: Timestamp cast
    console.log('Test 2: ($1 || \' 00:00:00\')::timestamp');
    const test2 = await pool.query(`SELECT ($1 || ' 00:00:00')::timestamp AS result`, ['2025-10-22']);
    console.log('Result:', test2.rows[0].result);
    console.log('');
    
    // Test 3: Generate series with simple date
    console.log('Test 3: generate_series($1::date, $2::date, \'1 day\')');
    const test3 = await pool.query(`
      SELECT generate_series($1::date, $2::date, '1 day'::interval)::date AS date
    `, ['2025-10-22', '2025-10-25']);
    console.log('Results:');
    test3.rows.forEach(row => console.log('  -', row.date.toISOString().split('T')[0]));
    console.log('');
    
    // Test 4: Generate series with timestamp
    console.log('Test 4: generate_series with timestamp');
    const test4 = await pool.query(`
      SELECT generate_series(
        ($1 || ' 00:00:00')::timestamp,
        ($2 || ' 23:59:59')::timestamp,
        '1 day'::interval
      )::date AS date
    `, ['2025-10-22', '2025-10-25']);
    console.log('Results:');
    test4.rows.forEach(row => console.log('  -', row.date.toISOString().split('T')[0]));
    console.log('');
    
    // Test 5: Check current timezone
    console.log('Test 5: Current timezone settings');
    const test5 = await pool.query(`SHOW timezone`);
    console.log('Timezone:', test5.rows[0].TimeZone);
    console.log('');
    
    // Test 6: Check how closed_at is stored
    console.log('Test 6: Sample closed_at values');
    const test6 = await pool.query(`
      SELECT 
        id,
        closed_at,
        closed_at AT TIME ZONE 'UTC' AS closed_at_utc,
        (closed_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS vn_date
      FROM don_hang 
      WHERE trang_thai = 'PAID' 
        AND closed_at IS NOT NULL
      ORDER BY closed_at DESC
      LIMIT 5
    `);
    console.log('Results:');
    test6.rows.forEach(row => {
      console.log(`  ID ${row.id}:`);
      console.log(`    closed_at: ${row.closed_at}`);
      console.log(`    closed_at_utc: ${row.closed_at_utc}`);
      console.log(`    vn_date: ${row.vn_date.toISOString().split('T')[0]}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugDateSeries();

