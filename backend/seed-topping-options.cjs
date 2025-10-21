// backend/seed-topping-options.cjs
// Script: Áp dụng tùy chọn SUGAR, ICE, và topping cho các món

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('🔗 Đang kết nối database...');
    await client.query('BEGIN');

    // 1. Áp dụng SUGAR & ICE cho tất cả món cà phê và trà
    console.log('📝 Áp dụng SUGAR & ICE cho món cà phê và trà...');
    await client.query(`
      INSERT INTO mon_tuy_chon_ap_dung (mon_id, tuy_chon_id)
      SELECT m.id, tc.id
      FROM mon m
      CROSS JOIN tuy_chon_mon tc
      JOIN loai_mon lm ON lm.id = m.loai_id
      WHERE tc.ma IN ('SUGAR', 'ICE')
        AND lm.ten IN ('Cà phê', 'Trà')
      ON CONFLICT (mon_id, tuy_chon_id) DO NOTHING
    `);

    // 2. Áp dụng topping cho tất cả món đá xay, trà, và cà phê
    console.log('📝 Áp dụng topping cho món đá xay, trà, và cà phê...');
    await client.query(`
      INSERT INTO mon_tuy_chon_ap_dung (mon_id, tuy_chon_id)
      SELECT m.id, tc.id
      FROM mon m
      CROSS JOIN tuy_chon_mon tc
      JOIN loai_mon lm ON lm.id = m.loai_id
      WHERE tc.loai = 'AMOUNT'
        AND lm.ten IN ('Cà phê', 'Trà', 'Đá xay')
      ON CONFLICT (mon_id, tuy_chon_id) DO NOTHING
    `);

    // 3. (Tùy chọn) Thêm giá đặc biệt cho topping theo size
    console.log('📝 Thêm giá đặc biệt cho topping theo size L (demo)...');
    
    // Ví dụ: Bánh flan size L của "Cà phê sữa đá" giá 9,000đ thay vì 8,000đ
    await client.query(`
      INSERT INTO tuy_chon_gia (tuy_chon_id, mon_id, mon_bien_the_id, gia)
      SELECT 
        tc.id,
        m.id,
        mbt.id,
        9000
      FROM tuy_chon_mon tc
      JOIN mon m ON m.ma = 'CF-SUA-DA'
      JOIN mon_bien_the mbt ON mbt.mon_id = m.id AND mbt.ten_bien_the = 'Size L'
      WHERE tc.ma = 'TOPPING_FLAN'
      ON CONFLICT (tuy_chon_id, mon_id, mon_bien_the_id) DO UPDATE
        SET gia = EXCLUDED.gia
    `);

    await client.query('COMMIT');
    console.log('✅ Seed hoàn tất!');
    console.log('\n📋 Đã áp dụng:');
    console.log('  • SUGAR & ICE cho tất cả món Cà phê và Trà');
    console.log('  • Topping (Bánh flan, Thạch dừa) cho Cà phê, Trà, Đá xay');
    console.log('  • Giá đặc biệt: Flan Size L = 9,000đ (Cà phê sữa đá)');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed thất bại:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy seed
seed().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

