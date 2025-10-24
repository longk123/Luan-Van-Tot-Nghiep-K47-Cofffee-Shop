const {Pool}=require('pg');
require('dotenv').config();
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD
});

p.query(`
  INSERT INTO payment_transaction (order_id, payment_method_code, ref_code, amount, status, created_at, updated_at)
  VALUES (156, 'CASH', 'ORD156-FIX', 28000, 'PAID', NOW(), NOW())
`).then(()=>{
  console.log('✅ Created payment for order 156');
  p.end();
});

