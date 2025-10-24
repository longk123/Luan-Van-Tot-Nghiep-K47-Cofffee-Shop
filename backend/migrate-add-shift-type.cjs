/**
 * Migration: Thêm shift_type vào ca_lam để hỗ trợ ca cho Kitchen/Barista
 * - CASHIER: Ca thu ngân (cần tracking tiền, doanh thu)
 * - KITCHEN: Ca pha chế/bếp (chỉ tracking thời gian, số món)
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456'
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('📝 Thêm cột shift_type vào bảng ca_lam...');
    
    // 1. Thêm cột shift_type
    await client.query(`
      ALTER TABLE ca_lam 
      ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT 'CASHIER'
        CHECK (shift_type IN ('CASHIER', 'KITCHEN'));
    `);
    
    // 2. Cập nhật tất cả ca cũ thành CASHIER
    await client.query(`
      UPDATE ca_lam 
      SET shift_type = 'CASHIER' 
      WHERE shift_type IS NULL;
    `);
    
    // 3. Thêm các cột thống kê cho ca KITCHEN
    console.log('📝 Thêm cột tracking cho Kitchen staff...');
    await client.query(`
      ALTER TABLE ca_lam 
      ADD COLUMN IF NOT EXISTS total_items_made INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS avg_prep_time_seconds INT DEFAULT 0;
    `);
    
    // 4. Tạo index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ca_lam_shift_type ON ca_lam(shift_type);
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - Added shift_type column (CASHIER | KITCHEN)');
    console.log('   - Added total_items_made column');
    console.log('   - Added avg_prep_time_seconds column');
    console.log('   - Created index on shift_type');
    console.log('\n💡 Usage:');
    console.log('   - Thu ngân: shift_type = CASHIER (cần tracking tiền)');
    console.log('   - Pha chế/Bếp: shift_type = KITCHEN (tracking món làm)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

