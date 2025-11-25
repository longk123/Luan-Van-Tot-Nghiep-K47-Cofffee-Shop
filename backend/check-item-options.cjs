// Script để kiểm tra options và toppings của món
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function checkItem() {
  try {
    // Tìm món "Nước Ép Cam"
    const { rows: items } = await pool.query(`
      SELECT m.id, m.ten, l.ten AS loai_ten
      FROM mon m
      LEFT JOIN loai_mon l ON l.id = m.loai_id
      WHERE m.ten ILIKE '%nước ép cam%' OR m.id = 82
      LIMIT 1
    `);
    
    if (items.length === 0) {
      console.log('❌ Không tìm thấy món');
      await pool.end();
      return;
    }
    
    const item = items[0];
    console.log(`\n📦 Món: ${item.ten} (ID: ${item.id})`);
    console.log(`📂 Loại: ${item.loai_ten}\n`);
    
    // Kiểm tra options
    const { rows: options } = await pool.query(`
      SELECT 
        tc.id,
        tc.ten,
        tc.ma,
        tc.loai,
        COUNT(tcm.id) AS so_muc
      FROM tuy_chon_mon tc
      JOIN mon_tuy_chon_ap_dung mtcad ON mtcad.tuy_chon_id = tc.id
      LEFT JOIN tuy_chon_muc tcm ON tcm.tuy_chon_id = tc.id
      WHERE mtcad.mon_id = $1
      GROUP BY tc.id, tc.ten, tc.ma, tc.loai
      ORDER BY tc.loai, tc.id
    `, [item.id]);
    
    console.log(`📋 Options (${options.length}):`);
    if (options.length === 0) {
      console.log('   ⚠️  Không có options!');
    } else {
      options.forEach(opt => {
        console.log(`   - ${opt.ten} (${opt.ma}) - Loại: ${opt.loai} - ${opt.so_muc} mức`);
      });
    }
    
    // Kiểm tra toppings
    const { rows: toppings } = await pool.query(`
      SELECT
        tc.id AS tuy_chon_id,
        tc.ma,
        tc.ten,
        tc.don_vi,
        tc.gia_mac_dinh
      FROM mon_tuy_chon_ap_dung m
      JOIN tuy_chon_mon tc ON tc.id=m.tuy_chon_id
      WHERE m.mon_id=$1 AND tc.loai='AMOUNT'
      ORDER BY tc.ma
    `, [item.id]);
    
    console.log(`\n🍰 Toppings (${toppings.length}):`);
    if (toppings.length === 0) {
      console.log('   ⚠️  Không có toppings!');
    } else {
      toppings.forEach(t => {
        console.log(`   - ${t.ten} (${t.ma}) - ${t.gia_mac_dinh?.toLocaleString('vi-VN')}đ/${t.don_vi || 'phần'}`);
      });
    }
    
    // Kiểm tra xem có áp dụng options cho tất cả món đồ uống không
    console.log(`\n🔍 Kiểm tra options cho tất cả món đồ uống...`);
    const { rows: drinkItems } = await pool.query(`
      SELECT m.id, m.ten, l.ten AS loai_ten
      FROM mon m
      LEFT JOIN loai_mon l ON l.id = m.loai_id
      WHERE m.active = TRUE
        AND (l.ten ILIKE '%cà phê%' 
          OR l.ten ILIKE '%trà%' 
          OR l.ten ILIKE '%nước ép%' 
          OR l.ten ILIKE '%sinh tố%' 
          OR l.ten ILIKE '%đá xay%')
      LIMIT 5
    `);
    
    console.log(`\n📊 Mẫu ${drinkItems.length} món đồ uống:`);
    for (const drink of drinkItems) {
      const { rows: drinkOpts } = await pool.query(`
        SELECT COUNT(*) as count
        FROM mon_tuy_chon_ap_dung
        WHERE mon_id = $1
      `, [drink.id]);
      
      console.log(`   - ${drink.ten}: ${drinkOpts[0].count} options`);
    }
    
  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    await pool.end();
  }
}

checkItem();

