/**
 * CHECK TUY_CHON_MON DATA
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

async function checkData() {
  try {
    // First check table structure
    console.log('\n📋 CẤU TRÚC BẢNG TUY_CHON_MON');
    console.log('='.repeat(80));
    const structure = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tuy_chon_mon'
      ORDER BY ordinal_position
    `);
    
    structure.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });
    
    console.log('\n📋 DANH SÁCH TÙY CHỌN MÓN');
    console.log('='.repeat(80));
    
    const result = await pool.query(`
      SELECT *
      FROM tuy_chon_mon
      ORDER BY id
    `);
    
    if (result.rows.length === 0) {
      console.log('❌ Không có dữ liệu trong bảng tuy_chon_mon!');
    } else {
      result.rows.forEach(row => {
        console.log(`ID: ${row.id}`);
        console.log(`  Tên: ${row.ten}`);
        console.log(`  Dữ liệu: ${JSON.stringify(row, null, 2)}`);
        console.log();
      });
    }
    
    console.log('='.repeat(80));
    console.log(`Tổng: ${result.rows.length} tùy chọn`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
