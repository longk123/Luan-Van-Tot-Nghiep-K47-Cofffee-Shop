const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function fixDeliveryFee() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Đang cập nhật phí ship tất cả đơn giao hàng về 8000đ...\n');
    
    // Tìm tất cả đơn DELIVERY có phí ship khác 8000
    const { rows: ordersToFix } = await client.query(`
      SELECT 
        di.order_id,
        dh.id,
        dh.trang_thai,
        di.delivery_fee,
        di.delivery_address
      FROM don_hang_delivery_info di
      JOIN don_hang dh ON dh.id = di.order_id
      WHERE dh.order_type = 'DELIVERY'
        AND di.delivery_fee != 8000
    `);
    
    if (ordersToFix.length === 0) {
      console.log('✅ Tất cả đơn giao hàng đã có phí ship là 8000đ.');
      await client.query('COMMIT');
      return;
    }
    
    console.log(`📋 Tìm thấy ${ordersToFix.length} đơn cần cập nhật:\n`);
    
    // Cập nhật phí ship về 8000đ
    for (const order of ordersToFix) {
      console.log(`  - Đơn #${order.id}: ${order.delivery_fee.toLocaleString('vi-VN')}đ → 8.000đ`);
      
      // Cập nhật phí ship về 8000đ
      await client.query(`
        UPDATE don_hang_delivery_info
        SET delivery_fee = 8000
        WHERE order_id = $1
      `, [order.order_id]);
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Đã cập nhật ${ordersToFix.length} đơn giao hàng với phí ship 8000đ.\n`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDeliveryFee().catch(console.error);

