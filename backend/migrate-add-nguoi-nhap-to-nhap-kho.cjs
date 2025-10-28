// migrate-add-nguoi-nhap-to-nhap-kho.cjs
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Bắt đầu migration: Thêm cột nguoi_nhap_id vào bảng nhap_kho...');
    
    // Check if column exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='nhap_kho' AND column_name='nguoi_nhap_id'
    `);
    
    if (checkColumn.rows.length > 0) {
      console.log('✅ Cột nguoi_nhap_id đã tồn tại, bỏ qua');
      return;
    }
    
    // Add column
    await client.query(`
      ALTER TABLE nhap_kho
      ADD COLUMN nguoi_nhap_id INTEGER REFERENCES users(user_id)
    `);
    
    console.log('✅ Đã thêm cột nguoi_nhap_id vào bảng nhap_kho');
    
    // Create index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_nhap_kho_nguoi_nhap
      ON nhap_kho(nguoi_nhap_id)
    `);
    
    console.log('✅ Đã tạo index cho nguoi_nhap_id');
    
    // Create print log table
    await client.query(`
      CREATE TABLE IF NOT EXISTS import_receipt_print_log (
        id SERIAL PRIMARY KEY,
        import_id INTEGER REFERENCES nhap_kho(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(user_id),
        printer VARCHAR(255),
        copies INTEGER DEFAULT 1,
        reason TEXT,
        printed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    console.log('✅ Đã tạo bảng import_receipt_print_log');
    
    console.log('🎉 Migration hoàn tất!');
    
  } catch (error) {
    console.error('❌ Lỗi migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
