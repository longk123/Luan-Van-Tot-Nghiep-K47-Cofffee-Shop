// Test invoice API data
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function testInvoice() {
  try {
    const orderId = 228; // Từ ảnh
    
    console.log(`\n🔍 Testing invoice #${orderId}...\n`);
    
    // Test header
    console.log('1️⃣ Testing v_invoice_header:');
    const headerResult = await pool.query(
      'SELECT * FROM v_invoice_header WHERE order_id=$1',
      [orderId]
    );
    console.log('Header rows:', headerResult.rowCount);
    if (headerResult.rows[0]) {
      console.log('Header data:', JSON.stringify(headerResult.rows[0], null, 2));
    }
    console.log('');
    
    // Test lines
    console.log('2️⃣ Testing v_invoice_lines:');
    const linesResult = await pool.query(
      'SELECT * FROM v_invoice_lines WHERE order_id=$1',
      [orderId]
    );
    console.log('Lines rows:', linesResult.rowCount);
    if (linesResult.rows[0]) {
      console.log('First line:', JSON.stringify(linesResult.rows[0], null, 2));
    }
    console.log('');
    
    // Test payments
    console.log('3️⃣ Testing v_invoice_payments:');
    const paymentsResult = await pool.query(
      'SELECT * FROM v_invoice_payments WHERE order_id=$1',
      [orderId]
    );
    console.log('Payments rows:', paymentsResult.rowCount);
    if (paymentsResult.rows[0]) {
      console.log('Payments:', JSON.stringify(paymentsResult.rows, null, 2));
    }
    console.log('');
    
    // Test totals
    console.log('4️⃣ Testing v_order_settlement:');
    const totalsResult = await pool.query(
      'SELECT * FROM v_order_settlement WHERE order_id=$1',
      [orderId]
    );
    console.log('Totals rows:', totalsResult.rowCount);
    if (totalsResult.rows[0]) {
      console.log('Totals:', JSON.stringify(totalsResult.rows[0], null, 2));
    }
    console.log('');
    
    // Check if views exist
    console.log('5️⃣ Checking if views exist:');
    const viewsCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'v_invoice%'
      ORDER BY table_name
    `);
    console.log('Invoice views:', viewsCheck.rows.map(r => r.table_name));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testInvoice();
