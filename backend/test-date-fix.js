import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function testDateFix() {
  try {
    console.log('🔍 Testing date fix approaches\n');
    
    // Approach 1: Cast to text first
    console.log('Approach 1: $1::text::date');
    const test1 = await pool.query(`
      SELECT generate_series($1::text::date, $2::text::date, '1 day'::interval)::date AS date
    `, ['2025-10-22', '2025-10-25']);
    console.log('Results:');
    test1.rows.forEach(row => console.log('  -', row.date));
    console.log('');
    
    // Approach 2: Use make_date
    console.log('Approach 2: Using make_date()');
    const test2 = await pool.query(`
      WITH parsed AS (
        SELECT 
          split_part($1, '-', 1)::int AS y1,
          split_part($1, '-', 2)::int AS m1,
          split_part($1, '-', 3)::int AS d1,
          split_part($2, '-', 1)::int AS y2,
          split_part($2, '-', 2)::int AS m2,
          split_part($2, '-', 3)::int AS d2
      )
      SELECT generate_series(
        make_date(y1, m1, d1),
        make_date(y2, m2, d2),
        '1 day'::interval
      )::date AS date
      FROM parsed
    `, ['2025-10-22', '2025-10-25']);
    console.log('Results:');
    test2.rows.forEach(row => console.log('  -', row.date));
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

testDateFix();

