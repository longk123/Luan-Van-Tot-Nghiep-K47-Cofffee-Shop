const {Pool}=require('pg');
require('dotenv').config({path:require('path').join(__dirname,'.env')});
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:String(process.env.DB_PASSWORD)
});
p.query("SELECT column_name FROM information_schema.columns WHERE table_name='users' ORDER BY ordinal_position")
  .then(r=>{
    console.log('Users columns:',r.rows.map(x=>x.column_name).join(', '));
    p.end();
  });
