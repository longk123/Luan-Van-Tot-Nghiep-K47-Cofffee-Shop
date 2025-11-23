// backend/migrate-add-waiter-delivery-shift-type.cjs
// Migration script để thêm shift_type WAITER_DELIVERY cho phục vụ và giao hàng

const { Pool } = require('pg');
require('dotenv').config();

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
    await client.query('BEGIN');
    
    console.log('🔄 Thêm shift_type WAITER_DELIVERY vào database...');
    
    // 1. Drop constraint cũ
    await client.query(`
      ALTER TABLE ca_lam 
      DROP CONSTRAINT IF EXISTS ca_lam_shift_type_check
    `);
    console.log('✅ Đã xóa constraint cũ');
    
    // 2. Thêm constraint mới với WAITER_DELIVERY
    await client.query(`
      ALTER TABLE ca_lam 
      ADD CONSTRAINT ca_lam_shift_type_check 
      CHECK (shift_type IN ('CASHIER', 'KITCHEN', 'WAITER_DELIVERY'))
    `);
    console.log('✅ Đã thêm constraint mới với WAITER_DELIVERY');
    
    await client.query('COMMIT');
    console.log('✅ Migration hoàn tất!');
    console.log('📊 Shift types hiện tại: CASHIER, KITCHEN, WAITER_DELIVERY');
    
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

