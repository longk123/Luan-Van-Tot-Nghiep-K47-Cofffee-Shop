/**
 * VIEW CURRENT FUNCTION
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || ''),
  database: process.env.DB_NAME || 'coffee_shop'
});

async function viewFunction() {
  try {
    const result = await pool.query(`
      SELECT pg_get_functiondef(oid) as definition
      FROM pg_proc
      WHERE proname = 'tinh_gia_von_dong'
    `);
    
    console.log('Function tinh_gia_von_dong():');
    console.log('='.repeat(80));
    console.log(result.rows[0].definition);
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

viewFunction();
