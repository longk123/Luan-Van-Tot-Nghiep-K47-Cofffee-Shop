// Script để áp dụng options (mức đá, độ ngọt) và toppings cho tất cả món đồ uống
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function applyOptionsToppings() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Tìm các món đồ uống...\n');
    
    // Tìm tất cả món đồ uống
    const { rows: drinkItems } = await client.query(`
      SELECT m.id, m.ten, l.ten AS loai_ten
      FROM mon m
      LEFT JOIN loai_mon l ON l.id = m.loai_id
      WHERE m.active = TRUE
        AND (l.ten ILIKE '%cà phê%' 
          OR l.ten ILIKE '%trà%' 
          OR l.ten ILIKE '%nước ép%' 
          OR l.ten ILIKE '%sinh tố%' 
          OR l.ten ILIKE '%đá xay%'
          OR l.ten ILIKE '%đồ uống%')
      ORDER BY m.id
    `);
    
    console.log(`📊 Tìm thấy ${drinkItems.length} món đồ uống\n`);
    
    // Lấy ID của SUGAR và ICE options
    const { rows: sugarOpt } = await client.query(`
      SELECT id FROM tuy_chon_mon WHERE ma = 'SUGAR' LIMIT 1
    `);
    const { rows: iceOpt } = await client.query(`
      SELECT id FROM tuy_chon_mon WHERE ma = 'ICE' LIMIT 1
    `);
    
    if (!sugarOpt[0] || !iceOpt[0]) {
      console.log('❌ Không tìm thấy SUGAR hoặc ICE options!');
      await client.query('ROLLBACK');
      return;
    }
    
    const sugarId = sugarOpt[0].id;
    const iceId = iceOpt[0].id;
    
    console.log(`✅ SUGAR option ID: ${sugarId}`);
    console.log(`✅ ICE option ID: ${iceId}\n`);
    
    // Áp dụng SUGAR và ICE cho tất cả món đồ uống
    let addedSugar = 0;
    let addedIce = 0;
    
    for (const item of drinkItems) {
      // Kiểm tra xem đã có SUGAR chưa
      const { rows: existingSugar } = await client.query(`
        SELECT mon_id FROM mon_tuy_chon_ap_dung 
        WHERE mon_id = $1 AND tuy_chon_id = $2
      `, [item.id, sugarId]);
      
      if (existingSugar.length === 0) {
        await client.query(`
          INSERT INTO mon_tuy_chon_ap_dung (mon_id, tuy_chon_id)
          VALUES ($1, $2)
          ON CONFLICT (mon_id, tuy_chon_id) DO NOTHING
        `, [item.id, sugarId]);
        console.log(`  ✅ Đã thêm SUGAR cho "${item.ten}"`);
        addedSugar++;
      }
      
      // Kiểm tra xem đã có ICE chưa
      const { rows: existingIce } = await client.query(`
        SELECT mon_id FROM mon_tuy_chon_ap_dung 
        WHERE mon_id = $1 AND tuy_chon_id = $2
      `, [item.id, iceId]);
      
      if (existingIce.length === 0) {
        await client.query(`
          INSERT INTO mon_tuy_chon_ap_dung (mon_id, tuy_chon_id)
          VALUES ($1, $2)
          ON CONFLICT (mon_id, tuy_chon_id) DO NOTHING
        `, [item.id, iceId]);
        console.log(`  ✅ Đã thêm ICE cho "${item.ten}"`);
        addedIce++;
      }
    }
    
    // Áp dụng toppings cho tất cả món đồ uống (trừ một số món không phù hợp)
    console.log(`\n🍰 Áp dụng toppings cho các món đồ uống...\n`);
    
    // Lấy danh sách toppings (AMOUNT type)
    const { rows: toppings } = await client.query(`
      SELECT id, ma, ten FROM tuy_chon_mon WHERE loai = 'AMOUNT'
    `);
    
    console.log(`📋 Tìm thấy ${toppings.length} loại toppings\n`);
    
    // Áp dụng toppings cho tất cả món đồ uống (có thể thêm toppings vào bất kỳ đồ uống nào)
    const itemsForToppings = drinkItems;
    
    console.log(`📊 Áp dụng toppings cho tất cả ${itemsForToppings.length} món đồ uống\n`);
    
    let addedToppings = 0;
    
    for (const topping of toppings) {
      for (const item of itemsForToppings) {
        // Kiểm tra xem đã có topping này chưa
        const { rows: existing } = await client.query(`
          SELECT mon_id FROM mon_tuy_chon_ap_dung 
          WHERE mon_id = $1 AND tuy_chon_id = $2
        `, [item.id, topping.id]);
        
        if (existing.length === 0) {
          await client.query(`
            INSERT INTO mon_tuy_chon_ap_dung (mon_id, tuy_chon_id)
            VALUES ($1, $2)
            ON CONFLICT (mon_id, tuy_chon_id) DO NOTHING
          `, [item.id, topping.id]);
          console.log(`  ✅ Đã thêm "${topping.ten}" cho "${item.ten}"`);
          addedToppings++;
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Hoàn thành!`);
    console.log(`   - Đã thêm SUGAR: ${addedSugar} món`);
    console.log(`   - Đã thêm ICE: ${addedIce} món`);
    console.log(`   - Đã thêm toppings: ${addedToppings} lần`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Chạy script
applyOptionsToppings()
  .then(() => {
    console.log('\n✅ Script hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script thất bại:', error);
    process.exit(1);
  });

