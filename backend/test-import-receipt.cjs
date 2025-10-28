// test-import-receipt.cjs
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function test() {
  try {
    console.log('🧪 Testing import receipt query...');
    
    const importId = 26;
    
    const sql = `
      SELECT 
        nk.id,
        nk.nguyen_lieu_id,
        nl.ma as nguyen_lieu_ma,
        nl.ten as nguyen_lieu_ten,
        nl.don_vi,
        nk.so_luong,
        nk.don_gia,
        nk.thanh_tien,
        nk.nha_cung_cap,
        nk.ghi_chu,
        nk.ngay_nhap,
        nk.nguoi_nhap_id,
        u.full_name as nguoi_nhap_ten
      FROM nhap_kho nk
      JOIN nguyen_lieu nl ON nl.id = nk.nguyen_lieu_id
      LEFT JOIN users u ON u.user_id = nk.nguoi_nhap_id
      WHERE nk.id = $1
    `;
    
    const { rows } = await pool.query(sql, [importId]);
    
    if (rows.length === 0) {
      console.log('❌ No data found for import ID:', importId);
    } else {
      console.log('✅ Import receipt data:', rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

test();
