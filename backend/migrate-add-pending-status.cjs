// Thêm trạng thái PENDING cho món chờ xác nhận
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Adding PENDING status to trang_thai_che_bien...\n');
    
    await client.query('BEGIN');
    
    // 1. Drop old constraint
    await client.query(`
      ALTER TABLE don_hang_chi_tiet 
      DROP CONSTRAINT IF EXISTS chk_dhct_trang_thai_che_bien;
    `);
    
    // 2. Add new constraint with PENDING
    await client.query(`
      ALTER TABLE don_hang_chi_tiet
      ADD CONSTRAINT chk_dhct_trang_thai_che_bien
      CHECK (trang_thai_che_bien IN ('PENDING','QUEUED','MAKING','DONE','CANCELLED'));
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ PENDING status added successfully!\n');
    console.log('📝 Valid statuses now: PENDING, QUEUED, MAKING, DONE, CANCELLED');
    console.log('📝 Flow: PENDING → (confirm) → QUEUED → MAKING → DONE');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

