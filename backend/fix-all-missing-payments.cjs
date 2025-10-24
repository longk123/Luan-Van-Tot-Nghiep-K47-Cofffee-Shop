// Tạo payment_transaction cho TẤT CẢ đơn PAID chưa có payment
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fix() {
  try {
    console.log('🔧 Creating payment_transaction for all PAID orders without payment...\n');
    
    const result = await pool.query(`
      INSERT INTO payment_transaction (order_id, payment_method_code, ref_code, amount, status, created_at, updated_at)
      SELECT 
        dh.id,
        'CASH' as payment_method_code,
        'ORD' || dh.id || '-AUTO' as ref_code,
        COALESCE(settlement.grand_total, 0) as amount,
        'PAID' as status,
        COALESCE(dh.closed_at, NOW()) as created_at,
        COALESCE(dh.closed_at, NOW()) as updated_at
      FROM don_hang dh
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.trang_thai = 'PAID'
        AND NOT EXISTS (
          SELECT 1 FROM payment_transaction pt WHERE pt.order_id = dh.id
        )
    `);
    
    console.log(`✅ Created ${result.rowCount} payment transaction records`);
    console.log('\n🎉 Refresh and test "Đóng ca" now!');
    console.log('\n⚠️ IMPORTANT: Restart backend to make checkout fix permanent!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

fix();

