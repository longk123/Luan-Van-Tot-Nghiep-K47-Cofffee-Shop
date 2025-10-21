// backend/fix-cancelled-tables.cjs
// Fix: Chuyển các bàn có đơn CANCELLED về TRONG

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function fix() {
  try {
    console.log('🔗 Đang kết nối database...');
    
    // Chuyển các bàn có đơn CANCELLED về TRONG
    const result = await pool.query(`
      UPDATE ban
      SET trang_thai = 'TRONG'
      WHERE id IN (
        SELECT DISTINCT ban_id
        FROM don_hang
        WHERE ban_id IS NOT NULL 
          AND trang_thai = 'CANCELLED'
          AND ban_id NOT IN (
            SELECT ban_id FROM don_hang 
            WHERE ban_id IS NOT NULL AND trang_thai IN ('OPEN', 'PAID')
          )
      )
      AND trang_thai = 'DANG_DUNG'
      RETURNING id, ten_ban
    `);
    
    console.log(`✅ Đã chuyển ${result.rowCount} bàn về TRONG:`);
    result.rows.forEach(r => console.log(`  - ${r.ten_ban}`));
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
  } finally {
    await pool.end();
  }
}

fix();

