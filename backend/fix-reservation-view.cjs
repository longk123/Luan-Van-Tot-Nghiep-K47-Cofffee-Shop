const { Pool } = require('pg');
const pool = new Pool({host:'localhost',user:'postgres',password:'123456',database:'coffee_shop'});

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Fixing v_reservation_calendar view...');
    
    await client.query(`
      CREATE OR REPLACE VIEW v_reservation_calendar AS
      SELECT
        r.id,
        r.khach_hang_id,
        r.ten_khach,
        r.so_dien_thoai,
        r.so_nguoi,
        r.khu_vuc_id,
        r.start_at,
        r.end_at,
        r.trang_thai,
        r.nguon,
        r.ghi_chu,
        r.dat_coc,
        r.dat_coc_trang_thai,
        r.don_hang_id,
        r.created_by,
        r.created_at,
        r.updated_at,
        COALESCE(r.ten_khach, k.ten) AS khach,
        COALESCE(r.so_dien_thoai, k.so_dien_thoai) AS sdt,
        NULL::TEXT AS khu_vuc_ten,
        array_agg(l.ban_id ORDER BY l.ban_id) FILTER (WHERE l.ban_id IS NOT NULL) AS ban_ids,
        string_agg(b.ten_ban, ', ' ORDER BY l.ban_id) AS ban_names
      FROM dat_ban r
      LEFT JOIN khach_hang k ON k.id = r.khach_hang_id
      LEFT JOIN dat_ban_ban l ON l.dat_ban_id = r.id
      LEFT JOIN ban b ON b.id = l.ban_id
      GROUP BY r.id, r.khach_hang_id, r.ten_khach, r.so_dien_thoai, r.so_nguoi, 
               r.khu_vuc_id, r.start_at, r.end_at, r.trang_thai, r.nguon, r.ghi_chu,
               r.dat_coc, r.dat_coc_trang_thai, r.don_hang_id, r.created_by, 
               r.created_at, r.updated_at, k.ten, k.so_dien_thoai
    `);
    
    await client.query('COMMIT');
    console.log('✅ View fixed!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fix().catch(console.error);

