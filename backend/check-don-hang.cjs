const {Pool}=require('pg');
require('dotenv').config({path:require('path').join(__dirname,'.env')});
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:String(process.env.DB_PASSWORD)
});

async function check() {
  // Kiểm tra cột
  const cols = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name='don_hang' AND column_name LIKE '%trang%'");
  console.log('Columns:', cols.rows.map(r => r.column_name));
  
  // Kiểm tra tất cả đơn
  const all = await p.query("SELECT COUNT(*) FROM don_hang");
  console.log('Total orders:', all.rows[0].count);
  
  // Lấy 1 đơn mẫu
  const sample = await p.query("SELECT * FROM don_hang ORDER BY id DESC LIMIT 1");
  if (sample.rows.length > 0) {
    console.log('Sample order:', sample.rows[0]);
  }
  
  await p.end();
}

check();
