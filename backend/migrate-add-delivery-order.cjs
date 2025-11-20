// Migration: Thêm DELIVERY order type và bảng lưu delivery info
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

    console.log('📝 Thêm DELIVERY vào order_type CHECK constraint...');
    
    // Xóa constraint cũ
    await client.query(`
      ALTER TABLE don_hang 
      DROP CONSTRAINT IF EXISTS don_hang_order_type_check
    `);

    // Thêm constraint mới với DELIVERY
    await client.query(`
      ALTER TABLE don_hang 
      ADD CONSTRAINT don_hang_order_type_check 
      CHECK (order_type IN ('DINE_IN','TAKEAWAY','DELIVERY'))
    `);

    console.log('📝 Tạo bảng don_hang_delivery_info...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS don_hang_delivery_info (
        order_id INT PRIMARY KEY REFERENCES don_hang(id) ON DELETE CASCADE,
        delivery_address TEXT NOT NULL,
        delivery_phone TEXT,
        delivery_notes TEXT,
        delivery_fee INT DEFAULT 0,
        latitude NUMERIC(10, 8),
        longitude NUMERIC(11, 8),
        distance_km NUMERIC(6, 2),
        estimated_time TIMESTAMPTZ,
        actual_delivered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Tạo index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_info_order_id 
      ON don_hang_delivery_info(order_id)
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

