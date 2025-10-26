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
    
    const data = await client.query(`
      SELECT 
        order_id, 
        grand_total, 
        subtotal_before_lines, 
        line_discounts_total, 
        promo_total, 
        manual_discount
      FROM v_order_money_totals 
      WHERE line_discounts_total > 0 OR promo_total > 0 OR manual_discount > 0
      LIMIT 5
    `);
    
    console.log('\n📊 Các đơn hàng có giảm giá:');
    console.table(data.rows);
    
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await client.end();
  }
}

check();
