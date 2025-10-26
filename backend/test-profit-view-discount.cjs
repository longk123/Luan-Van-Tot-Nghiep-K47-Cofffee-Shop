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
    
    const cols = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema='public' 
        AND table_name='v_profit_with_topping_cost' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📊 Cấu trúc view v_profit_with_topping_cost:');
    console.table(cols.rows);
    
    const data = await client.query(`
      SELECT * FROM v_profit_with_topping_cost 
      ORDER BY closed_at DESC 
      LIMIT 3
    `);
    
    console.log('\n📊 3 đơn hàng gần nhất:');
    console.table(data.rows);
    
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await client.end();
  }
}

check();
