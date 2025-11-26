// Migration: Thêm các cột để lưu thông tin hủy nhận đơn giao hàng
// Run: node backend/migrate-add-unclaim-delivery-columns.cjs

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Bắt đầu migration: Thêm cột unclaim vào don_hang_delivery_info...\n');
    await client.query('BEGIN');

    // 1. Thêm cột unclaim_reason (lý do hủy nhận)
    console.log('📝 1. Thêm cột unclaim_reason...');
    await client.query(`
      ALTER TABLE don_hang_delivery_info
      ADD COLUMN IF NOT EXISTS unclaim_reason TEXT
    `);
    console.log('   ✅ Đã thêm cột unclaim_reason');

    // 2. Thêm cột unclaimed_at (thời gian hủy nhận)
    console.log('\n📝 2. Thêm cột unclaimed_at...');
    await client.query(`
      ALTER TABLE don_hang_delivery_info
      ADD COLUMN IF NOT EXISTS unclaimed_at TIMESTAMPTZ
    `);
    console.log('   ✅ Đã thêm cột unclaimed_at');

    // 3. Thêm cột unclaimed_by (người hủy nhận)
    console.log('\n📝 3. Thêm cột unclaimed_by...');
    await client.query(`
      ALTER TABLE don_hang_delivery_info
      ADD COLUMN IF NOT EXISTS unclaimed_by INT
    `);
    
    // Thêm foreign key constraint nếu chưa có
    const fkCheck = await client.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'don_hang_delivery_info' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%unclaimed_by%'
    `);
    
    if (fkCheck.rows.length === 0) {
      await client.query(`
        ALTER TABLE don_hang_delivery_info
        ADD CONSTRAINT fk_delivery_info_unclaimed_by 
        FOREIGN KEY (unclaimed_by) REFERENCES users(user_id)
      `);
      console.log('   ✅ Đã thêm foreign key constraint cho unclaimed_by');
    }
    console.log('   ✅ Đã thêm cột unclaimed_by');

    // 4. Tạo index cho unclaimed_by (nếu cần query theo người hủy)
    console.log('\n📝 4. Tạo index cho unclaimed_by...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_info_unclaimed_by
      ON don_hang_delivery_info(unclaimed_by)
      WHERE unclaimed_by IS NOT NULL
    `);
    console.log('   ✅ Đã tạo index cho unclaimed_by');

    await client.query('COMMIT');
    
    console.log('\n✅ Migration hoàn tất!');
    console.log('\n📋 Tóm tắt:');
    console.log('   ✅ Cột unclaim_reason: Lưu lý do hủy nhận đơn');
    console.log('   ✅ Cột unclaimed_at: Lưu thời gian hủy nhận');
    console.log('   ✅ Cột unclaimed_by: Lưu ID người hủy nhận');
    console.log('   ✅ Index đã được tạo để tối ưu query');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

