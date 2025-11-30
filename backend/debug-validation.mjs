// debug-validation.mjs
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost', database: 'coffee_shop', user: 'postgres', password: '123456', port: 5432
});

async function main() {
  // Check DINE_IN without table
  const r1 = await pool.query(`SELECT id, ban_id, trang_thai FROM don_hang WHERE order_type = 'DINE_IN' AND ban_id IS NULL AND trang_thai != 'CANCELLED' LIMIT 5`);
  console.log('DINE_IN without table:', r1.rows.length, r1.rows);
  
  // Check DELIVERY without info  
  const r2 = await pool.query(`SELECT dh.id FROM don_hang dh LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id WHERE dh.order_type = 'DELIVERY' AND di.order_id IS NULL AND dh.trang_thai != 'CANCELLED' LIMIT 5`);
  console.log('DELIVERY without info:', r2.rows.length, r2.rows);

  // Check DONE without finished_at
  const r3 = await pool.query(`SELECT id FROM don_hang_chi_tiet WHERE trang_thai_che_bien = 'DONE' AND finished_at IS NULL LIMIT 5`);
  console.log('DONE without finished_at:', r3.rows.length, r3.rows);

  // Check MAKING without started_at/maker_id
  const r4 = await pool.query(`SELECT id, started_at, maker_id FROM don_hang_chi_tiet WHERE trang_thai_che_bien = 'MAKING' AND (started_at IS NULL OR maker_id IS NULL)`);
  console.log('MAKING incomplete:', r4.rows.length, r4.rows);

  // Check ASSIGNED/OUT without shipper
  const r5 = await pool.query(`SELECT order_id, delivery_status, shipper_id FROM don_hang_delivery_info WHERE delivery_status IN ('ASSIGNED', 'OUT_FOR_DELIVERY') AND shipper_id IS NULL`);
  console.log('ASSIGNED/OUT without shipper:', r5.rows.length, r5.rows);

  // Check mon without category
  const r6 = await pool.query(`SELECT id, ten, loai_id FROM mon WHERE loai_id IS NULL OR loai_id NOT IN (SELECT id FROM loai_mon)`);
  console.log('Mon without category:', r6.rows.length, r6.rows);

  // Check waiter01 CASHIER shift
  const r7 = await pool.query(`
    SELECT ca.id, ca.shift_type, u.username, r.role_name
    FROM ca_lam ca
    JOIN users u ON u.user_id = ca.nhan_vien_id
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id
    WHERE u.username = 'waiter01' AND ca.shift_type = 'CASHIER'
  `);
  console.log('waiter01 CASHIER shifts:', r7.rows.length, r7.rows);

  await pool.end();
}

main();
