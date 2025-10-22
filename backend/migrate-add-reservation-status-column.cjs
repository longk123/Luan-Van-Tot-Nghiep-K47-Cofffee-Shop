/**
 * Migration: Thêm cột trang_thai_dat_ban vào bảng ban
 * Và tạo trigger tự động cập nhật khi có reservation PENDING/CONFIRMED
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('📝 Checking if dat_ban tables exist...');
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('dat_ban', 'dat_ban_ban')
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('⚠️ Tables dat_ban không tồn tại. Cần chạy migrate-add-reservations.cjs trước!');
      await client.query('ROLLBACK');
      return;
    }
    
    console.log('✅ Tables exist. Proceeding...');
    
    // 1. Thêm cột trang_thai_dat_ban vào bảng ban
    console.log('📝 Thêm cột trang_thai_dat_ban vào bảng ban...');
    await client.query(`
      ALTER TABLE ban 
      ADD COLUMN IF NOT EXISTS trang_thai_dat_ban TEXT DEFAULT NULL
        CHECK (trang_thai_dat_ban IN ('PENDING', 'CONFIRMED', NULL))
    `);
    
    // 2. Thêm cột thông tin reservation
    await client.query(`
      ALTER TABLE ban 
      ADD COLUMN IF NOT EXISTS reservation_id INT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS reservation_guest TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS reservation_time TIMESTAMPTZ DEFAULT NULL
    `);
    
    // 3. Function cập nhật trạng thái đặt bàn
    console.log('🔧 Tạo function sync reservation status...');
    await client.query(`
      CREATE OR REPLACE FUNCTION fn_sync_table_reservation_status(p_ban_id INT)
      RETURNS VOID AS $$
      DECLARE
        v_reservation RECORD;
      BEGIN
        IF p_ban_id IS NULL THEN RETURN; END IF;
        
        -- Tìm reservation gần nhất cho bàn (PENDING/CONFIRMED)
        SELECT 
          r.id,
          r.trang_thai,
          r.ten_khach,
          r.start_at
        INTO v_reservation
        FROM dat_ban r
        JOIN dat_ban_ban dbb ON dbb.dat_ban_id = r.id
        WHERE dbb.ban_id = p_ban_id
          AND r.trang_thai IN ('PENDING', 'CONFIRMED')
          AND r.start_at <= now() + interval '24 hours'
          AND r.end_at >= now()
        ORDER BY r.start_at
        LIMIT 1;
        
        IF FOUND THEN
          -- Có reservation -> Cập nhật
          UPDATE ban 
          SET 
            trang_thai_dat_ban = v_reservation.trang_thai,
            reservation_id = v_reservation.id,
            reservation_guest = v_reservation.ten_khach,
            reservation_time = v_reservation.start_at
          WHERE id = p_ban_id;
        ELSE
          -- Không có reservation -> Clear
          UPDATE ban 
          SET 
            trang_thai_dat_ban = NULL,
            reservation_id = NULL,
            reservation_guest = NULL,
            reservation_time = NULL
          WHERE id = p_ban_id;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // 4. Trigger tự động sync khi thay đổi reservation
    console.log('⚙️ Tạo trigger auto-sync...');
    await client.query(`
      CREATE OR REPLACE FUNCTION trg_sync_reservation_status()
      RETURNS TRIGGER AS $$
      DECLARE
        v_ban_ids INT[];
        v_ban_id INT;
      BEGIN
        -- Lấy tất cả ban_id liên quan
        IF TG_OP = 'DELETE' THEN
          SELECT array_agg(ban_id) INTO v_ban_ids
          FROM dat_ban_ban WHERE dat_ban_id = OLD.id;
        ELSE
          SELECT array_agg(ban_id) INTO v_ban_ids
          FROM dat_ban_ban WHERE dat_ban_id = NEW.id;
        END IF;
        
        -- Sync từng bàn
        IF v_ban_ids IS NOT NULL THEN
          FOREACH v_ban_id IN ARRAY v_ban_ids
          LOOP
            PERFORM fn_sync_table_reservation_status(v_ban_id);
          END LOOP;
        END IF;
        
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS t_after_reservation_change ON dat_ban;
      CREATE TRIGGER t_after_reservation_change
      AFTER INSERT OR UPDATE OR DELETE ON dat_ban
      FOR EACH ROW EXECUTE FUNCTION trg_sync_reservation_status();
    `);
    
    // 5. Sync dữ liệu hiện tại
    console.log('🔄 Syncing existing reservations...');
    const { rows: allTables } = await client.query(`SELECT id FROM ban`);
    for (const table of allTables) {
      await client.query(`SELECT fn_sync_table_reservation_status($1)`, [table.id]);
    }
    
    await client.query('COMMIT');
    console.log('✅ Migration complete!');
    console.log('📋 Đã thêm:');
    console.log('  - Cột: trang_thai_dat_ban, reservation_id, reservation_guest, reservation_time');
    console.log('  - Function: fn_sync_table_reservation_status()');
    console.log('  - Trigger: Auto-sync khi thay đổi reservation');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});

