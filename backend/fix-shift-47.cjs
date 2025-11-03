// Fix shift #47 - recalculate with correct PAID orders only
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function fix() {
  const client = await pool.connect();
  try {
    console.log('🔧 Fixing shift #47...\n');

    // Check current data
    const current = await client.query('SELECT * FROM ca_lam WHERE id = 47');
    console.log('Current data:', {
      total_orders: current.rows[0].total_orders,
      gross_amount: current.rows[0].gross_amount,
      net_amount: current.rows[0].net_amount,
      discount_amount: current.rows[0].discount_amount
    });

    // Check orders
    const orders = await client.query(`
      SELECT id, trang_thai, closed_at, opened_at 
      FROM don_hang 
      WHERE ca_lam_id = 47
    `);
    console.log('\nOrders:', orders.rows);

    // Recalculate using fn_aggregate_shift
    const stats = await client.query('SELECT fn_aggregate_shift(47) as stats');
    console.log('\nRecalculated stats:', stats.rows[0].stats);

    // Update ca_lam
    await client.query(`
      UPDATE ca_lam
      SET 
        total_orders = $1,
        gross_amount = $2,
        net_amount = $3,
        discount_amount = $4,
        tax_amount = $5,
        cash_amount = $6,
        card_amount = $7,
        transfer_amount = $8,
        online_amount = $9
      WHERE id = 47
    `, [
      stats.rows[0].stats.total_orders,
      stats.rows[0].stats.gross_amount,
      stats.rows[0].stats.net_amount,
      stats.rows[0].stats.discount_amount,
      stats.rows[0].stats.tax_amount,
      stats.rows[0].stats.cash_amount,
      stats.rows[0].stats.card_amount,
      stats.rows[0].stats.transfer_amount,
      stats.rows[0].stats.online_amount
    ]);

    // Verify
    const updated = await client.query('SELECT * FROM ca_lam WHERE id = 47');
    console.log('\n✅ Updated data:', {
      total_orders: updated.rows[0].total_orders,
      gross_amount: updated.rows[0].gross_amount,
      net_amount: updated.rows[0].net_amount,
      discount_amount: updated.rows[0].discount_amount
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();
