// Check khuyen_mai data với tên cột đúng
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function checkKhuyenMai() {
  try {
    console.log('📄 Dữ liệu trong bảng khuyen_mai:\n');
    const result = await pool.query(`SELECT * FROM khuyen_mai LIMIT 5`);
    
    if (result.rows.length > 0) {
      result.rows.forEach((row, i) => {
        console.log(`${i+1}. Promotion:`);
        console.log(JSON.stringify(row, null, 2));
        console.log('---');
      });
    } else {
      console.log('Không có dữ liệu');
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

checkKhuyenMai();
