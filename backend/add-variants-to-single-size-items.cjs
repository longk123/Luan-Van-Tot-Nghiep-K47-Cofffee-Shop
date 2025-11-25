// Script để thêm size cho các món chỉ có 1 size
// Chạy: node backend/add-variants-to-single-size-items.cjs

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function addVariants() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Tìm các món chỉ có 1 size hoặc không có size...\n');
    
    // Tìm các món chỉ có 1 variant hoặc không có variant
    const { rows: itemsWithOneVariant } = await client.query(`
      SELECT 
        m.id AS mon_id,
        m.ten AS mon_ten,
        m.gia_mac_dinh,
        COUNT(mbt.id) AS variant_count,
        COALESCE(MIN(mbt.gia), m.gia_mac_dinh) AS current_price,
        COALESCE(MIN(mbt.ten_bien_the), 'Mặc định') AS current_variant_name
      FROM mon m
      LEFT JOIN mon_bien_the mbt ON mbt.mon_id = m.id AND mbt.active = TRUE
      WHERE m.active = TRUE
      GROUP BY m.id, m.ten, m.gia_mac_dinh
      HAVING COUNT(mbt.id) <= 1
      ORDER BY m.id
    `);
    
    console.log(`📊 Tìm thấy ${itemsWithOneVariant.length} món cần thêm size\n`);
    
    if (itemsWithOneVariant.length === 0) {
      console.log('✅ Tất cả món đã có đủ size!');
      await client.query('COMMIT');
      return;
    }
    
    let addedCount = 0;
    let skippedCount = 0;
    
    for (const item of itemsWithOneVariant) {
      const monId = item.mon_id;
      const currentPrice = item.current_price || item.gia_mac_dinh || 0;
      
      if (currentPrice <= 0) {
        console.log(`⏭️  Bỏ qua "${item.mon_ten}" (ID: ${monId}) - Không có giá`);
        skippedCount++;
        continue;
      }
      
      // Kiểm tra xem đã có bao nhiêu variants
      const { rows: existingVariants } = await client.query(`
        SELECT id, ten_bien_the, gia, thu_tu
        FROM mon_bien_the
        WHERE mon_id = $1 AND active = TRUE
        ORDER BY thu_tu, id
      `, [monId]);
      
      const existingVariantNames = existingVariants.map(v => v.ten_bien_the.toLowerCase());
      
      // Tính giá cho các size (S = 85%, M = 100%, L = 115%)
      const priceS = Math.round(currentPrice * 0.85);
      const priceM = Math.round(currentPrice * 1.00);
      const priceL = Math.round(currentPrice * 1.15);
      
      // Tạo các size mới
      const newVariants = [];
      
      // Size S
      if (!existingVariantNames.includes('size s') && !existingVariantNames.includes('s')) {
        newVariants.push({ name: 'Size S', price: priceS, thu_tu: 1 });
      }
      
      // Size M
      if (!existingVariantNames.includes('size m') && !existingVariantNames.includes('m')) {
        newVariants.push({ name: 'Size M', price: priceM, thu_tu: 2 });
      }
      
      // Size L
      if (!existingVariantNames.includes('size l') && !existingVariantNames.includes('l')) {
        newVariants.push({ name: 'Size L', price: priceL, thu_tu: 3 });
      }
      
      // Nếu đã có 1 variant, chỉ thêm 2 size còn lại
      if (existingVariants.length === 1) {
        // Xác định variant hiện tại là size nào
        const currentVariantName = existingVariants[0].ten_bien_the.toLowerCase();
        const currentVariantPrice = existingVariants[0].gia;
        
        // Nếu variant hiện tại có giá gần với M (100%), coi như là M
        if (Math.abs(currentVariantPrice - priceM) <= Math.abs(currentVariantPrice - priceS) && 
            Math.abs(currentVariantPrice - priceM) <= Math.abs(currentVariantPrice - priceL)) {
          // Variant hiện tại là M, thêm S và L
          newVariants.length = 0;
          if (!existingVariantNames.includes('size s') && !existingVariantNames.includes('s')) {
            newVariants.push({ name: 'Size S', price: priceS, thu_tu: 1 });
          }
          if (!existingVariantNames.includes('size l') && !existingVariantNames.includes('l')) {
            newVariants.push({ name: 'Size L', price: priceL, thu_tu: 3 });
          }
        } else if (Math.abs(currentVariantPrice - priceS) <= Math.abs(currentVariantPrice - priceL)) {
          // Variant hiện tại là S, thêm M và L
          newVariants.length = 0;
          if (!existingVariantNames.includes('size m') && !existingVariantNames.includes('m')) {
            newVariants.push({ name: 'Size M', price: priceM, thu_tu: 2 });
          }
          if (!existingVariantNames.includes('size l') && !existingVariantNames.includes('l')) {
            newVariants.push({ name: 'Size L', price: priceL, thu_tu: 3 });
          }
        } else {
          // Variant hiện tại là L, thêm S và M
          newVariants.length = 0;
          if (!existingVariantNames.includes('size s') && !existingVariantNames.includes('s')) {
            newVariants.push({ name: 'Size S', price: priceS, thu_tu: 1 });
          }
          if (!existingVariantNames.includes('size m') && !existingVariantNames.includes('m')) {
            newVariants.push({ name: 'Size M', price: priceM, thu_tu: 2 });
          }
        }
      }
      
      // Nếu không có variant nào, tạo cả 3 size
      if (existingVariants.length === 0) {
        newVariants.length = 0;
        newVariants.push(
          { name: 'Size S', price: priceS, thu_tu: 1 },
          { name: 'Size M', price: priceM, thu_tu: 2 },
          { name: 'Size L', price: priceL, thu_tu: 3 }
        );
      }
      
      // Thêm các variants mới vào database
      for (const variant of newVariants) {
        try {
          await client.query(`
            INSERT INTO mon_bien_the (mon_id, ten_bien_the, gia, thu_tu, active)
            VALUES ($1, $2, $3, $4, TRUE)
            ON CONFLICT (mon_id, ten_bien_the) DO NOTHING
          `, [monId, variant.name, variant.price, variant.thu_tu]);
          
          console.log(`  ✅ Đã thêm "${variant.name}" (${variant.price.toLocaleString('vi-VN')}đ) cho "${item.mon_ten}"`);
          addedCount++;
        } catch (error) {
          console.error(`  ❌ Lỗi khi thêm "${variant.name}" cho "${item.mon_ten}":`, error.message);
        }
      }
      
      if (newVariants.length === 0) {
        console.log(`  ⏭️  "${item.mon_ten}" (ID: ${monId}) - Đã có đủ size`);
        skippedCount++;
      }
    }
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Hoàn thành!`);
    console.log(`   - Đã thêm: ${addedCount} size mới`);
    console.log(`   - Đã bỏ qua: ${skippedCount} món`);
    
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
addVariants()
  .then(() => {
    console.log('\n✅ Script hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script thất bại:', error);
    process.exit(1);
  });

