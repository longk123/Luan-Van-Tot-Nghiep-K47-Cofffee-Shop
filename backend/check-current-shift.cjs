const {Pool}=require('pg');
require('dotenv').config();
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD
});

async function check() {
  // Find latest open shift
  const shift = await p.query(`SELECT id FROM ca_lam WHERE status='OPEN' ORDER BY id DESC LIMIT 1`);
  
  if (!shift.rows[0]) {
    console.log('❌ No open shift');
    p.end();
    return;
  }
  
  const shiftId = shift.rows[0].id;
  console.log(`🔍 Checking shift #${shiftId}...\n`);
  
  // Orders
  const orders = await p.query(`
    SELECT dh.id, dh.trang_thai, settlement.grand_total
    FROM don_hang dh
    LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
    WHERE dh.ca_lam_id = $1
    ORDER BY dh.id
  `, [shiftId]);
  
  console.log(`📦 Orders: ${orders.rowCount}`);
  orders.rows.forEach(o => {
    console.log(`  - Order #${o.id}: ${o.trang_thai} - ${o.grand_total}đ`);
  });
  
  // Payments
  const payments = await p.query(`
    SELECT pt.order_id, pt.payment_method_code, pt.amount, pt.status
    FROM payment_transaction pt
    JOIN don_hang dh ON dh.id = pt.order_id
    WHERE dh.ca_lam_id = $1
  `, [shiftId]);
  
  console.log(`\n💳 Payments: ${payments.rowCount}`);
  let cashSum = 0;
  payments.rows.forEach(pt => {
    console.log(`  - Order #${pt.order_id}: ${pt.payment_method_code} ${pt.amount}đ (${pt.status})`);
    if (pt.status === 'PAID' && pt.payment_method_code === 'CASH') {
      cashSum += parseInt(pt.amount);
    }
  });
  console.log(`\n💵 Expected cash (manual): ${cashSum}đ`);
  
  // Aggregate
  const agg = await p.query(`SELECT fn_aggregate_shift($1) as stats`, [shiftId]);
  const stats = agg.rows[0].stats;
  console.log(`\n📊 Aggregate function:`);
  console.log(`  Cash: ${stats.cash_amount}đ`);
  console.log(`  Total: ${stats.net_amount}đ`);
  
  p.end();
}

check();

