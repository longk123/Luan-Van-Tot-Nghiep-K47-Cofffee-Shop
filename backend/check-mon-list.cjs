require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function checkMon() {
  const result = await pool.query(`
    SELECT m.id, m.ten, mbt.id as bt_id, mbt.ten_bien_the 
    FROM mon m 
    LEFT JOIN mon_bien_the mbt ON m.id=mbt.mon_id AND mbt.active=TRUE
    WHERE m.active=TRUE 
    ORDER BY m.id, mbt.id
  `);
  
  console.log('📋 DANH SÁCH MÓN:');
  result.rows.forEach(r => {
    if (r.bt_id) {
      console.log(`   ${r.id}. ${r.ten} - Biến thể: ${r.ten_bien_the} (ID: ${r.bt_id})`);
    } else {
      console.log(`   ${r.id}. ${r.ten} (không có biến thể)`);
    }
  });
  
  await pool.end();
}

checkMon();
