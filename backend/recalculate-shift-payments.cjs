// Recalculate payment amounts for a specific shift
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function recalculateShift(shiftId) {
  const client = await pool.connect();
  
  try {
    console.log(`🔄 Recalculating payments for shift #${shiftId}...\n`);
    
    // Get aggregated stats
    const { rows: [result] } = await client.query(
      `SELECT fn_aggregate_shift($1) AS stats`,
      [shiftId]
    );
    
    const stats = result?.stats || {};
    
    if (!stats || stats.total_orders === 0) {
      console.log('⚠️  No orders found for this shift');
      return;
    }
    
    console.log('📊 Calculated Stats:');
    console.log(`  - Total orders: ${stats.total_orders}`);
    console.log(`  - Gross: ${stats.gross_amount?.toLocaleString('vi-VN')} ₫`);
    console.log(`  - Net: ${stats.net_amount?.toLocaleString('vi-VN')} ₫`);
    console.log(`  - Cash: ${stats.cash_amount?.toLocaleString('vi-VN')} ₫`);
    console.log(`  - Card: ${stats.card_amount?.toLocaleString('vi-VN')} ₫`);
    console.log(`  - Online: ${stats.online_amount?.toLocaleString('vi-VN')} ₫`);
    console.log(`  - Transfer: ${stats.transfer_amount?.toLocaleString('vi-VN')} ₫\n`);
    
    // Update shift
    await client.query(`
      UPDATE ca_lam
      SET cash_amount = $1,
          card_amount = $2,
          transfer_amount = $3,
          online_amount = $4,
          gross_amount = $5,
          net_amount = $6,
          discount_amount = $7,
          total_orders = $8
      WHERE id = $9
    `, [
      stats.cash_amount || 0,
      stats.card_amount || 0,
      stats.transfer_amount || 0,
      stats.online_amount || 0,
      stats.gross_amount || 0,
      stats.net_amount || 0,
      stats.discount_amount || 0,
      stats.total_orders || 0,
      shiftId
    ]);
    
    console.log('✅ Shift updated successfully!');
    console.log('\n💡 Now refresh the shift detail modal to see updated payment amounts.\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get shift ID from command line or use 47
const shiftId = process.argv[2] ? parseInt(process.argv[2]) : 47;
recalculateShift(shiftId);

