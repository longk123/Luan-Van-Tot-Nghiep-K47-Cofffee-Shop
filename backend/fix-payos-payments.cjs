// Update payment_method_code cho các đơn đã thanh toán qua PayOS
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function fix() {
  try {
    console.log('🔧 Fixing PayOS payment methods...\n');
    
    // Tìm các payment_transaction có gateway_txn_id (là PayOS)
    const payosPayments = await pool.query(`
      SELECT id, order_id, gateway_txn_id, payment_method_code 
      FROM payment_transaction 
      WHERE gateway_txn_id IS NOT NULL 
        AND status = 'PAID'
    `);
    
    console.log(`Found ${payosPayments.rowCount} PayOS payments`);
    
    if (payosPayments.rowCount > 0) {
      // Update chúng thành ONLINE
      const result = await pool.query(`
        UPDATE payment_transaction 
        SET payment_method_code = 'ONLINE'
        WHERE gateway_txn_id IS NOT NULL 
          AND status = 'PAID'
          AND payment_method_code != 'ONLINE'
      `);
      
      console.log(`✅ Updated ${result.rowCount} payments to ONLINE`);
      
      // Show details
      payosPayments.rows.forEach(p => {
        console.log(`  - Order #${p.order_id}: ${p.payment_method_code} → ONLINE`);
      });
    }
    
    console.log('\n🎉 Now test "Đóng ca" - Online payments will show up!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();

