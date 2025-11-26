/**
 * Migration: Thêm bảng Shipper Wallet (Ví giao hàng)
 * 
 * Chức năng:
 * - shipper_wallet: Theo dõi số tiền mà waiter/shipper đang giữ
 * - wallet_transactions: Lịch sử giao dịch ví (thu tiền, nộp tiền)
 * 
 * Quy trình:
 * 1. Waiter giao đơn COD thành công → +tiền vào ví (COLLECT)
 * 2. Waiter nộp tiền cho thu ngân → -tiền khỏi ví (SETTLE)
 * 3. Số dư ví phải về 0 trước khi tan ca
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function migrate() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('🚀 Bắt đầu migration: Shipper Wallet...\n');

    // 1. Tạo bảng shipper_wallet
    console.log('📦 Tạo bảng shipper_wallet...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS shipper_wallet (
        id SERIAL PRIMARY KEY,
        user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        balance DECIMAL(12, 0) DEFAULT 0,  -- Số tiền đang giữ (dương = nợ quán)
        total_collected DECIMAL(12, 0) DEFAULT 0,  -- Tổng tiền đã thu (all time)
        total_settled DECIMAL(12, 0) DEFAULT 0,  -- Tổng tiền đã nộp (all time)
        wallet_limit DECIMAL(12, 0) DEFAULT 2000000,  -- Hạn mức ví (mặc định 2 triệu)
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `);
    console.log('✅ Tạo bảng shipper_wallet thành công!\n');

    // 2. Tạo bảng wallet_transactions
    console.log('📦 Tạo bảng wallet_transactions...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id SERIAL PRIMARY KEY,
        wallet_id INT NOT NULL REFERENCES shipper_wallet(id) ON DELETE CASCADE,
        order_id INT REFERENCES don_hang(id) ON DELETE SET NULL,
        shift_id INT REFERENCES ca_lam(id) ON DELETE SET NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('COLLECT', 'SETTLE', 'ADJUST')),
        -- COLLECT: Thu tiền từ khách (khi giao đơn COD thành công)
        -- SETTLE: Nộp tiền cho thu ngân
        -- ADJUST: Điều chỉnh thủ công (admin)
        amount DECIMAL(12, 0) NOT NULL,
        balance_before DECIMAL(12, 0) NOT NULL,
        balance_after DECIMAL(12, 0) NOT NULL,
        payment_method VARCHAR(20),  -- Phương thức thanh toán gốc của đơn hàng
        note TEXT,
        created_by INT REFERENCES users(user_id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅ Tạo bảng wallet_transactions thành công!\n');

    // 3. Tạo index để tối ưu query
    console.log('📦 Tạo indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id 
      ON wallet_transactions(wallet_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at 
      ON wallet_transactions(created_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type 
      ON wallet_transactions(type);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_shift_id 
      ON wallet_transactions(shift_id);
    `);
    console.log('✅ Tạo indexes thành công!\n');

    // 4. Tạo function tự động cập nhật updated_at
    console.log('📦 Tạo trigger updated_at...');
    await client.query(`
      CREATE OR REPLACE FUNCTION update_shipper_wallet_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trg_shipper_wallet_updated_at ON shipper_wallet;
      CREATE TRIGGER trg_shipper_wallet_updated_at
        BEFORE UPDATE ON shipper_wallet
        FOR EACH ROW
        EXECUTE FUNCTION update_shipper_wallet_updated_at();
    `);
    console.log('✅ Tạo trigger updated_at thành công!\n');

    // 5. Tạo view tổng hợp ví
    console.log('📦 Tạo view v_shipper_wallet_summary...');
    await client.query(`
      CREATE OR REPLACE VIEW v_shipper_wallet_summary AS
      SELECT 
        sw.id AS wallet_id,
        sw.user_id,
        u.username,
        u.full_name AS shipper_name,
        sw.balance,
        sw.total_collected,
        sw.total_settled,
        sw.wallet_limit,
        sw.is_active,
        sw.updated_at,
        -- Số giao dịch hôm nay
        COALESCE(today_stats.today_collected, 0) AS today_collected,
        COALESCE(today_stats.today_settled, 0) AS today_settled,
        COALESCE(today_stats.today_orders, 0) AS today_orders
      FROM shipper_wallet sw
      JOIN users u ON u.user_id = sw.user_id
      LEFT JOIN LATERAL (
        SELECT 
          SUM(CASE WHEN wt.type = 'COLLECT' THEN wt.amount ELSE 0 END) AS today_collected,
          SUM(CASE WHEN wt.type = 'SETTLE' THEN wt.amount ELSE 0 END) AS today_settled,
          COUNT(CASE WHEN wt.type = 'COLLECT' THEN 1 END) AS today_orders
        FROM wallet_transactions wt
        WHERE wt.wallet_id = sw.id
          AND wt.created_at::DATE = CURRENT_DATE
      ) today_stats ON TRUE
      WHERE sw.is_active = TRUE;
    `);
    console.log('✅ Tạo view v_shipper_wallet_summary thành công!\n');

    // 6. Tạo ví cho các waiter hiện có
    console.log('📦 Tạo ví cho các waiter hiện có...');
    const result = await client.query(`
      INSERT INTO shipper_wallet (user_id)
      SELECT u.user_id
      FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id
      JOIN roles r ON r.role_id = ur.role_id
      WHERE LOWER(r.role_name) = 'waiter'
        AND u.is_active = TRUE
        AND NOT EXISTS (
          SELECT 1 FROM shipper_wallet sw WHERE sw.user_id = u.user_id
        )
      ON CONFLICT (user_id) DO NOTHING
      RETURNING user_id;
    `);
    console.log(`✅ Đã tạo ví cho ${result.rowCount} waiter!\n`);

    await client.query('COMMIT');
    console.log('🎉 Migration hoàn tất thành công!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration thất bại:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
