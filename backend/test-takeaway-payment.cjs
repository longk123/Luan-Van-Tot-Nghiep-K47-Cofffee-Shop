// Test xem đơn mang đi có closed_at sau khi thanh toán không
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function test() {
  try {
    // Tìm đơn mang đi gần nhất
    const orders = await pool.query(`
      SELECT id, trang_thai, order_type, closed_at, opened_at
      FROM don_hang
      WHERE order_type = 'TAKEAWAY'
      ORDER BY id DESC
      LIMIT 5
    `);
    
    console.log('📦 5 đơn mang đi gần nhất:\n');
    orders.rows.forEach(o => {
      console.log(`Đơn #${o.id}:`);
      console.log(`  - Status: ${o.trang_thai}`);
      console.log(`  - Closed_at: ${o.closed_at || 'NULL'}`);
      console.log(`  - Opened: ${new Date(o.opened_at).toLocaleTimeString()}`);
      console.log('');
    });
    
    // Kiểm tra query takeaway orders
    const takeawayList = await pool.query(`
      SELECT id, trang_thai, closed_at
      FROM don_hang
      WHERE order_type = 'TAKEAWAY'
        AND trang_thai IN ('OPEN', 'PAID')
        AND closed_at IS NULL
      ORDER BY opened_at
    `);
    
    console.log(`\n✅ Đơn hiển thị trong /takeaway: ${takeawayList.rowCount}`);
    takeawayList.rows.forEach(o => {
      console.log(`  - Đơn #${o.id}: ${o.trang_thai}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();

