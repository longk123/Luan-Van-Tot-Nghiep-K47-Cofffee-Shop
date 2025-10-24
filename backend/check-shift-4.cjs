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
  // Check orders in shift 4
  const orders = await p.query(`
    SELECT id, ca_lam_id, trang_thai, order_type, closed_at
    FROM don_hang 
    WHERE ca_lam_id = 4 
    ORDER BY id DESC
  `);
  
  console.log(`📦 Orders in shift #4: ${orders.rowCount}`);
  orders.rows.forEach(o => {
    console.log(`  - Order #${o.id}: ${o.trang_thai} (${o.order_type})`);
  });
  
  // Check payments
  const payments = await p.query(`
    SELECT pt.id, pt.order_id, pt.payment_method_code, pt.amount, pt.status
    FROM payment_transaction pt
    JOIN don_hang dh ON dh.id = pt.order_id
    WHERE dh.ca_lam_id = 4
  `);
  
  console.log(`\n💳 Payments: ${payments.rowCount}`);
  payments.rows.forEach(p => {
    console.log(`  - Order #${p.order_id}: ${p.payment_method_code} ${p.amount}đ (${p.status})`);
  });
  
  // Test aggregate
  const agg = await p.query(`SELECT fn_aggregate_shift(4) as stats`);
  console.log('\n📊 Aggregate:');
  console.log(JSON.stringify(agg.rows[0].stats, null, 2));
  
  p.end();
}

check();

