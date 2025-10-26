const {Pool}=require('pg');
require('dotenv').config({path:require('path').join(__dirname,'.env')});
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:String(process.env.DB_PASSWORD)
});

p.query(`
  SELECT pg_get_functiondef(oid) as def
  FROM pg_proc
  WHERE proname = 'trg_dhct_before_update'
`).then(r => {
  if (r.rows.length > 0) {
    console.log('Function trg_dhct_before_update:');
    console.log('='.repeat(70));
    console.log(r.rows[0].def);
  }
  p.end();
});
