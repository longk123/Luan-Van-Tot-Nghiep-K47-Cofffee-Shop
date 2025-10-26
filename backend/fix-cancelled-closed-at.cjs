/**
 * Fix script: Cập nhật closed_at cho các đơn CANCELLED cũ
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'coffee_shop',
});

async function fixCancelledOrders() {
  try {
    console.log('🔧 Sửa closed_at cho đơn CANCELLED...\n');
    
    // 1. Kiểm tra các đơn CANCELLED không có closed_at
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM don_hang
      WHERE trang_thai = 'CANCELLED' AND closed_at IS NULL
    `);
    
    const count = parseInt(checkResult.rows[0].count);
    console.log(`📊 Tìm thấy ${count} đơn CANCELLED không có closed_at\n`);
    
    if (count === 0) {
      console.log('✅ Không có đơn nào cần sửa');
      return;
    }
    
    // 2. Cập nhật closed_at = opened_at cho các đơn này (giả định đơn bị hủy ngay sau khi mở)
    console.log('🔧 Đang cập nhật...');
    const updateResult = await pool.query(`
      UPDATE don_hang
      SET closed_at = opened_at
      WHERE trang_thai = 'CANCELLED' AND closed_at IS NULL
      RETURNING id, opened_at, closed_at
    `);
    
    console.log(`✅ Đã cập nhật ${updateResult.rowCount} đơn:\n`);
    
    updateResult.rows.slice(0, 10).forEach((order, idx) => {
      console.log(`${idx + 1}. Đơn #${order.id}:`);
      console.log(`   opened_at: ${order.opened_at}`);
      console.log(`   closed_at: ${order.closed_at}`);
    });
    
    if (updateResult.rowCount > 10) {
      console.log(`   ... và ${updateResult.rowCount - 10} đơn khác\n`);
    } else {
      console.log('');
    }
    
    console.log('✅ Hoàn tất!');
    
  } catch (error) {
    console.error('❌ Lỗi:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

fixCancelledOrders();
