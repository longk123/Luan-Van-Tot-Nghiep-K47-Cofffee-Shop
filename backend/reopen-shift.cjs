const {Pool}=require('pg');
require('dotenv').config();
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD
});

p.query("UPDATE ca_lam SET status='OPEN', ended_at=NULL, closed_at=NULL WHERE id=3")
  .then(()=>{
    console.log('✅ Reopened shift 3 for testing');
    p.end();
  });

