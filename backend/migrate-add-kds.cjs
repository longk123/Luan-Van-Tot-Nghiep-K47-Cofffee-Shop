// migrate-add-kds.cjs
// Migration cho Kitchen Display System

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
    console.log('🚀 Starting KDS Migration...\n');
    
    await client.query('BEGIN');
    
    // 1) Thêm timestamps cho tracking thời gian pha chế
    console.log('📝 Adding timestamps to don_hang_chi_tiet...');
    await client.query(`
      ALTER TABLE don_hang_chi_tiet
        ADD COLUMN IF NOT EXISTS created_at  TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS started_at  TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
    `);
    console.log('✅ Timestamps added\n');
    
    // 2) Tạo index cho performance
    console.log('📝 Creating indexes for KDS...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ctdh_kitchen_status
        ON don_hang_chi_tiet (trang_thai_che_bien)
        WHERE trang_thai_che_bien IN ('QUEUED', 'MAKING');
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ctdh_order_status
        ON don_hang_chi_tiet (don_hang_id, trang_thai_che_bien);
    `);
    console.log('✅ Indexes created\n');
    
    // 3) Tạo view cho KDS queue (optional nhưng hữu ích)
    console.log('📝 Creating v_kitchen_queue view...');
    await client.query(`
      CREATE OR REPLACE VIEW v_kitchen_queue AS
      SELECT
        ct.id AS line_id,
        ct.don_hang_id,
        ct.mon_id,
        ct.bien_the_id,
        ct.so_luong,
        ct.trang_thai_che_bien,
        ct.ghi_chu,
        ct.created_at,
        ct.started_at,
        ct.finished_at,
        EXTRACT(EPOCH FROM (COALESCE(ct.started_at, NOW()) - ct.created_at))::INT AS wait_seconds,
        EXTRACT(EPOCH FROM (COALESCE(ct.finished_at, NOW()) - COALESCE(ct.started_at, ct.created_at)))::INT AS making_seconds,
        m.ten AS mon_ten,
        m.ma AS mon_ma,
        btm.ten_bien_the AS bien_the_ten,
        dh.ban_id,
        dh.order_type,
        b.ten_ban,
        b.khu_vuc_id,
        kv.ten AS khu_vuc_ten
      FROM don_hang_chi_tiet ct
      JOIN don_hang dh ON dh.id = ct.don_hang_id
      LEFT JOIN ban b ON b.id = dh.ban_id
      LEFT JOIN khu_vuc kv ON kv.id = b.khu_vuc_id
      LEFT JOIN mon m ON m.id = ct.mon_id
      LEFT JOIN mon_bien_the btm ON btm.id = ct.bien_the_id
      WHERE ct.trang_thai_che_bien IN ('QUEUED', 'MAKING', 'DONE')
        AND dh.trang_thai = 'OPEN'
      ORDER BY 
        CASE ct.trang_thai_che_bien 
          WHEN 'QUEUED' THEN 1
          WHEN 'MAKING' THEN 2
          WHEN 'DONE' THEN 3
        END,
        ct.created_at;
    `);
    console.log('✅ View created\n');
    
    await client.query('COMMIT');
    
    console.log('✅ KDS Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - Added 2 timestamp columns');
    console.log('   - Created 2 indexes');
    console.log('   - Created v_kitchen_queue view');
    
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

