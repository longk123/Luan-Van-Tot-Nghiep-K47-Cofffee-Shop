// Migration: Thêm cột delivery_failure_reason vào don_hang_delivery_info
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'pos_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('📝 Thêm cột delivery_failure_reason vào don_hang_delivery_info...');
    await client.query(`
      ALTER TABLE don_hang_delivery_info
      ADD COLUMN IF NOT EXISTS delivery_failure_reason TEXT
    `);

    await client.query('COMMIT');
    console.log('✅ Migration hoàn tất!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

