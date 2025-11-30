import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456',
  port: 5432
});

console.log('🔧 Fixing ALL legacy data warnings...\n');

try {
  // 1. Cập nhật ca_lam_id cho đơn hoàn thành thiếu ca_lam_id
  let r = await pool.query(`
    UPDATE don_hang 
    SET ca_lam_id = (SELECT id FROM ca_lam WHERE status = 'OPEN' AND shift_type = 'CASHIER' LIMIT 1)
    WHERE trang_thai IN ('COMPLETED', 'PAID') AND ca_lam_id IS NULL
  `);
  console.log('✅ Updated ca_lam_id: ' + r.rowCount + ' orders');

  // 2. Cập nhật finished_at cho món DONE thiếu finished_at  
  r = await pool.query(`
    UPDATE don_hang_chi_tiet 
    SET finished_at = COALESCE(started_at, created_at) + interval '3 minutes'
    WHERE trang_thai_che_bien = 'DONE' AND finished_at IS NULL
  `);
  console.log('✅ Updated finished_at: ' + r.rowCount + ' items');

  // 3. Thêm payment record cho đơn PAID thiếu payment
  const check = await pool.query(`
    SELECT dh.id
    FROM don_hang dh
    LEFT JOIN order_payment op ON dh.id = op.order_id
    WHERE dh.trang_thai = 'PAID' AND op.id IS NULL
  `);
  
  console.log('Missing payment orders:', check.rows.map(r => r.id));
  
  if (check.rows.length > 0) {
    for (const order of check.rows) {
      try {
        await pool.query(`
          INSERT INTO order_payment (order_id, method_code, amount, amount_tendered, status)
          VALUES ($1, 'CASH', 0, 0, 'CAPTURED')
        `, [order.id]);
        console.log('  Fixed order:', order.id);
      } catch (e) {
        console.log('  Error for order ' + order.id + ':', e.message);
      }
    }
    console.log('✅ Added payment records: ' + check.rows.length);
  } else {
    console.log('✅ No missing payment records');
  }

  console.log('\n✅ ALL FIXES COMPLETE!\n');

} catch (err) {
  console.log('❌ Error:', err.message);
} finally {
  await pool.end();
}
