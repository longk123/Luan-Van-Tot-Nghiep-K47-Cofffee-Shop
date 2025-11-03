/**
 * Migration: Xóa cột hoat_dong từ bảng khu_vuc
 * Chỉ sử dụng cột active để quản lý trạng thái
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Bắt đầu migration: Xóa cột hoat_dong từ bảng khu_vuc\n');
    
    await client.query('BEGIN');
    
    // Kiểm tra xem cột hoat_dong có tồn tại không
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='khu_vuc' AND column_name='hoat_dong'
    `);
    
    if (checkColumn.rows.length === 0) {
      console.log('⚠️  Cột hoat_dong không tồn tại, bỏ qua migration');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log('📝 Xóa cột hoat_dong từ bảng khu_vuc...');
    await client.query(`
      ALTER TABLE khu_vuc DROP COLUMN IF EXISTS hoat_dong
    `);
    
    await client.query('COMMIT');
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ MIGRATION HOÀN TẤT!');
    console.log('='.repeat(70));
    console.log('\n📝 ĐÃ XÓA:');
    console.log('  • Cột hoat_dong từ bảng khu_vuc');
    console.log('\n💡 LƯU Ý:');
    console.log('  • Chỉ sử dụng cột active để quản lý trạng thái khu vực');
    console.log('  • active = true: Khu vực đang hoạt động');
    console.log('  • active = false: Khu vực đã tắt (soft delete)\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration thất bại:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

