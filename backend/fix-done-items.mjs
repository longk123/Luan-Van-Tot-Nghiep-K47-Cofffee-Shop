// fix-done-items.mjs
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456',
  port: 5432
});

async function main() {
  // Find DONE items without finished_at
  const { rows } = await pool.query(`
    SELECT id, don_hang_id, mon_id, trang_thai_che_bien, started_at, finished_at 
    FROM don_hang_chi_tiet 
    WHERE trang_thai_che_bien = 'DONE' AND finished_at IS NULL
  `);
  
  console.log('Món DONE thiếu finished_at:', rows.length);
  rows.forEach(r => console.log(r));
  
  if (rows.length > 0) {
    // Fix: set finished_at = started_at + 2 minutes if started_at exists
    const r1 = await pool.query(`
      UPDATE don_hang_chi_tiet 
      SET finished_at = started_at + interval '2 minutes' 
      WHERE trang_thai_che_bien = 'DONE' AND finished_at IS NULL AND started_at IS NOT NULL
    `);
    console.log('Fixed with started_at:', r1.rowCount);
    
    // Fix: set finished_at = NOW() for remaining
    const r2 = await pool.query(`
      UPDATE don_hang_chi_tiet 
      SET finished_at = NOW() 
      WHERE trang_thai_che_bien = 'DONE' AND finished_at IS NULL
    `);
    console.log('Fixed with NOW():', r2.rowCount);
    
    console.log('✅ Fixed all DONE items');
  }
  
  await pool.end();
}

main();
