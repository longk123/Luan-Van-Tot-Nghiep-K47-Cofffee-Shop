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
  console.log('🔍 Checking shift #6...\n');
  
  // Orders
  const orders = await p.query(`
    SELECT dh.id, dh.trang_thai, settlement.grand_total
    FROM don_hang dh
    LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
    WHERE dh.ca_lam_id = 6
    ORDER BY dh.id
  `);
  
  console.log(`📦 Orders: ${orders.rowCount}`);
  orders.rows.forEach(o => {
    console.log(`  - Order #${o.id}: ${o.trang_thai} - ${o.grand_total}đ`);
  });
  
  // Payments
  const payments = await p.query(`
    SELECT pt.order_id, pt.payment_method_code, pt.amount, pt.status
    FROM payment_transaction pt
    JOIN don_hang dh ON dh.id = pt.order_id
    WHERE dh.ca_lam_id = 6
  `);
  
  console.log(`\n💳 Payments: ${payments.rowCount}`);
  payments.rows.forEach(p => {
    console.log(`  - Order #${p.order_id}: ${p.payment_method_code} ${p.amount}đ (${p.status})`);
  });
  
  // Aggregate
  const agg = await p.query(`SELECT fn_aggregate_shift(6) as stats`);
  const stats = agg.rows[0].stats;
  console.log('\n📊 Aggregate:');
  console.log(`  Total orders: ${stats.total_orders}`);
  console.log(`  Net: ${stats.net_amount}đ`);
  console.log(`  Cash: ${stats.cash_amount}đ`);
  console.log(`  Online: ${stats.online_amount}đ`);
  console.log(`  Card: ${stats.card_amount}đ`);
  
  p.end();
}

check();

