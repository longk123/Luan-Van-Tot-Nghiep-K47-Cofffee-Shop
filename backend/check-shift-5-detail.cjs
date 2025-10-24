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
  // Orders in shift 5
  const orders = await p.query(`
    SELECT dh.id, dh.ca_lam_id, dh.trang_thai, settlement.grand_total
    FROM don_hang dh
    LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
    WHERE dh.ca_lam_id = 5 
    ORDER BY dh.id
  `);
  
  console.log(`📦 Orders in shift #5: ${orders.rowCount}`);
  let totalExpected = 0;
  orders.rows.forEach(o => {
    console.log(`  - Order #${o.id}: ${o.trang_thai} - ${o.grand_total}đ`);
    if (o.trang_thai === 'PAID') totalExpected += parseInt(o.grand_total || 0);
  });
  console.log(`Total expected: ${totalExpected}đ`);
  
  // Payments
  const payments = await p.query(`
    SELECT pt.id, pt.order_id, pt.payment_method_code, pt.amount, pt.status
    FROM payment_transaction pt
    JOIN don_hang dh ON dh.id = pt.order_id
    WHERE dh.ca_lam_id = 5
    ORDER BY pt.id
  `);
  
  console.log(`\n💳 Payments: ${payments.rowCount}`);
  let cashSum = 0, onlineSum = 0, cardSum = 0;
  payments.rows.forEach(p => {
    console.log(`  - Order #${p.order_id}: ${p.payment_method_code} ${p.amount}đ (${p.status})`);
    if (p.status === 'PAID') {
      if (p.payment_method_code === 'CASH') cashSum += parseInt(p.amount);
      else if (p.payment_method_code === 'ONLINE') onlineSum += parseInt(p.amount);
      else if (p.payment_method_code === 'CARD') cardSum += parseInt(p.amount);
    }
  });
  console.log(`\nManual calculation:`);
  console.log(`  Cash: ${cashSum}đ`);
  console.log(`  Online: ${onlineSum}đ`);
  console.log(`  Card: ${cardSum}đ`);
  
  // Test aggregate function
  const agg = await p.query(`SELECT fn_aggregate_shift(5) as stats`);
  console.log('\n📊 Aggregate function result:');
  const stats = agg.rows[0].stats;
  console.log(`  Total orders: ${stats.total_orders}`);
  console.log(`  Net amount: ${stats.net_amount}đ`);
  console.log(`  Cash: ${stats.cash_amount}đ`);
  console.log(`  Online: ${stats.online_amount}đ`);
  console.log(`  Card: ${stats.card_amount}đ`);
  
  p.end();
}

check();

