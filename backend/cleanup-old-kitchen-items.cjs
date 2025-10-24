// Cleanup các món cũ từ đơn đã đóng
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function cleanup() {
  try {
    console.log('🧹 Cleaning up old kitchen items...\n');
    
    // 1. Đặt tất cả món của đơn đã PAID/CANCELLED thành DONE
    const result = await pool.query(`
      UPDATE don_hang_chi_tiet ct
      SET trang_thai_che_bien = 'DONE',
          finished_at = NOW()
      FROM don_hang dh
      WHERE ct.don_hang_id = dh.id
        AND dh.trang_thai IN ('PAID', 'CANCELLED')
        AND ct.trang_thai_che_bien IN ('QUEUED', 'MAKING')
    `);
    
    console.log(`✅ Updated ${result.rowCount} items to DONE`);
    
    // 2. Kiểm tra còn bao nhiêu món trong queue
    const check = await pool.query(`
      SELECT COUNT(*) as count
      FROM don_hang_chi_tiet ct
      JOIN don_hang dh ON dh.id = ct.don_hang_id
      WHERE ct.trang_thai_che_bien IN ('QUEUED', 'MAKING')
        AND dh.trang_thai IN ('OPEN', 'PAID')
    `);
    
    console.log(`\n📊 Current queue: ${check.rows[0].count} items`);
    console.log('\n🎉 Kitchen queue cleaned! Refresh /kitchen page.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

cleanup();

