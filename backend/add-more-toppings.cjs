// Script để thêm nhiều loại topping cho quán cà phê
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'coffee_shop',
});

async function addToppings() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🍰 Thêm các loại topping mới...\n');
    
    // Danh sách các topping cần thêm
    const newToppings = [
      { ma: 'TOPPING_FLAN', ten: 'Bánh flan', don_vi: 'viên', gia: 8000 }, // Đã có, nhưng đảm bảo tồn tại
      { ma: 'TOPPING_THACH', ten: 'Thạch dừa', don_vi: 'vá', gia: 3000 }, // Đã có
      { ma: 'TOPPING_TRAN_CHAU', ten: 'Trân châu', don_vi: 'phần', gia: 5000 },
      { ma: 'TOPPING_THACH_RAU_CAU', ten: 'Thạch rau câu', don_vi: 'vá', gia: 4000 },
      { ma: 'TOPPING_PUDDING', ten: 'Pudding', don_vi: 'viên', gia: 7000 },
      { ma: 'TOPPING_KEM_TUOI', ten: 'Kem tươi', don_vi: 'phần', gia: 6000 },
      { ma: 'TOPPING_SIRO', ten: 'Siro (caramel/vanilla)', don_vi: 'phần', gia: 3000 },
      { ma: 'TOPPING_HAT_SEN', ten: 'Hạt sen', don_vi: 'phần', gia: 5000 },
      { ma: 'TOPPING_DAU_DO', ten: 'Đậu đỏ', don_vi: 'phần', gia: 5000 },
      { ma: 'TOPPING_KHOAI_MON', ten: 'Khoai môn', don_vi: 'phần', gia: 6000 },
      { ma: 'TOPPING_MATCHA_POWDER', ten: 'Bột matcha', don_vi: 'phần', gia: 4000 },
      { ma: 'TOPPING_CARAMEL_SAUCE', ten: 'Sốt caramel', don_vi: 'phần', gia: 3000 },
      { ma: 'TOPPING_WHIPPED_CREAM', ten: 'Kem whipping', don_vi: 'phần', gia: 5000 },
      { ma: 'TOPPING_COCOA_POWDER', ten: 'Bột cacao', don_vi: 'phần', gia: 3000 },
      { ma: 'TOPPING_CINNAMON', ten: 'Bột quế', don_vi: 'phần', gia: 2000 },
      { ma: 'TOPPING_CHOCOLATE_CHIPS', ten: 'Socola chip', don_vi: 'phần', gia: 5000 },
      { ma: 'TOPPING_COCONUT_FLAKES', ten: 'Dừa sợi', don_vi: 'phần', gia: 4000 },
      { ma: 'TOPPING_ALMOND_SLICES', ten: 'Hạnh nhân lát', don_vi: 'phần', gia: 6000 },
      { ma: 'TOPPING_WHITE_PEARL', ten: 'Trân châu trắng', don_vi: 'phần', gia: 5000 },
      { ma: 'TOPPING_GRASS_JELLY', ten: 'Thạch sương sáo', don_vi: 'vá', gia: 4000 },
    ];
    
    let addedCount = 0;
    let updatedCount = 0;
    
    for (const topping of newToppings) {
      // Kiểm tra xem topping đã tồn tại chưa
      const { rows: existing } = await client.query(`
        SELECT id, gia_mac_dinh FROM tuy_chon_mon WHERE ma = $1
      `, [topping.ma]);
      
      if (existing.length > 0) {
        // Cập nhật giá nếu khác
        if (existing[0].gia_mac_dinh !== topping.gia) {
          await client.query(`
            UPDATE tuy_chon_mon 
            SET gia_mac_dinh = $1, don_vi = $2
            WHERE ma = $3
          `, [topping.gia, topping.don_vi, topping.ma]);
          console.log(`  🔄 Đã cập nhật "${topping.ten}" - ${topping.gia.toLocaleString('vi-VN')}đ/${topping.don_vi}`);
          updatedCount++;
        } else {
          console.log(`  ⏭️  "${topping.ten}" đã tồn tại`);
        }
      } else {
        // Thêm mới
        await client.query(`
          INSERT INTO tuy_chon_mon (ma, ten, don_vi, loai, gia_mac_dinh)
          VALUES ($1, $2, $3, 'AMOUNT', $4)
        `, [topping.ma, topping.ten, topping.don_vi, topping.gia]);
        console.log(`  ✅ Đã thêm "${topping.ten}" - ${topping.gia.toLocaleString('vi-VN')}đ/${topping.don_vi}`);
        addedCount++;
      }
    }
    
    console.log(`\n📊 Tóm tắt:`);
    console.log(`   - Đã thêm: ${addedCount} topping mới`);
    console.log(`   - Đã cập nhật: ${updatedCount} topping`);
    
    // Áp dụng tất cả toppings cho tất cả món đồ uống
    console.log(`\n🔗 Áp dụng toppings cho các món đồ uống...\n`);
    
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
    
    const { rows: allToppings } = await client.query(`
      SELECT id, ma, ten FROM tuy_chon_mon WHERE loai = 'AMOUNT'
    `);
    
    let appliedCount = 0;
    
    for (const item of drinkItems) {
      for (const topping of allToppings) {
        // Kiểm tra xem đã áp dụng chưa
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
          appliedCount++;
        }
      }
    }
    
    console.log(`   ✅ Đã áp dụng ${appliedCount} lần toppings cho ${drinkItems.length} món đồ uống`);
    
    await client.query('COMMIT');
    
    console.log(`\n✅ Hoàn thành!`);
    console.log(`   - Tổng cộng: ${newToppings.length} loại topping`);
    console.log(`   - Đã áp dụng cho: ${drinkItems.length} món đồ uống`);
    
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
addToppings()
  .then(() => {
    console.log('\n✅ Script hoàn thành!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script thất bại:', error);
    process.exit(1);
  });

