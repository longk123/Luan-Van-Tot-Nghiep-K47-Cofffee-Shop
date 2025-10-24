const {Pool}=require('pg');
require('dotenv').config();
const p=new Pool({
  host:process.env.DB_HOST,
  port:process.env.DB_PORT,
  database:process.env.DB_NAME,
  user:process.env.DB_USER,
  password:process.env.DB_PASSWORD
});

async function run() {
  // Đóng tất cả ca cũ
  await p.query("UPDATE ca_lam SET status='CLOSED' WHERE status='OPEN'");
  
  // Tạo ca mới
  const result = await p.query(`
    INSERT INTO ca_lam (nhan_vien_id, started_at, status, opening_cash, opened_by)
    VALUES (1, NOW(), 'OPEN', 0, 1)
    RETURNING id
  `);
  
  console.log(`✅ Created new shift #${result.rows[0].id}`);
  console.log('🔄 Refresh the page to see the new shift!');
  p.end();
}

run();

