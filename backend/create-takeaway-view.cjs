// Tạo view cho đơn mang đi chưa giao
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function create() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating v_takeaway_pending view...\n');
    
    await client.query('BEGIN');
    
    // Tạo cột delivered_at nếu chưa có
    await client.query(`
      ALTER TABLE don_hang
        ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
    `);
    console.log('✅ Added delivered_at column');
    
    // Tạo view
    await client.query(`
      CREATE OR REPLACE VIEW v_takeaway_pending AS
      SELECT 
        dh.id,
        dh.trang_thai,
        dh.order_type,
        dh.opened_at,
        dh.closed_at,
        dh.delivered_at,
        settlement.grand_total,
        json_agg(
          json_build_object(
            'id', ct.id,
            'mon_ten', COALESCE(ct.ten_mon_snapshot, m.ten),
            'bien_the_ten', btm.ten_bien_the,
            'so_luong', ct.so_luong,
            'trang_thai_che_bien', ct.trang_thai_che_bien,
            'ghi_chu', ct.ghi_chu
          ) ORDER BY ct.id
        ) FILTER (WHERE ct.id IS NOT NULL) AS items
      FROM don_hang dh
      LEFT JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
      LEFT JOIN mon m ON m.id = ct.mon_id
      LEFT JOIN mon_bien_the btm ON btm.id = ct.bien_the_id
      LEFT JOIN v_order_settlement settlement ON settlement.order_id = dh.id
      WHERE dh.order_type = 'TAKEAWAY'
        AND dh.trang_thai IN ('OPEN', 'PAID')
        AND dh.delivered_at IS NULL
      GROUP BY dh.id, dh.trang_thai, dh.order_type, dh.opened_at, dh.closed_at, dh.delivered_at, settlement.grand_total
      ORDER BY dh.opened_at;
    `);
    
    await client.query('COMMIT');
    
    console.log('✅ View created successfully!\n');
    console.log('📝 View: v_takeaway_pending');
    console.log('📝 Condition: order_type = TAKEAWAY AND delivered_at IS NULL');
    console.log('📝 Now use: SELECT * FROM v_takeaway_pending');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

create();

