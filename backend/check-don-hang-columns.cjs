require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function check() {
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'don_hang'
    ORDER BY ordinal_position
  `);
  
  console.log('Columns of don_hang:');
  cols.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type}`));
  
  await pool.end();
}

check();
