import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456',
});

console.log('📊 KIỂM TRA DỮ LIỆU WAITER VÀ CASHIER\n');

// 1. Check ca làm đang mở
const shifts = await pool.query(`
  SELECT cl.id, cl.nhan_vien_id, cl.shift_type, cl.status, u.full_name, u.username
  FROM ca_lam cl
  JOIN users u ON u.user_id = cl.nhan_vien_id
  WHERE cl.status = 'OPEN'
  ORDER BY cl.id DESC
`);
console.log('📋 CA LÀM ĐANG MỞ:');
console.table(shifts.rows);

// 2. Check user roles đơn giản hơn
const users = await pool.query(`
  SELECT user_id, username, full_name
  FROM users
  WHERE username IN ('waiter01', 'cashier01')
`);
console.log('\n👥 THÔNG TIN USERS:');
console.table(users.rows);

// 3. Check wallet summary
const wallets = await pool.query(`
  SELECT user_id, full_name, balance, total_collected, total_settled
  FROM v_shipper_wallet_summary
`);
console.log('\n💰 VÍ TIỀN THU HỘ:');
console.table(wallets.rows);

// 4. Check delivery orders gần đây
const deliveries = await pool.query(`
  SELECT dh.id, dh.order_type, dh.trang_thai, 
         di.shipper_id, di.delivery_status, di.delivery_address
  FROM don_hang dh
  LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
  WHERE dh.order_type = 'DELIVERY'
  ORDER BY dh.id DESC
  LIMIT 5
`);
console.log('\n🚚 ĐƠN GIAO HÀNG GẦN ĐÂY:');
console.table(deliveries.rows);

// 5. Check đơn của waiter (user_id = 6)
const waiterOrders = await pool.query(`
  SELECT COUNT(*) as total,
         SUM(CASE WHEN trang_thai = 'OPEN' THEN 1 ELSE 0 END) as open,
         SUM(CASE WHEN trang_thai = 'PAID' THEN 1 ELSE 0 END) as paid,
         SUM(CASE WHEN trang_thai = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
  FROM don_hang
  WHERE nhan_vien_id = 6
`);
console.log('\n📦 ĐƠN HÀNG CỦA WAITER (user_id=6):');
console.table(waiterOrders.rows);

// 6. Check đơn của cashier (user_id = 2)
const cashierOrders = await pool.query(`
  SELECT COUNT(*) as total,
         SUM(CASE WHEN trang_thai = 'OPEN' THEN 1 ELSE 0 END) as open,
         SUM(CASE WHEN trang_thai = 'PAID' THEN 1 ELSE 0 END) as paid,
         SUM(CASE WHEN trang_thai = 'CANCELLED' THEN 1 ELSE 0 END) as cancelled
  FROM don_hang
  WHERE nhan_vien_id = 2
`);
console.log('\n📦 ĐƠN HÀNG CỦA CASHIER (user_id=2):');
console.table(cashierOrders.rows);

await pool.end();
console.log('\n✅ HOÀN THÀNH KIỂM TRA DỮ LIỆU');
