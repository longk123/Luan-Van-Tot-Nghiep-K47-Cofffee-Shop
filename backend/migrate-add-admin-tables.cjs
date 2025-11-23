// backend/migrate-add-admin-tables.cjs
// Migration để tạo các bảng cho Admin features

const pkg = require('pg');
const { Pool } = pkg;
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffeepos',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Bắt đầu migration: Tạo bảng cho Admin features...\n');

    await client.query('BEGIN');

    // 1. Tạo bảng system_settings
    console.log('📋 Tạo bảng system_settings...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Đã tạo bảng system_settings');

    // 2. Tạo bảng system_logs
    console.log('📋 Tạo bảng system_logs...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id SERIAL PRIMARY KEY,
        level VARCHAR(20) NOT NULL DEFAULT 'INFO',
        user_id INTEGER REFERENCES users(user_id),
        action VARCHAR(100),
        message TEXT NOT NULL,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Đã tạo bảng system_logs');

    // 3. Tạo index cho system_logs
    console.log('📋 Tạo index cho system_logs...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
      CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
    `);
    console.log('✅ Đã tạo index cho system_logs');

    await client.query('COMMIT');
    console.log('\n✅ Migration hoàn tất!');
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

