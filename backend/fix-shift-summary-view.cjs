// Fix v_shift_summary view to include all needed fields
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
    console.log('🔧 Fixing v_shift_summary view...\n');

    // Drop existing view first
    await client.query(`DROP VIEW IF EXISTS v_shift_summary CASCADE`);

    await client.query(`
      CREATE VIEW v_shift_summary AS
      SELECT
        c.id AS shift_id,
        c.nhan_vien_id,
        c.shift_type,
        c.started_at,
        c.ended_at AS closed_at,
        c.status,
        c.opening_cash,
        c.expected_cash,
        c.actual_cash,
        c.cash_diff,
        c.total_orders,
        c.gross_amount,
        c.discount_amount,
        c.tax_amount,
        c.net_amount,
        c.cash_amount,
        c.card_amount,
        c.transfer_amount,
        c.online_amount,
        c.note,
        u.full_name AS nhan_vien_ten,
        u.username AS nhan_vien_username
      FROM ca_lam c
      LEFT JOIN users u ON u.user_id = c.nhan_vien_id;
    `);
    
    console.log('✅ View fixed successfully!\n');
    console.log('Changes:');
    console.log('  - Added shift_type field');
    console.log('  - Renamed ended_at → closed_at');
    console.log('  - Renamed nhan_vien_name → nhan_vien_ten');
    console.log('  - Added note field');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fix();

