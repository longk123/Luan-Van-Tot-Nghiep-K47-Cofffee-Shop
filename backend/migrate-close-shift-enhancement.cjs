// migrate-close-shift-enhancement.cjs
// Migration để bổ sung các cột cần thiết cho chức năng "Đóng ca hoàn chỉnh"

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
    console.log('🚀 Starting Close Shift Enhancement Migration...\n');
    
    await client.query('BEGIN');
    
    // 1) Bổ sung các cột cho ca_lam
    console.log('📝 Adding columns to ca_lam table...');
    await client.query(`
      -- Tiền mặt kỳ vọng và thực tế
      ALTER TABLE ca_lam
        ADD COLUMN IF NOT EXISTS expected_cash    INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS actual_cash      INT,
        ADD COLUMN IF NOT EXISTS cash_diff        INT,
        
        -- Thống kê đơn hàng
        ADD COLUMN IF NOT EXISTS total_orders     INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_refunds    INT DEFAULT 0,
        
        -- Số liệu tài chính
        ADD COLUMN IF NOT EXISTS gross_amount     INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS discount_amount  INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tax_amount       INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS net_amount       INT DEFAULT 0,
        
        -- Phân loại theo phương thức thanh toán
        ADD COLUMN IF NOT EXISTS cash_amount      INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS card_amount      INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS transfer_amount  INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS online_amount    INT DEFAULT 0,
        
        -- Thời điểm đóng (nếu chưa có)
        ADD COLUMN IF NOT EXISTS closed_at        TIMESTAMPTZ;
    `);
    console.log('✅ Columns added successfully\n');
    
    // 2) Tạo chỉ mục cho performance
    console.log('📝 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_don_hang_ca_lam_id 
        ON don_hang(ca_lam_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ca_lam_status 
        ON ca_lam(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_ca_lam_started_at 
        ON ca_lam(started_at);
    `);
    console.log('✅ Indexes created successfully\n');
    
    // 3) Tạo view tóm tắt thanh toán theo ca (optional nhưng hữu ích)
    console.log('📝 Creating v_shift_summary view...');
    await client.query(`
      CREATE OR REPLACE VIEW v_shift_summary AS
      SELECT
        c.id AS shift_id,
        c.nhan_vien_id,
        c.started_at,
        c.ended_at,
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
        u.full_name AS nhan_vien_name,
        u.username AS nhan_vien_username
      FROM ca_lam c
      LEFT JOIN users u ON u.user_id = c.nhan_vien_id;
    `);
    console.log('✅ View created successfully\n');
    
    // 4) Tạo function helper để aggregate shift data (optional)
    console.log('📝 Creating fn_aggregate_shift function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_aggregate_shift(p_shift_id INT)
      RETURNS JSON AS $$
      DECLARE
        result JSON;
      BEGIN
        SELECT json_build_object(
          'total_orders', COUNT(DISTINCT dh.id),
          'gross_amount', COALESCE(SUM(
            (SELECT COALESCE(SUM((don_gia - COALESCE(giam_gia, 0)) * so_luong), 0)
             FROM don_hang_chi_tiet WHERE don_hang_id = dh.id)
          ), 0),
          'net_amount', COALESCE(SUM(h.tong_cong), 0),
          'discount_amount', COALESCE(SUM(h.giam_gia), 0),
          'tax_amount', COALESCE(SUM(h.thue), 0),
          'cash_amount', COALESCE(SUM(CASE WHEN h.phuong_thuc_thanh_toan = 'CASH' THEN h.tong_cong ELSE 0 END), 0),
          'card_amount', COALESCE(SUM(CASE WHEN h.phuong_thuc_thanh_toan = 'CARD' THEN h.tong_cong ELSE 0 END), 0),
          'transfer_amount', COALESCE(SUM(CASE WHEN h.phuong_thuc_thanh_toan = 'TRANSFER' THEN h.tong_cong ELSE 0 END), 0),
          'online_amount', COALESCE(SUM(CASE WHEN h.phuong_thuc_thanh_toan = 'ONLINE' THEN h.tong_cong ELSE 0 END), 0)
        ) INTO result
        FROM don_hang dh
        LEFT JOIN hoa_don h ON h.don_hang_id = dh.id
        WHERE dh.ca_lam_id = p_shift_id AND dh.trang_thai = 'PAID';
        
        RETURN result;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Function created successfully\n');
    
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - Added 14 new columns to ca_lam');
    console.log('   - Created 3 indexes for performance');
    console.log('   - Created v_shift_summary view');
    console.log('   - Created fn_aggregate_shift function');
    
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

