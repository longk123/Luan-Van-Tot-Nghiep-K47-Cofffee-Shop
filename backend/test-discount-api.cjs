const { Client } = require('pg');

async function testAPI() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'coffee_shop',
    user: 'postgres',
    password: '123456',
  });

  try {
    await client.connect();
    
    // Test invoice query với discount
    console.log('\n📊 Test invoice query với discount fields:');
    const invoices = await client.query(`
      SELECT 
        o.id,
        o.trang_thai,
        COALESCE(settlement.grand_total, 0) AS total_amount,
        COALESCE(money.line_discounts_total, 0) AS line_discounts_total,
        COALESCE(money.promo_total, 0) AS promo_total,
        COALESCE(money.manual_discount, 0) AS manual_discount,
        (COALESCE(money.line_discounts_total, 0) + COALESCE(money.promo_total, 0) + COALESCE(money.manual_discount, 0)) AS total_discount
      FROM don_hang o
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = o.id
      LEFT JOIN v_order_money_totals money ON money.order_id = o.id
      WHERE o.trang_thai = 'PAID'
      ORDER BY o.id DESC
      LIMIT 5
    `);
    
    console.table(invoices.rows);
    
    // Test profit view với discount
    console.log('\n📊 Test profit view với discount fields:');
    const profit = await client.query(`
      SELECT 
        order_id,
        TO_CHAR(closed_at, 'DD/MM HH24:MI') as time,
        doanh_thu_goc,
        tong_giam_gia,
        doanh_thu,
        tong_gia_von,
        loi_nhuan
      FROM v_profit_with_topping_cost
      ORDER BY closed_at DESC
      LIMIT 5
    `);
    
    console.table(profit.rows);
    
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
  } finally {
    await client.end();
  }
}

testAPI();
