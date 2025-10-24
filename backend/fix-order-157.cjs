const {Pool}=require('pg');
require('dotenv').config();
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD
});

p.query(`INSERT INTO payment_transaction (order_id,payment_method_code,ref_code,amount,status) VALUES (157,'CASH','ORD157-FIX',32000,'PAID')`)
  .then(()=>{
    console.log('✅ Created payment for order 157');
    p.end();
  });

