import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456',
  port: 5432
});

console.log('\n📊 KIỂM TRA DỮ LIỆU WAITER VÀ CASHIER\n');

try {
  // 1. Waiter shift_type
  let r = await pool.query(`
    SELECT cl.id, cl.shift_type, u.username 
    FROM ca_lam cl 
    JOIN users u ON cl.nhan_vien_id = u.user_id 
    JOIN user_roles ur ON u.user_id = ur.user_id
    JOIN roles ro ON ur.role_id = ro.role_id
    WHERE cl.status = 'OPEN' AND ro.role_name = 'waiter' AND cl.shift_type != 'WAITER'
  `);
  console.log(r.rows.length === 0 ? '✅ Waiter shift_type = WAITER' : '❌ Waiter shift_type sai: ' + JSON.stringify(r.rows));

  // 2. Cashier shift_type
  r = await pool.query(`
    SELECT cl.id, cl.shift_type, u.username 
    FROM ca_lam cl 
    JOIN users u ON cl.nhan_vien_id = u.user_id 
    JOIN user_roles ur ON u.user_id = ur.user_id
    JOIN roles ro ON ur.role_id = ro.role_id
    WHERE cl.status = 'OPEN' AND ro.role_name = 'cashier' AND cl.shift_type != 'CASHIER'
  `);
  console.log(r.rows.length === 0 ? '✅ Cashier shift_type = CASHIER' : '❌ Cashier shift_type sai');

  // 3. Constraint
  r = await pool.query(`SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'ca_lam_shift_type_check'`);
  console.log(r.rows[0]?.def?.includes('WAITER') ? '✅ Constraint cho phép WAITER' : '❌ Constraint thiếu WAITER');

  // 4. DINE_IN có bàn
  r = await pool.query(`SELECT id FROM don_hang WHERE order_type = 'DINE_IN' AND ban_id IS NULL AND trang_thai != 'HUY'`);
  console.log(r.rows.length === 0 ? '✅ Đơn DINE_IN đều có bàn' : '⚠️ ' + r.rows.length + ' đơn DINE_IN thiếu bàn');

  // 5. Không cần check tổng tiền vì nằm trong computed field

  // 6. Balance
  r = await pool.query(`SELECT user_id, balance FROM v_shipper_wallet_summary WHERE balance < -500000`);
  console.log(r.rows.length === 0 ? '✅ Ví trong hạn mức' : '⚠️ ' + r.rows.length + ' ví vượt hạn mức');

  console.log('\n✅ KIỂM TRA HOÀN TẤT\n');
} catch (err) {
  console.log('❌ Lỗi:', err.message);
} finally {
  await pool.end();
}
