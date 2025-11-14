// Tìm bảng thanh toán
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function findTables() {
  try {
    const result = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname='public' 
        AND (tablename LIKE '%payment%' OR tablename LIKE '%thanh%')
    `);
    
    console.log('📋 Các bảng liên quan đến thanh toán:');
    result.rows.forEach(row => {
      console.log(`  - ${row.tablename}`);
    });
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

findTables();
