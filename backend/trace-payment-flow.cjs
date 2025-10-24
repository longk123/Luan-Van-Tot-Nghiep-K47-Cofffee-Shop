// Trace flow thanh toán của đơn gần nhất
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function trace() {
  try {
    // Đơn mang đi PAID gần nhất
    const order = await pool.query(`
      SELECT id, trang_thai, order_type, closed_at, opened_at
      FROM don_hang
      WHERE order_type = 'TAKEAWAY' AND trang_thai = 'PAID'
      ORDER BY id DESC
      LIMIT 1
    `);
    
    if (!order.rows[0]) {
      console.log('❌ Không có đơn PAID');
      pool.end();
      return;
    }
    
    const orderId = order.rows[0].id;
    console.log(`\n🔍 Tracing đơn #${orderId}:`);
    console.log(`  - Status: ${order.rows[0].trang_thai}`);
    console.log(`  - Closed_at: ${order.rows[0].closed_at}`);
    console.log(`  - Opened: ${order.rows[0].opened_at}`);
    
    // Kiểm tra payment_transaction
    const txn = await pool.query(`
      SELECT * FROM payment_transaction WHERE order_id = $1
    `, [orderId]);
    
    console.log(`\n💳 Payment transactions: ${txn.rowCount}`);
    txn.rows.forEach(t => {
      console.log(`  - Method: ${t.payment_method_code}, Amount: ${t.amount}, Status: ${t.status}`);
    });
    
    // Kiểm tra order_payment
    const pay = await pool.query(`
      SELECT * FROM order_payment WHERE order_id = $1
    `, [orderId]);
    
    console.log(`\n💰 Order payments: ${pay.rowCount}`);
    pay.rows.forEach(p => {
      console.log(`  - Method: ${p.method_code}, Amount: ${p.amount}, Status: ${p.status}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

trace();

