// List all tables in database
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function listAllTables() {
  try {
    const result = await pool.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname='public' 
      ORDER BY tablename
    `);
    
    console.log('📋 Tất cả các bảng trong database:\n');
    result.rows.forEach((t, i) => {
      console.log(`${i+1}. ${t.tablename}`);
    });
    console.log(`\n✅ Tổng: ${result.rows.length} bảng`);
    
    // Check for specific tables
    const tableNames = result.rows.map(r => r.tablename);
    console.log('\n🔍 Kiểm tra các bảng quan trọng:');
    console.log('- chi_phi:', tableNames.includes('chi_phi') ? '✅ CÓ' : '❌ CHƯA CÓ');
    console.log('- expense:', tableNames.includes('expense') ? '✅ CÓ' : '❌ CHƯA CÓ');
    console.log('- promotion:', tableNames.includes('promotion') ? '✅ CÓ' : '❌ CHƯA CÓ');
    console.log('- khuyen_mai:', tableNames.includes('khuyen_mai') ? '✅ CÓ' : '❌ CHƯA CÓ');
    console.log('- nhan_vien:', tableNames.includes('nhan_vien') ? '✅ CÓ' : '❌ CHƯA CÓ');
    console.log('- users:', tableNames.includes('users') ? '✅ CÓ' : '❌ CHƯA CÓ');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

listAllTables();
