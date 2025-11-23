/**
 * Migration: Add notifications table
 * Tạo bảng notifications để lưu thông báo cho users
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD
});

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Tạo bảng notifications
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        data JSONB DEFAULT '{}',
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Tạo indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
      ON notifications(user_id, read)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created 
      ON notifications(created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_type 
      ON notifications(type)
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed: notifications table created');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);

