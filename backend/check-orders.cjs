const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function check() {
  try {
    // Check view structure
    const viewCols = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'v_order_settlement' 
      ORDER BY ordinal_position
    `);
    console.log('=== CỘT TRONG v_order_settlement ===');
    console.log(viewCols.rows.map(r => r.column_name).join(', '));
    
    // Check delivery orders với tổng tiền từ chi tiết
    const orders = await pool.query(`
      SELECT 
        dh.id, 
        dh.order_type, 
        dh.trang_thai,
        di.shipper_id,
        di.delivery_status,
        COALESCE(s.grand_total, 0) AS grand_total,
        COALESCE(di.delivery_fee, 0) AS delivery_fee
      FROM don_hang dh
      LEFT JOIN v_order_settlement s ON s.order_id = dh.id
      LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
      WHERE dh.order_type = 'DELIVERY' 
      ORDER BY dh.id DESC LIMIT 10
    `);
    console.log('\n=== ĐƠN GIAO HÀNG ===');
    console.log(JSON.stringify(orders.rows, null, 2));
    
    // Check wallet transactions
    const transactions = await pool.query(`
      SELECT wt.*, sw.user_id, u.username
      FROM wallet_transactions wt
      JOIN shipper_wallet sw ON wt.wallet_id = sw.id
      JOIN users u ON sw.user_id = u.user_id
      ORDER BY wt.created_at DESC LIMIT 10
    `);
    console.log('\n=== GIAO DỊCH VÍ ===');
    console.log(JSON.stringify(transactions.rows, null, 2));
    
    // Check wallets
    const wallets = await pool.query(`SELECT * FROM shipper_wallet`);
    console.log('\n=== DANH SÁCH VÍ ===');
    console.log(JSON.stringify(wallets.rows, null, 2));
    
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

check();
