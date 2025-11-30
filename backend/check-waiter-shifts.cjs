const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function checkShifts() {
  try {
    const result = await pool.query(`
      SELECT 
        cl.id,
        cl.shift_type,
        cl.started_at,
        cl.closed_at,
        u.username,
        u.full_name
      FROM ca_lam cl
      JOIN users u ON u.user_id = cl.nhan_vien_id
      WHERE cl.closed_at IS NULL
      ORDER BY cl.started_at DESC
    `);

    console.log('📊 Ca làm việc đang mở:');
    if (result.rows.length === 0) {
      console.log('   ❌ Không có ca nào đang mở\n');
    } else {
      console.table(result.rows.map(r => ({
        ID: r.id,
        Username: r.username,
        'Họ tên': r.full_name,
        'Loại ca': r.shift_type,
        'Bắt đầu': new Date(r.started_at).toLocaleString('vi-VN')
      })));
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi:', err);
    await pool.end();
    process.exit(1);
  }
}

checkShifts();
