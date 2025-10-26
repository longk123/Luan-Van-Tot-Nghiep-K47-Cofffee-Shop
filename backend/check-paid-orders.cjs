const {Pool}=require('pg');
require('dotenv').config({path:require('path').join(__dirname,'.env')});
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:String(process.env.DB_PASSWORD)
});
p.query("SELECT COUNT(*) as count FROM don_hang WHERE trang_thai='da_thanh_toan'")
  .then(r=>{
    console.log('Paid orders:',r.rows[0].count);
    p.end();
  });
