// Tạo payment_transaction cho các đơn đã PAID trong quá khứ
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
    console.log('🔧 Creating payment_transaction for old PAID orders...\n');
    
    const result = await pool.query(`
      INSERT INTO payment_transaction (order_id, payment_method_code, ref_code, amount, status, created_at, updated_at)
      SELECT 
        dh.id,
        'CASH' as payment_method_code,
        'ORD' || dh.id || '-BACKFILL' as ref_code,
        settlement.grand_total as amount,
        'PAID' as status,
        dh.closed_at as created_at,
        dh.closed_at as updated_at
      FROM don_hang dh
      JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.trang_thai = 'PAID'
        AND NOT EXISTS (
          SELECT 1 FROM payment_transaction pt WHERE pt.order_id = dh.id
        )
    `);
    
    console.log(`✅ Created ${result.rowCount} payment transaction records`);
    console.log('\n🎉 Now test "Đóng ca" again!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();

