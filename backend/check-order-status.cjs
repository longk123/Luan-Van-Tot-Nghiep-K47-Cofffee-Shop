const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'coffee_shop',
    user: 'postgres',
    password: '123456',
  });

  try {
    await client.connect();
    
    console.log('\n📊 Các trạng thái đơn hàng:');
    const statuses = await client.query(`
      SELECT trang_thai, COUNT(*) as count
      FROM don_hang
      GROUP BY trang_thai
    `);
    console.table(statuses.rows);
    
    console.log('\n📊 5 đơn hàng gần nhất:');
    const orders = await client.query(`
      SELECT 
        id, 
        trang_thai, 
        TO_CHAR(opened_at, 'DD/MM HH24:MI') as time,
        TO_CHAR(closed_at, 'DD/MM HH24:MI') as closed
      FROM don_hang
      ORDER BY id DESC
      LIMIT 5
    `);
    console.table(orders.rows);
    
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await client.end();
  }
}

check();
