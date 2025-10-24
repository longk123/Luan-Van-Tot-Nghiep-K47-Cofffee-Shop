const {Pool}=require('pg');
require('dotenv').config();
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD
});

p.query('SELECT id,ca_lam_id,trang_thai,nhan_vien_id,opened_at FROM don_hang ORDER BY id DESC LIMIT 5')
  .then(r=>{
    console.log('Latest orders:');
    r.rows.forEach(o => {
      console.log(`  Order #${o.id}: ca=${o.ca_lam_id}, nv=${o.nhan_vien_id}, status=${o.trang_thai}`);
    });
    p.end();
  });

