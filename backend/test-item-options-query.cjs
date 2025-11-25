// Test query để kiểm tra options
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function test() {
  try {
    const itemId = 82; // Nước Ép Cam
    
    const sql = `
      SELECT 
        tc.id,
        tc.ten,
        tc.ma,
        tc.loai,
        tc.don_vi,
        tc.gia_mac_dinh,
        COALESCE(
          json_agg(
            json_build_object(
              'id', tcm.id,
              'ten', tcm.ten,
              'he_so', tcm.gia_tri,
              'thu_tu', tcm.thu_tu
            ) ORDER BY tcm.thu_tu
          ) FILTER (WHERE tcm.id IS NOT NULL),
          '[]'
        ) AS muc_tuy_chon
      FROM tuy_chon_mon tc
      JOIN mon_tuy_chon_ap_dung mtcad ON mtcad.tuy_chon_id = tc.id
      LEFT JOIN tuy_chon_muc tcm ON tcm.tuy_chon_id = tc.id
      WHERE mtcad.mon_id = $1
      GROUP BY tc.id, tc.ten, tc.ma, tc.loai, tc.don_vi, tc.gia_mac_dinh
      ORDER BY tc.id
    `;
    
    const { rows } = await pool.query(sql, [itemId]);
    console.log('📋 Options query result:');
    console.log(JSON.stringify(rows, null, 2));
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await pool.end();
  }
}

test();

