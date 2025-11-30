require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function check() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        dh.id, 
        dh.order_type, 
        dh.trang_thai,
        di.delivery_status,
        op.method_code,
        op.status as payment_status
      FROM don_hang dh
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      LEFT JOIN order_payment op ON op.order_id = dh.id
      WHERE dh.order_type = 'DELIVERY'
      ORDER BY dh.id DESC
      LIMIT 10
    `);
    
    console.log('📦 Đơn DELIVERY gần đây:\n');
    rows.forEach(d => {
      console.log(`  #${d.id}: trang_thai=${d.trang_thai}, delivery_status=${d.delivery_status || 'N/A'}, payment=${d.method_code || 'N/A'}/${d.payment_status || 'N/A'}`);
    });
    
    // Kiểm tra logic: đơn PAID nhưng chưa DELIVERED?
    const { rows: problemOrders } = await pool.query(`
      SELECT dh.id, dh.trang_thai, di.delivery_status
      FROM don_hang dh
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      WHERE dh.order_type = 'DELIVERY'
        AND dh.trang_thai = 'PAID'
        AND (di.delivery_status IS NULL OR di.delivery_status != 'DELIVERED')
    `);
    
    console.log('\n⚠️ Đơn PAID nhưng CHƯA DELIVERED (có vấn đề):', problemOrders.length);
    problemOrders.forEach(d => {
      console.log(`  #${d.id}: trang_thai=${d.trang_thai}, delivery_status=${d.delivery_status || 'N/A'}`);
    });
    
  } finally {
    await pool.end();
  }
}

check();
