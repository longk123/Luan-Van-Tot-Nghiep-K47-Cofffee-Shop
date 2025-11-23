// backend/migrate-rollback-waiter-delivery-shift-type.cjs
// Rollback: Xóa WAITER_DELIVERY khỏi shift_type, chỉ giữ CASHIER và KITCHEN

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
    
    console.log('🔄 Rollback: Xóa WAITER_DELIVERY khỏi shift_type...');
    
    // 1. Kiểm tra xem có ca nào đang dùng WAITER_DELIVERY không
    const checkShifts = await client.query(`
      SELECT COUNT(*) as count FROM ca_lam WHERE shift_type = 'WAITER_DELIVERY'
    `);
    
    if (parseInt(checkShifts.rows[0].count) > 0) {
      console.log(`⚠️  Có ${checkShifts.rows[0].count} ca đang dùng WAITER_DELIVERY`);
      console.log('   → Chuyển tất cả về CASHIER...');
      
      await client.query(`
        UPDATE ca_lam 
        SET shift_type = 'CASHIER' 
        WHERE shift_type = 'WAITER_DELIVERY'
      `);
      console.log('✅ Đã chuyển tất cả ca WAITER_DELIVERY về CASHIER');
    }
    
    // 2. Drop constraint cũ
    await client.query(`
      ALTER TABLE ca_lam 
      DROP CONSTRAINT IF EXISTS ca_lam_shift_type_check
    `);
    console.log('✅ Đã xóa constraint cũ');
    
    // 3. Thêm constraint mới chỉ với CASHIER và KITCHEN
    await client.query(`
      ALTER TABLE ca_lam 
      ADD CONSTRAINT ca_lam_shift_type_check 
      CHECK (shift_type IN ('CASHIER', 'KITCHEN'))
    `);
    console.log('✅ Đã thêm constraint mới (chỉ CASHIER và KITCHEN)');
    
    await client.query('COMMIT');
    console.log('✅ Rollback hoàn tất!');
    console.log('📊 Shift types hiện tại: CASHIER, KITCHEN');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi rollback:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

