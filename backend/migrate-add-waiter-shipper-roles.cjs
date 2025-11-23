// backend/migrate-add-waiter-shipper-roles.cjs
// Migration script để thêm roles: waiter (phục vụ) và shipper (giao hàng)

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
    
    console.log('🔄 Thêm roles: waiter (phục vụ) và shipper (giao hàng)...');
    
    // Thêm role waiter nếu chưa có
    const waiterCheck = await client.query(`
      SELECT role_id FROM roles WHERE role_name = 'waiter'
    `);
    
    if (waiterCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO roles (role_name, description)
        VALUES ('waiter', 'Phục vụ, tạo đơn tại bàn và mang đi')
      `);
      console.log('✅ Đã thêm role: waiter');
    } else {
      console.log('ℹ️  Role waiter đã tồn tại');
    }
    
    // Thêm role shipper nếu chưa có
    const shipperCheck = await client.query(`
      SELECT role_id FROM roles WHERE role_name = 'shipper'
    `);
    
    if (shipperCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO roles (role_name, description)
        VALUES ('shipper', 'Giao hàng, nhận và giao đơn hàng')
      `);
      console.log('✅ Đã thêm role: shipper');
    } else {
      console.log('ℹ️  Role shipper đã tồn tại');
    }
    
    await client.query('COMMIT');
    console.log('✅ Migration hoàn tất!');
    
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

