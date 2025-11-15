// Check chi_phi and khuyen_mai structure
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function checkTables() {
  try {
    // Check chi_phi structure
    console.log('📋 CẤU TRÚC BẢNG chi_phi:\n');
    const chiPhiCols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'chi_phi'
      ORDER BY ordinal_position
    `);
    
    chiPhiCols.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    
    const chiPhiCount = await pool.query(`SELECT COUNT(*) FROM chi_phi`);
    console.log(`\n  📊 Số dòng dữ liệu: ${chiPhiCount.rows[0].count}`);
    
    // Check khuyen_mai structure
    console.log('\n\n📋 CẤU TRÚC BẢNG khuyen_mai:\n');
    const khuyenMaiCols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'khuyen_mai'
      ORDER BY ordinal_position
    `);
    
    khuyenMaiCols.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}${col.is_nullable === 'NO' ? ' NOT NULL' : ''}`);
    });
    
    const khuyenMaiCount = await pool.query(`SELECT COUNT(*) FROM khuyen_mai`);
    console.log(`\n  📊 Số dòng dữ liệu: ${khuyenMaiCount.rows[0].count}`);
    
    // Sample data from khuyen_mai
    if (parseInt(khuyenMaiCount.rows[0].count) > 0) {
      console.log('\n  📄 Dữ liệu mẫu (5 dòng đầu):');
      const sample = await pool.query(`SELECT * FROM khuyen_mai LIMIT 5`);
      sample.rows.forEach((row, i) => {
        console.log(`\n  ${i+1}. ID: ${row.id}`);
        console.log(`     Mã: ${row.ma_khuyen_mai}`);
        console.log(`     Tên: ${row.ten_khuyen_mai}`);
        console.log(`     Loại: ${row.loai_khuyen_mai}`);
        console.log(`     Trạng thái: ${row.trang_thai}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
