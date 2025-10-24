const {Pool}=require('pg');
require('dotenv').config();
const pool=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD
});

pool.query(`
  SELECT dh.id, dh.ca_lam_id, pt.payment_method_code, pt.amount 
  FROM don_hang dh 
  JOIN payment_transaction pt ON pt.order_id = dh.id 
  WHERE pt.payment_method_code = 'ONLINE'
`).then(r=>{
  console.log('Online payments:', r.rows);
  pool.end();
});

