import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456',
  port: 5432
});

console.log('\n📊 KIỂM TRA DỮ LIỆU MANAGER\n');

try {
  // 1. Kiểm tra user manager
  let r = await pool.query(`
    SELECT u.user_id, u.username FROM users u 
    JOIN user_roles ur ON u.user_id = ur.user_id
    JOIN roles ro ON ur.role_id = ro.role_id
    WHERE ro.role_name = 'manager' AND u.is_active = true
  `);
  console.log('✅ Manager users:', r.rows.map(u => u.username).join(', '));

  // 2. Kiểm tra views cần thiết
  const views = ['v_shipper_wallet_summary'];
  for (const view of views) {
    try {
      await pool.query(`SELECT 1 FROM ${view} LIMIT 1`);
      console.log(`✅ View ${view} tồn tại`);
    } catch (e) {
      console.log(`❌ View ${view} không tồn tại`);
    }
  }

  // 3. Kiểm tra các bảng cần thiết cho manager
  const tables = ['don_hang', 'ca_lam', 'order_payment', 'khuyen_mai', 'mon', 'loai_mon'];
  for (const table of tables) {
    try {
      const count = await pool.query(`SELECT COUNT(*) as cnt FROM ${table}`);
      console.log(`✅ Table ${table}: ${count.rows[0].cnt} records`);
    } catch (e) {
      console.log(`❌ Table ${table} error: ${e.message}`);
    }
  }

  // 4. Thống kê doanh thu (test query)
  r = await pool.query(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(CASE WHEN trang_thai = 'PAID' THEN 1 ELSE 0 END), 0) as paid_orders
    FROM don_hang 
    WHERE opened_at >= CURRENT_DATE
  `);
  console.log(`\n📊 Đơn hàng hôm nay: ${r.rows[0].total_orders} (${r.rows[0].paid_orders} đã thanh toán)`);

  // 5. Kiểm tra promotions
  r = await pool.query(`SELECT COUNT(*) as cnt FROM khuyen_mai WHERE active = true`);
  console.log(`📊 Khuyến mãi đang hoạt động: ${r.rows[0].cnt}`);

  // 6. Kiểm tra ca làm việc
  r = await pool.query(`SELECT shift_type, COUNT(*) as cnt FROM ca_lam WHERE status = 'OPEN' GROUP BY shift_type`);
  console.log('📊 Ca đang mở:', r.rows.map(s => `${s.shift_type}: ${s.cnt}`).join(', '));

  console.log('\n✅ KIỂM TRA HOÀN TẤT\n');

} catch (err) {
  console.log('❌ Lỗi:', err.message);
} finally {
  await pool.end();
}
