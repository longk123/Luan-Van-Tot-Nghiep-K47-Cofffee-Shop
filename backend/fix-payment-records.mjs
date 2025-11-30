import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456',
  port: 5432
});

console.log('🔧 Fixing legacy data warnings...\n');

try {
  // Kiểm tra số đơn thiếu payment
  const check = await pool.query(`
    SELECT dh.id, dh.trang_thai
    FROM don_hang dh
    LEFT JOIN order_payment op ON dh.id = op.order_id
    WHERE dh.trang_thai = 'PAID' AND op.id IS NULL
  `);
  console.log('Đơn PAID thiếu payment: ' + check.rows.length);
  
  if (check.rows.length > 0) {
    // Thêm payment từng cái một
    for (const order of check.rows) {
      try {
        await pool.query(`
          INSERT INTO order_payment (order_id, method_code, amount, amount_tendered, status)
          VALUES ($1, 'CASH', 
            COALESCE((SELECT SUM(ct.don_gia * ct.so_luong) FROM don_hang_chi_tiet ct WHERE ct.don_hang_id = $1), 0),
            COALESCE((SELECT SUM(ct.don_gia * ct.so_luong) FROM don_hang_chi_tiet ct WHERE ct.don_hang_id = $1), 0),
            'CAPTURED')
        `, [order.id]);
      } catch (e) {
        // Skip if already exists
      }
    }
    console.log('✅ Đã thêm payment records');
  }

} catch (err) {
  console.log('❌ Error:', err.message);
} finally {
  await pool.end();
}
