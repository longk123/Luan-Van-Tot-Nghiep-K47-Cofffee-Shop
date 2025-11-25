// Script để nâng giá các món thấp và làm tròn giá
// Chạy: node backend/fix-low-prices-and-round.cjs

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

// Hàm làm tròn giá về số tròn (làm tròn đến 1000)
function roundPrice(price) {
  return Math.round(price / 1000) * 1000;
}

// Hàm nâng giá tối thiểu
function adjustMinimumPrice(price, minPrice = 20000) {
  if (price < minPrice) {
    return minPrice;
  }
  return price;
}

async function fixPrices() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔍 Đang kiểm tra và sửa giá...\n');
    
    // 1. Sửa giá mặc định của các món
    console.log('📝 1. Sửa giá mặc định (gia_mac_dinh)...');
    const { rows: items } = await client.query(`
      SELECT id, ten, gia_mac_dinh
      FROM mon
      WHERE active = TRUE
      ORDER BY id
    `);
    
    let updatedItems = 0;
    for (const item of items) {
      let newPrice = item.gia_mac_dinh;
      
      // Nâng giá tối thiểu lên 20.000đ
      newPrice = adjustMinimumPrice(newPrice, 20000);
      
      // Làm tròn về số tròn
      newPrice = roundPrice(newPrice);
      
      if (newPrice !== item.gia_mac_dinh) {
        await client.query(`
          UPDATE mon
          SET gia_mac_dinh = $1
          WHERE id = $2
        `, [newPrice, item.id]);
        
        console.log(`  ✅ "${item.ten}": ${item.gia_mac_dinh.toLocaleString('vi-VN')}đ → ${newPrice.toLocaleString('vi-VN')}đ`);
        updatedItems++;
      }
    }
    
    console.log(`\n   Đã cập nhật ${updatedItems} món\n`);
    
    // 2. Sửa giá của các variants
    console.log('📝 2. Sửa giá các variants (size)...');
    const { rows: variants } = await client.query(`
      SELECT 
        mbt.id,
        mbt.mon_id,
        m.ten AS mon_ten,
        mbt.ten_bien_the,
        mbt.gia,
        m.gia_mac_dinh
      FROM mon_bien_the mbt
      JOIN mon m ON m.id = mbt.mon_id
      WHERE mbt.active = TRUE AND m.active = TRUE
      ORDER BY mbt.mon_id, mbt.thu_tu
    `);
    
    let updatedVariants = 0;
    for (const variant of variants) {
      let newPrice = variant.gia;
      
      // Tính giá tối thiểu dựa trên size
      const variantName = variant.ten_bien_the.toLowerCase();
      let minPriceForSize = 20000;
      
      if (variantName.includes('size s') || variantName.includes(' s')) {
        minPriceForSize = 18000; // Size S tối thiểu 18.000đ
      } else if (variantName.includes('size m') || variantName.includes(' m')) {
        minPriceForSize = 20000; // Size M tối thiểu 20.000đ
      } else if (variantName.includes('size l') || variantName.includes(' l')) {
        minPriceForSize = 22000; // Size L tối thiểu 22.000đ
      }
      
      // Nâng giá tối thiểu
      newPrice = adjustMinimumPrice(newPrice, minPriceForSize);
      
      // Làm tròn về số tròn
      newPrice = roundPrice(newPrice);
      
      if (newPrice !== variant.gia) {
        await client.query(`
          UPDATE mon_bien_the
          SET gia = $1
          WHERE id = $2
        `, [newPrice, variant.id]);
        
        console.log(`  ✅ "${variant.mon_ten}" - ${variant.ten_bien_the}: ${variant.gia.toLocaleString('vi-VN')}đ → ${newPrice.toLocaleString('vi-VN')}đ`);
        updatedVariants++;
      }
    }
    
    console.log(`\n   Đã cập nhật ${updatedVariants} variants\n`);
    
    // 3. Đảm bảo giá variants hợp lý so với nhau (S < M < L)
    console.log('📝 3. Điều chỉnh giá variants để đảm bảo S < M < L...');
    const { rows: itemsWithVariants } = await client.query(`
      SELECT 
        m.id AS mon_id,
        m.ten AS mon_ten
      FROM mon m
      WHERE m.active = TRUE
        AND EXISTS (SELECT 1 FROM mon_bien_the WHERE mon_id = m.id AND active = TRUE)
      ORDER BY m.id
    `);
    
    let adjustedVariants = 0;
    for (const item of itemsWithVariants) {
      const { rows: itemVariants } = await client.query(`
        SELECT id, ten_bien_the, gia, thu_tu
        FROM mon_bien_the
        WHERE mon_id = $1 AND active = TRUE
        ORDER BY thu_tu, id
      `, [item.mon_id]);
      
      if (itemVariants.length >= 2) {
        // Sắp xếp theo tên để xác định S, M, L
        const sortedVariants = itemVariants.map(v => ({
          ...v,
          isS: v.ten_bien_the.toLowerCase().includes('size s') || v.ten_bien_the.toLowerCase().includes(' s'),
          isM: v.ten_bien_the.toLowerCase().includes('size m') || v.ten_bien_the.toLowerCase().includes(' m'),
          isL: v.ten_bien_the.toLowerCase().includes('size l') || v.ten_bien_the.toLowerCase().includes(' l')
        }));
        
        const sizeS = sortedVariants.find(v => v.isS);
        const sizeM = sortedVariants.find(v => v.isM);
        const sizeL = sortedVariants.find(v => v.isL);
        
        // Điều chỉnh giá để đảm bảo S < M < L
        if (sizeS && sizeM && sizeL) {
          let priceS = sizeS.gia;
          let priceM = sizeM.gia;
          let priceL = sizeL.gia;
          
          // Đảm bảo S < M < L với khoảng cách hợp lý
          if (priceS >= priceM) {
            priceM = roundPrice(priceS + 2000); // M cao hơn S ít nhất 2.000đ
          }
          if (priceM >= priceL) {
            priceL = roundPrice(priceM + 2000); // L cao hơn M ít nhất 2.000đ
          }
          
          // Cập nhật nếu có thay đổi
          if (priceS !== sizeS.gia) {
            await client.query(`UPDATE mon_bien_the SET gia = $1 WHERE id = $2`, [priceS, sizeS.id]);
            console.log(`  ✅ "${item.mon_ten}" - ${sizeS.ten_bien_the}: ${sizeS.gia.toLocaleString('vi-VN')}đ → ${priceS.toLocaleString('vi-VN')}đ`);
            adjustedVariants++;
          }
          if (priceM !== sizeM.gia) {
            await client.query(`UPDATE mon_bien_the SET gia = $1 WHERE id = $2`, [priceM, sizeM.id]);
            console.log(`  ✅ "${item.mon_ten}" - ${sizeM.ten_bien_the}: ${sizeM.gia.toLocaleString('vi-VN')}đ → ${priceM.toLocaleString('vi-VN')}đ`);
            adjustedVariants++;
          }
          if (priceL !== sizeL.gia) {
            await client.query(`UPDATE mon_bien_the SET gia = $1 WHERE id = $2`, [priceL, sizeL.id]);
            console.log(`  ✅ "${item.mon_ten}" - ${sizeL.ten_bien_the}: ${sizeL.gia.toLocaleString('vi-VN')}đ → ${priceL.toLocaleString('vi-VN')}đ`);
            adjustedVariants++;
          }
        } else if (sizeS && sizeM) {
          // Chỉ có S và M
          let priceS = sizeS.gia;
          let priceM = sizeM.gia;
          
          if (priceS >= priceM) {
            priceM = roundPrice(priceS + 2000);
            await client.query(`UPDATE mon_bien_the SET gia = $1 WHERE id = $2`, [priceM, sizeM.id]);
            console.log(`  ✅ "${item.mon_ten}" - ${sizeM.ten_bien_the}: ${sizeM.gia.toLocaleString('vi-VN')}đ → ${priceM.toLocaleString('vi-VN')}đ`);
            adjustedVariants++;
          }
        }
      }
    }
    
    console.log(`\n   Đã điều chỉnh ${adjustedVariants} variants để đảm bảo S < M < L\n`);
    
    await client.query('COMMIT');
    
    console.log(`✅ Hoàn thành!`);
    console.log(`   - Đã cập nhật ${updatedItems} món`);
    console.log(`   - Đã cập nhật ${updatedVariants} variants`);
    console.log(`   - Đã điều chỉnh ${adjustedVariants} variants để đảm bảo thứ tự giá`);
    
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
fixPrices()
  .then(() => {
    console.log('\n✅ Script hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script thất bại:', error);
    process.exit(1);
  });

