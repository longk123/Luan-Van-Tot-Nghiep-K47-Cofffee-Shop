// Migration: Add soft delete columns to ban, khu_vuc, khuyen_mai tables
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: String(process.env.DB_PASSWORD || '123456')
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting soft delete migration...\n');
    
    await client.query('BEGIN');

    // 1. Tables (ban) - Add is_deleted and deleted_at
    console.log('📝 Adding soft delete columns to ban table...');
    await client.query(`
      ALTER TABLE ban 
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
    `);
    
    // Update existing records
    await client.query(`
      UPDATE ban SET is_deleted = false WHERE is_deleted IS NULL;
    `);
    
    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ban_is_deleted ON ban(is_deleted);
    `);
    console.log('✅ ban table updated\n');

    // 2. Areas (khu_vuc) - Add deleted_at (already has active column)
    console.log('📝 Adding deleted_at column to khu_vuc table...');
    await client.query(`
      ALTER TABLE khu_vuc 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_khu_vuc_deleted_at ON khu_vuc(deleted_at);
    `);
    console.log('✅ khu_vuc table updated\n');

    // 3. Promotions (khuyen_mai) - Add deleted_at (already has active column)
    console.log('📝 Adding deleted_at column to khuyen_mai table...');
    await client.query(`
      ALTER TABLE khuyen_mai 
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_khuyen_mai_deleted_at ON khuyen_mai(deleted_at);
    `);
    console.log('✅ khuyen_mai table updated\n');

    await client.query('COMMIT');
    
    console.log('🎉 Migration completed successfully!\n');
    console.log('Summary:');
    console.log('  - ban: Added is_deleted (BOOLEAN), deleted_at (TIMESTAMP)');
    console.log('  - khu_vuc: Added deleted_at (TIMESTAMP)');
    console.log('  - khuyen_mai: Added deleted_at (TIMESTAMP)');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
