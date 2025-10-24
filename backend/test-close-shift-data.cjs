// Test script to check shift data
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function test() {
  try {
    console.log('🔍 Checking shift #3 data...\n');
    
    // 1. Check orders in shift
    const orders = await pool.query(`
      SELECT id, ca_lam_id, trang_thai, order_type 
      FROM don_hang 
      WHERE ca_lam_id = 3 
      ORDER BY id DESC 
      LIMIT 5
    `);
    console.log('📦 Orders in shift #3:', orders.rows);
    
    // 2. Check payment transactions
    const payments = await pool.query(`
      SELECT pt.id, pt.order_id, pt.payment_method_code, pt.amount, pt.status
      FROM payment_transaction pt
      JOIN don_hang dh ON dh.id = pt.order_id
      WHERE dh.ca_lam_id = 3
    `);
    console.log('\n💳 Payment transactions:', payments.rows);
    
    // 3. Test fn_aggregate_shift
    const agg = await pool.query(`SELECT fn_aggregate_shift(3) as stats`);
    console.log('\n📊 Aggregate result:', JSON.stringify(agg.rows[0].stats, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

test();

