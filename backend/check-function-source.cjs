// Xem chi tiết function auto_xuat_kho_don_hang
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function checkFunction() {
  try {
    const result = await pool.query(`
      SELECT prosrc FROM pg_proc WHERE proname='auto_xuat_kho_don_hang'
    `);
    
    if (result.rows.length > 0) {
      console.log('📄 Source code của function auto_xuat_kho_don_hang:\n');
      console.log(result.rows[0].prosrc);
    } else {
      console.log('❌ Không tìm thấy function');
    }
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

checkFunction();
