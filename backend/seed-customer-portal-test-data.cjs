// Seed Customer Portal Test Data
// Tạo dữ liệu mẫu để test tất cả các tính năng của Customer Portal
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'coffee_shop',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Bắt đầu tạo dữ liệu mẫu cho Customer Portal...\n');
    await client.query('BEGIN');

    // ==================== 1. CUSTOMER ACCOUNTS ====================
    console.log('📝 1. Tạo tài khoản khách hàng mẫu...');
    
    const passwordHash = await bcrypt.hash('customer123', 10);
    
    // Xóa dữ liệu cũ (nếu có)
    await client.query(`DELETE FROM customer_accounts WHERE phone IN ('0987654321', '0912345678', '0901234567')`);
    
    const customers = [
      {
        phone: '0987654321',
        email: 'customer1@test.com',
        full_name: 'Nguyễn Văn A',
        password_hash: passwordHash
      },
      {
        phone: '0912345678',
        email: 'customer2@test.com',
        full_name: 'Trần Thị B',
        password_hash: passwordHash
      },
      {
        phone: '0901234567',
        email: 'customer3@test.com',
        full_name: 'Lê Văn C',
        password_hash: passwordHash
      }
    ];

    const customerIds = [];
    for (const customer of customers) {
      const result = await client.query(`
        INSERT INTO customer_accounts (phone, email, password_hash, full_name, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (phone) DO UPDATE SET
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name
        RETURNING id
      `, [customer.phone, customer.email, customer.password_hash, customer.full_name]);
      customerIds.push(result.rows[0].id);
      console.log(`   ✅ Tài khoản: ${customer.full_name} (${customer.phone})`);
    }

    // ==================== 2. CATEGORIES (LOAI_MON) ====================
    console.log('\n📝 2. Tạo danh mục món...');
    
    const categories = [
      { ten: 'Cà Phê', mo_ta: 'Các loại cà phê truyền thống và hiện đại', thu_tu: 1 },
      { ten: 'Trà', mo_ta: 'Trà đen, trà xanh, trà sữa', thu_tu: 2 },
      { ten: 'Nước Ép', mo_ta: 'Nước ép trái cây tươi', thu_tu: 3 },
      { ten: 'Sinh Tố', mo_ta: 'Sinh tố các loại', thu_tu: 4 },
      { ten: 'Bánh Ngọt', mo_ta: 'Bánh kem, bánh ngọt', thu_tu: 5 },
      { ten: 'Đồ Ăn Nhẹ', mo_ta: 'Sandwich, bánh mì, snack', thu_tu: 6 }
    ];

    const categoryIds = {};
    for (const cat of categories) {
      const result = await client.query(`
        INSERT INTO loai_mon (ten, mo_ta, thu_tu, active)
        VALUES ($1, $2, $3, TRUE)
        ON CONFLICT (ten) DO UPDATE SET mo_ta = EXCLUDED.mo_ta, thu_tu = EXCLUDED.thu_tu
        RETURNING id
      `, [cat.ten, cat.mo_ta, cat.thu_tu]);
      categoryIds[cat.ten] = result.rows[0].id;
      console.log(`   ✅ Danh mục: ${cat.ten}`);
    }

    // ==================== 3. MENU ITEMS (MON) ====================
    console.log('\n📝 3. Tạo món ăn...');
    
    const menuItems = [
      // Cà Phê
      { ten: 'Cà Phê Đen', ma: 'CF-DEN', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 15000, mo_ta: 'Cà phê đen đậm đà được pha từ hạt cà phê rang xay nguyên chất. Vị đắng thanh, hương thơm nồng nàn đặc trưng của cà phê Việt Nam. Thích hợp cho những ai yêu thích vị cà phê thuần túy, không pha trộn.', thu_tu: 1 },
      { ten: 'Cà Phê Sữa', ma: 'CF-SUA', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 20000, mo_ta: 'Cà phê sữa đá truyền thống Việt Nam với sữa đặc có đường. Sự kết hợp hoàn hảo giữa vị đắng của cà phê và vị ngọt béo của sữa, tạo nên một thức uống đậm đà, thơm ngon khó cưỡng.', thu_tu: 2 },
      { ten: 'Cà Phê Sữa Đá', ma: 'CF-SUA-DA', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 25000, mo_ta: 'Cà phê sữa đá mát lạnh, giải nhiệt hoàn hảo cho những ngày nắng nóng. Cà phê đậm đà hòa quyện với sữa đặc ngọt ngào, thêm đá viên mát lạnh tạo cảm giác sảng khoái, tươi mới.', thu_tu: 3 },
      { ten: 'Americano', ma: 'AMERICANO', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 35000, mo_ta: 'Espresso pha loãng với nước nóng, tạo nên một ly cà phê đậm đà nhưng nhẹ nhàng hơn. Vị cà phê thuần túy, không đường, không sữa, phù hợp cho những ai muốn thưởng thức hương vị nguyên bản của cà phê.', thu_tu: 4 },
      { ten: 'Cappuccino', ma: 'CAPPUCCINO', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 45000, mo_ta: 'Espresso với sữa nóng và bọt sữa mịn màng. Tỷ lệ hoàn hảo 1/3 espresso, 1/3 sữa nóng, 1/3 bọt sữa tạo nên một thức uống cân bằng, thơm ngon. Thường được trang trí với bột cacao hoặc quế.', thu_tu: 5 },
      { ten: 'Latte', ma: 'LATTE', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 50000, mo_ta: 'Espresso với nhiều sữa nóng, tạo nên một thức uống mềm mại, ngọt ngào. Vị cà phê nhẹ nhàng, hòa quyện với sữa béo ngậy. Thích hợp cho những ai mới bắt đầu uống cà phê hoặc thích vị ngọt dịu.', thu_tu: 6 },
      
      // Trà
      { ten: 'Trà Đen', ma: 'TRA-DEN', loai_id: categoryIds['Trà'], gia_mac_dinh: 15000, mo_ta: 'Trà đen thơm ngon được ủ từ lá trà chất lượng cao. Vị chát nhẹ, hương thơm tự nhiên, giúp tỉnh táo và thư giãn. Có thể uống nóng hoặc lạnh tùy sở thích.', thu_tu: 1 },
      { ten: 'Trà Sữa', ma: 'TRA-SUA', loai_id: categoryIds['Trà'], gia_mac_dinh: 30000, mo_ta: 'Trà sữa thơm ngon với trà đen đậm đà kết hợp sữa tươi béo ngậy. Vị ngọt vừa phải, hương trà thơm lừng. Có thể thêm trân châu, thạch hoặc các loại topping khác để tăng thêm hương vị.', thu_tu: 2 },
      { ten: 'Trà Sữa Thái Xanh', ma: 'TRA-SUA-THAI', loai_id: categoryIds['Trà'], gia_mac_dinh: 35000, mo_ta: 'Trà sữa Thái xanh đặc biệt với hương vị độc đáo. Trà xanh thơm mát kết hợp với sữa ngọt ngào, tạo nên một thức uống giải nhiệt hoàn hảo. Vị thanh mát, ngọt dịu, rất được yêu thích.', thu_tu: 3 },
      { ten: 'Trà Đào', ma: 'TRA-DAO', loai_id: categoryIds['Trà'], gia_mac_dinh: 32000, mo_ta: 'Trà đào mát lạnh với hương vị đào tươi ngon. Trà đen đậm đà kết hợp với siro đào ngọt ngào, thêm đá viên mát lạnh. Vị thanh mát, ngọt dịu, rất thích hợp cho mùa hè.', thu_tu: 4 },
      
      // Nước Ép
      { ten: 'Nước Ép Cam', ma: 'EP-CAM', loai_id: categoryIds['Nước Ép'], gia_mac_dinh: 40000, mo_ta: 'Nước ép cam tươi nguyên chất, ép trực tiếp từ những quả cam chín mọng. Giàu vitamin C, giúp tăng cường sức đề kháng. Vị chua ngọt tự nhiên, thơm mát, rất tốt cho sức khỏe.', thu_tu: 1 },
      { ten: 'Nước Ép Dứa', ma: 'EP-DUA', loai_id: categoryIds['Nước Ép'], gia_mac_dinh: 35000, mo_ta: 'Nước ép dứa tươi ngon, ép từ những quả dứa chín vàng. Vị ngọt thanh, hương thơm đặc trưng. Giàu enzyme bromelain, tốt cho tiêu hóa. Thức uống giải nhiệt và bổ dưỡng.', thu_tu: 2 },
      { ten: 'Nước Ép Cà Rốt', ma: 'EP-CAROT', loai_id: categoryIds['Nước Ép'], gia_mac_dinh: 30000, mo_ta: 'Nước ép cà rốt tươi nguyên chất, giàu beta-carotene và vitamin A. Vị ngọt tự nhiên, màu cam đẹp mắt. Tốt cho mắt, da và hệ miễn dịch. Thức uống lành mạnh, bổ dưỡng.', thu_tu: 3 },
      
      // Sinh Tố
      { ten: 'Sinh Tố Bơ', ma: 'ST-BO', loai_id: categoryIds['Sinh Tố'], gia_mac_dinh: 45000, mo_ta: 'Sinh tố bơ béo ngậy, xay từ bơ chín mềm với sữa tươi và đá. Vị béo ngậy, mềm mịn, ngọt dịu. Giàu chất béo tốt và vitamin E. Thức uống bổ dưỡng, thích hợp cho bữa sáng hoặc bữa phụ.', thu_tu: 1 },
      { ten: 'Sinh Tố Dâu', ma: 'ST-DAU', loai_id: categoryIds['Sinh Tố'], gia_mac_dinh: 40000, mo_ta: 'Sinh tố dâu tươi ngon, xay từ dâu tây chín đỏ với sữa và đá. Vị chua ngọt tự nhiên, màu hồng đẹp mắt. Giàu vitamin C và chất chống oxy hóa. Thức uống tươi mát, bổ dưỡng.', thu_tu: 2 },
      { ten: 'Sinh Tố Xoài', ma: 'ST-XOAI', loai_id: categoryIds['Sinh Tố'], gia_mac_dinh: 38000, mo_ta: 'Sinh tố xoài ngọt ngào, xay từ xoài chín vàng với sữa tươi và đá. Vị ngọt đậm đà, hương thơm đặc trưng. Giàu vitamin A và C. Thức uống thơm ngon, giải nhiệt hoàn hảo.', thu_tu: 3 },
      
      // Bánh Ngọt
      { ten: 'Bánh Tiramisu', ma: 'BANH-TIRAMISU', loai_id: categoryIds['Bánh Ngọt'], gia_mac_dinh: 65000, mo_ta: 'Bánh tiramisu Ý cổ điển với lớp bánh quy ngâm cà phê, phủ kem mascarpone béo ngậy và bột cacao. Vị đắng nhẹ của cà phê hòa quyện với vị ngọt của kem, tạo nên một món tráng miệng tinh tế, sang trọng.', thu_tu: 1 },
      { ten: 'Bánh Chocolate', ma: 'BANH-CHOCO', loai_id: categoryIds['Bánh Ngọt'], gia_mac_dinh: 55000, mo_ta: 'Bánh chocolate đậm đà với lớp kem chocolate mềm mịn, bánh sponge mềm xốp. Vị ngọt đậm đà, hương chocolate thơm lừng. Thích hợp cho những ai yêu thích chocolate. Món tráng miệng hoàn hảo.', thu_tu: 2 },
      { ten: 'Bánh Cheesecake', ma: 'BANH-CHEESE', loai_id: categoryIds['Bánh Ngọt'], gia_mac_dinh: 60000, mo_ta: 'Bánh cheesecake mềm mịn với lớp kem phô mai béo ngậy, đế bánh bích quy giòn tan. Vị ngọt dịu, mềm mịn, tan chảy trong miệng. Có thể kèm theo sốt dâu, việt quất hoặc các loại trái cây khác.', thu_tu: 3 },
      
      // Đồ Ăn Nhẹ
      { ten: 'Sandwich Thịt Nguội', ma: 'SANDWICH', loai_id: categoryIds['Đồ Ăn Nhẹ'], gia_mac_dinh: 45000, mo_ta: 'Sandwich thịt nguội với bánh mì tươi, thịt nguội, phô mai, rau xanh và sốt đặc biệt. Đầy đủ dinh dưỡng, thơm ngon, tiện lợi. Thích hợp cho bữa sáng, bữa trưa hoặc bữa phụ nhanh gọn.', thu_tu: 1 },
      { ten: 'Bánh Mì Pate', ma: 'BANH-MI', loai_id: categoryIds['Đồ Ăn Nhẹ'], gia_mac_dinh: 25000, mo_ta: 'Bánh mì pate truyền thống Việt Nam với bánh mì giòn tan, pate béo ngậy, thịt nguội, chả lụa, rau củ tươi và sốt đặc biệt. Hương vị đậm đà, quen thuộc, là món ăn sáng yêu thích của người Việt.', thu_tu: 2 }
    ];

    const menuItemIds = {};
    for (const item of menuItems) {
      const result = await client.query(`
        INSERT INTO mon (ten, ma, loai_id, gia_mac_dinh, mo_ta, thu_tu, active)
        VALUES ($1, $2, $3, $4, $5, $6, TRUE)
        ON CONFLICT (ma) DO UPDATE SET
          ten = EXCLUDED.ten,
          loai_id = EXCLUDED.loai_id,
          gia_mac_dinh = EXCLUDED.gia_mac_dinh,
          mo_ta = EXCLUDED.mo_ta,
          thu_tu = EXCLUDED.thu_tu
        RETURNING id
      `, [item.ten, item.ma, item.loai_id, item.gia_mac_dinh, item.mo_ta, item.thu_tu]);
      menuItemIds[item.ma] = result.rows[0].id;
      console.log(`   ✅ Món: ${item.ten} (${item.ma})`);
    }

    // ==================== 4. VARIANTS (MON_BIEN_THE) ====================
    console.log('\n📝 4. Tạo biến thể (Size)...');
    
    const variants = [
      // Cà phê có size
      { mon_ma: 'CF-SUA-DA', ten_bien_the: 'Size S', gia: 25000, thu_tu: 1 },
      { mon_ma: 'CF-SUA-DA', ten_bien_the: 'Size M', gia: 30000, thu_tu: 2 },
      { mon_ma: 'CF-SUA-DA', ten_bien_the: 'Size L', gia: 35000, thu_tu: 3 },
      
      { mon_ma: 'AMERICANO', ten_bien_the: 'Size S', gia: 35000, thu_tu: 1 },
      { mon_ma: 'AMERICANO', ten_bien_the: 'Size M', gia: 40000, thu_tu: 2 },
      { mon_ma: 'AMERICANO', ten_bien_the: 'Size L', gia: 45000, thu_tu: 3 },
      
      { mon_ma: 'CAPPUCCINO', ten_bien_the: 'Size S', gia: 45000, thu_tu: 1 },
      { mon_ma: 'CAPPUCCINO', ten_bien_the: 'Size M', gia: 50000, thu_tu: 2 },
      { mon_ma: 'CAPPUCCINO', ten_bien_the: 'Size L', gia: 55000, thu_tu: 3 },
      
      { mon_ma: 'LATTE', ten_bien_the: 'Size S', gia: 50000, thu_tu: 1 },
      { mon_ma: 'LATTE', ten_bien_the: 'Size M', gia: 55000, thu_tu: 2 },
      { mon_ma: 'LATTE', ten_bien_the: 'Size L', gia: 60000, thu_tu: 3 },
      
      // Trà sữa có size
      { mon_ma: 'TRA-SUA', ten_bien_the: 'Size S', gia: 30000, thu_tu: 1 },
      { mon_ma: 'TRA-SUA', ten_bien_the: 'Size M', gia: 35000, thu_tu: 2 },
      { mon_ma: 'TRA-SUA', ten_bien_the: 'Size L', gia: 40000, thu_tu: 3 },
      
      { mon_ma: 'TRA-SUA-THAI', ten_bien_the: 'Size S', gia: 35000, thu_tu: 1 },
      { mon_ma: 'TRA-SUA-THAI', ten_bien_the: 'Size M', gia: 40000, thu_tu: 2 },
      { mon_ma: 'TRA-SUA-THAI', ten_bien_the: 'Size L', gia: 45000, thu_tu: 3 }
    ];

    for (const variant of variants) {
      const monId = menuItemIds[variant.mon_ma];
      if (monId) {
        await client.query(`
          INSERT INTO mon_bien_the (mon_id, ten_bien_the, gia, thu_tu, active)
          VALUES ($1, $2, $3, $4, TRUE)
          ON CONFLICT DO NOTHING
        `, [monId, variant.ten_bien_the, variant.gia, variant.thu_tu]);
        console.log(`   ✅ Biến thể: ${variant.mon_ma} - ${variant.ten_bien_the}`);
      }
    }

    // ==================== 5. OPTIONS (TUY_CHON_MON) ====================
    console.log('\n📝 5. Tạo tùy chọn (Đường, Đá)...');
    
    // Kiểm tra xem options đã có chưa
    const existingOptions = await client.query(`
      SELECT id, ma FROM tuy_chon_mon WHERE ma IN ('SUGAR', 'ICE')
    `);
    
    let sugarOptionId, iceOptionId;
    
    if (existingOptions.rows.length === 0) {
      // Tạo SUGAR option
      const sugarResult = await client.query(`
        INSERT INTO tuy_chon_mon (ten, ma, loai, don_vi, gia_mac_dinh)
        VALUES ('Độ ngọt', 'SUGAR', 'PERCENT', '%', 0)
        RETURNING id
      `);
      sugarOptionId = sugarResult.rows[0].id;
      
      // Tạo ICE option
      const iceResult = await client.query(`
        INSERT INTO tuy_chon_mon (ten, ma, loai, don_vi, gia_mac_dinh)
        VALUES ('Mức đá', 'ICE', 'PERCENT', '%', 0)
        RETURNING id
      `);
      iceOptionId = iceResult.rows[0].id;
      
      // Tạo các mức cho SUGAR
      const sugarLevels = [
        { ten: 'Không đường', thu_tu: 1, gia_tri: 0 },
        { ten: 'Ít đường (30%)', thu_tu: 2, gia_tri: 0.3 },
        { ten: 'Vừa (50%)', thu_tu: 3, gia_tri: 0.5 },
        { ten: 'Nhiều (70%)', thu_tu: 4, gia_tri: 0.7 },
        { ten: 'Rất ngọt (100%)', thu_tu: 5, gia_tri: 1.0 }
      ];
      
      for (const level of sugarLevels) {
        await client.query(`
          INSERT INTO tuy_chon_muc (tuy_chon_id, ten, thu_tu, gia_tri)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [sugarOptionId, level.ten, level.thu_tu, level.gia_tri]);
      }
      
      // Tạo các mức cho ICE
      const iceLevels = [
        { ten: 'Không đá', thu_tu: 1, gia_tri: 0 },
        { ten: 'Ít đá (30%)', thu_tu: 2, gia_tri: 0.3 },
        { ten: 'Vừa (50%)', thu_tu: 3, gia_tri: 0.5 },
        { ten: 'Nhiều đá (70%)', thu_tu: 4, gia_tri: 0.7 },
        { ten: 'Rất nhiều đá (100%)', thu_tu: 5, gia_tri: 1.0 }
      ];
      
      for (const level of iceLevels) {
        await client.query(`
          INSERT INTO tuy_chon_muc (tuy_chon_id, ten, thu_tu, gia_tri)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT DO NOTHING
        `, [iceOptionId, level.ten, level.thu_tu, level.gia_tri]);
      }
      
      console.log(`   ✅ Tùy chọn: Đường (SUGAR) và Đá (ICE) đã được tạo`);
    } else {
      sugarOptionId = existingOptions.rows.find(r => r.ma === 'SUGAR')?.id;
      iceOptionId = existingOptions.rows.find(r => r.ma === 'ICE')?.id;
      console.log(`   ✅ Tùy chọn: Đường và Đá đã tồn tại`);
    }
    
    // Áp dụng options cho các món cà phê và trà
    const itemsWithOptions = ['CF-SUA-DA', 'AMERICANO', 'CAPPUCCINO', 'LATTE', 'TRA-SUA', 'TRA-SUA-THAI', 'TRA-DAO'];
    for (const itemMa of itemsWithOptions) {
      const monId = menuItemIds[itemMa];
      if (monId && sugarOptionId) {
        await client.query(`
          INSERT INTO mon_tuy_chon_ap_dung (mon_id, tuy_chon_id)
          VALUES ($1, $2), ($1, $3)
          ON CONFLICT DO NOTHING
        `, [monId, sugarOptionId, iceOptionId]);
      }
    }
    console.log(`   ✅ Đã áp dụng tùy chọn cho ${itemsWithOptions.length} món`);

    // ==================== 6. TOPPINGS ====================
    console.log('\n📝 6. Tạo topping...');
    
    const existingToppings = await client.query(`
      SELECT id, ma FROM tuy_chon_mon WHERE ma IN ('TOPPING_FLAN', 'TOPPING_THACH')
    `);
    
    let flanToppingId, thachToppingId;
    
    if (existingToppings.rows.length === 0) {
      const flanResult = await client.query(`
        INSERT INTO tuy_chon_mon (ten, ma, loai, don_vi, gia_mac_dinh)
        VALUES ('Bánh flan', 'TOPPING_FLAN', 'AMOUNT', 'viên', 8000)
        RETURNING id
      `);
      flanToppingId = flanResult.rows[0].id;
      
      const thachResult = await client.query(`
        INSERT INTO tuy_chon_mon (ten, ma, loai, don_vi, gia_mac_dinh)
        VALUES ('Thạch dừa', 'TOPPING_THACH', 'AMOUNT', 'vá', 3000)
        RETURNING id
      `);
      thachToppingId = thachResult.rows[0].id;
      
      console.log(`   ✅ Topping: Bánh flan (8,000đ/viên) và Thạch dừa (3,000đ/vá)`);
    } else {
      flanToppingId = existingToppings.rows.find(r => r.ma === 'TOPPING_FLAN')?.id;
      thachToppingId = existingToppings.rows.find(r => r.ma === 'TOPPING_THACH')?.id;
      console.log(`   ✅ Topping đã tồn tại`);
    }

    // ==================== 7. PROMOTIONS (KHUYEN_MAI) ====================
    console.log('\n📝 7. Tạo khuyến mãi...');
    
    const promotions = [
      {
        ten: 'Giảm 20% cho đơn đầu tiên',
        ma: 'FIRST20',
        loai: 'PERCENT',
        gia_tri: 20,
        mo_ta: 'Giảm 20% cho đơn hàng đầu tiên của khách hàng mới',
        bat_dau: new Date(),
        ket_thuc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
        active: true,
        dieu_kien: null
      },
      {
        ten: 'Giảm 50,000đ cho đơn trên 200,000đ',
        ma: 'DISCOUNT50K',
        loai: 'FIXED',
        gia_tri: 50000,
        mo_ta: 'Giảm 50,000đ khi mua trên 200,000đ',
        bat_dau: new Date(),
        ket_thuc: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 ngày
        active: true,
        dieu_kien: JSON.stringify({ min_order_value: 200000 })
      },
      {
        ten: 'Mua 2 tặng 1 - Trà sữa',
        ma: 'BUY2GET1',
        loai: 'BUY_X_GET_Y',
        gia_tri: 1, // Tặng 1
        mo_ta: 'Mua 2 ly trà sữa tặng 1 ly',
        bat_dau: new Date(),
        ket_thuc: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 ngày
        active: true,
        dieu_kien: JSON.stringify({ buy_quantity: 2, get_quantity: 1 })
      }
    ];

    for (const promo of promotions) {
      await client.query(`
        INSERT INTO khuyen_mai (
          ten, ma, loai, gia_tri, dieu_kien, mo_ta, bat_dau, ket_thuc, active, stackable, usage_limit
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NULL)
        ON CONFLICT (ma) DO UPDATE SET
          ten = EXCLUDED.ten,
          loai = EXCLUDED.loai,
          gia_tri = EXCLUDED.gia_tri,
          active = EXCLUDED.active,
          bat_dau = EXCLUDED.bat_dau,
          ket_thuc = EXCLUDED.ket_thuc
      `, [
        promo.ten, promo.ma, promo.loai, promo.gia_tri,
        promo.dieu_kien,
        promo.mo_ta, promo.bat_dau, promo.ket_thuc, promo.active
      ]);
      console.log(`   ✅ Khuyến mãi: ${promo.ten} (${promo.ma})`);
    }

    // ==================== 8. WAITER USERS ====================
    console.log('\n📝 8. Tạo nhân viên phục vụ mẫu...');
    
    // Lấy role WAITER
    const waiterRoleResult = await client.query(`SELECT role_id FROM roles WHERE role_name = 'WAITER' LIMIT 1`);
    let waiterRoleId = waiterRoleResult.rows[0]?.role_id;
    
    if (!waiterRoleId) {
      // Tạo role WAITER nếu chưa có
      const newRoleResult = await client.query(`
        INSERT INTO roles (role_name, description)
        VALUES ('WAITER', 'Nhân viên phục vụ và giao hàng')
        RETURNING role_id
      `);
      waiterRoleId = newRoleResult.rows[0].role_id;
    }
    
    const waiterPasswordHash = await bcrypt.hash('waiter123', 10);
    const waiters = [
      { username: 'waiter01', full_name: 'Nguyễn Văn Phục Vụ 1', phone: '0901111111' },
      { username: 'waiter02', full_name: 'Trần Thị Phục Vụ 2', phone: '0902222222' }
    ];
    
    const waiterIds = [];
    for (const waiter of waiters) {
      const waiterResult = await client.query(`
        INSERT INTO users (username, password_hash, full_name, phone, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        ON CONFLICT (username) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone
        RETURNING user_id
      `, [waiter.username, waiterPasswordHash, waiter.full_name, waiter.phone]);
      
      const waiterUserId = waiterResult.rows[0].user_id;
      waiterIds.push(waiterUserId);
      
      // Gán role WAITER
      await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `, [waiterUserId, waiterRoleId]);
      
      console.log(`   ✅ Nhân viên phục vụ: ${waiter.full_name} (${waiter.username})`);
    }

    // ==================== 9. SAMPLE ORDERS ====================
    console.log('\n📝 9. Tạo đơn hàng mẫu...');
    
    // Lấy một nhân viên và ca làm để tạo đơn
    const staffResult = await client.query(`SELECT user_id FROM users WHERE username != 'waiter01' AND username != 'waiter02' LIMIT 1`);
    const staffId = staffResult.rows[0]?.user_id || 1;
    
    // Tạo ca làm mẫu nếu chưa có
    const shiftResult = await client.query(`
      INSERT INTO ca_lam (nhan_vien_id, shift_type, started_at, status)
      VALUES ($1, 'CASHIER', NOW(), 'OPEN')
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [staffId]);
    
    let shiftId = shiftResult.rows[0]?.id;
    if (!shiftId) {
      const existingShift = await client.query(`
        SELECT id FROM ca_lam WHERE status = 'OPEN' AND shift_type = 'CASHIER' LIMIT 1
      `);
      shiftId = existingShift.rows[0]?.id;
    }

    // Tạo đơn TAKEAWAY
    const takeawayOrderResult = await client.query(`
      INSERT INTO don_hang (nhan_vien_id, ca_lam_id, trang_thai, order_type, customer_account_id, opened_at)
      VALUES ($1, $2, 'PAID', 'TAKEAWAY', $3, NOW() - INTERVAL '2 hours')
      RETURNING id
    `, [staffId, shiftId, customerIds[0]]);
    const takeawayOrderId = takeawayOrderResult.rows[0].id;
    
    // Thêm món vào đơn TAKEAWAY
    const takeawayItem = await client.query(`
      SELECT id FROM mon WHERE ma = 'CF-SUA-DA' LIMIT 1
    `);
    const takeawayVariant = await client.query(`
      SELECT id FROM mon_bien_the WHERE mon_id = $1 AND ten_bien_the = 'Size M' LIMIT 1
    `, [takeawayItem.rows[0].id]);
    
    if (takeawayItem.rows[0] && takeawayVariant.rows[0]) {
      await client.query(`
        INSERT INTO don_hang_chi_tiet (don_hang_id, mon_id, bien_the_id, so_luong, don_gia, trang_thai_che_bien)
        VALUES ($1, $2, $3, 2, 30000, 'DONE')
      `, [takeawayOrderId, takeawayItem.rows[0].id, takeawayVariant.rows[0].id]);
    }
    
    // Tạo đơn DELIVERY - Chờ phân công (PENDING)
    const deliveryOrder1Result = await client.query(`
      INSERT INTO don_hang (nhan_vien_id, ca_lam_id, trang_thai, order_type, customer_account_id, opened_at)
      VALUES ($1, $2, 'OPEN', 'DELIVERY', $3, NOW() - INTERVAL '30 minutes')
      RETURNING id
    `, [staffId, shiftId, customerIds[1]]);
    const deliveryOrder1Id = deliveryOrder1Result.rows[0].id;
    
    await client.query(`
      INSERT INTO don_hang_delivery_info (
        order_id, delivery_address, delivery_phone, delivery_fee, 
        latitude, longitude, distance_km, delivery_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
      ON CONFLICT (order_id) DO UPDATE SET delivery_status = 'PENDING'
    `, [
      deliveryOrder1Id, 
      '123 Đường 3/2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ', 
      '0912345678', 
      8000,
      10.0300,
      105.7700,
      1.5
    ]);
    
    const deliveryItem1 = await client.query(`SELECT id FROM mon WHERE ma = 'TRA-SUA' LIMIT 1`);
    const deliveryVariant1 = await client.query(`
      SELECT id FROM mon_bien_the WHERE mon_id = $1 AND ten_bien_the = 'Size L' LIMIT 1
    `, [deliveryItem1.rows[0].id]);
    
    if (deliveryItem1.rows[0] && deliveryVariant1.rows[0]) {
      await client.query(`
        INSERT INTO don_hang_chi_tiet (don_hang_id, mon_id, bien_the_id, so_luong, don_gia, trang_thai_che_bien)
        VALUES ($1, $2, $3, 1, 40000, 'DONE')
      `, [deliveryOrder1Id, deliveryItem1.rows[0].id, deliveryVariant1.rows[0].id]);
    }
    
    // Tạo đơn DELIVERY - Đã phân công (ASSIGNED)
    const deliveryOrder2Result = await client.query(`
      INSERT INTO don_hang (nhan_vien_id, ca_lam_id, trang_thai, order_type, customer_account_id, opened_at)
      VALUES ($1, $2, 'PAID', 'DELIVERY', $3, NOW() - INTERVAL '1 hour')
      RETURNING id
    `, [staffId, shiftId, customerIds[0]]);
    const deliveryOrder2Id = deliveryOrder2Result.rows[0].id;
    
    await client.query(`
      INSERT INTO don_hang_delivery_info (
        order_id, delivery_address, delivery_phone, delivery_fee, 
        latitude, longitude, distance_km, delivery_status, shipper_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'ASSIGNED', $8)
      ON CONFLICT (order_id) DO UPDATE SET 
        delivery_status = 'ASSIGNED',
        shipper_id = EXCLUDED.shipper_id
    `, [
      deliveryOrder2Id, 
      '456 Đường Nguyễn Văn Cừ, Phường An Khánh, Quận Ninh Kiều, TP. Cần Thơ', 
      '0987654321', 
      8000,
      10.0310,
      105.7710,
      1.2,
      waiterIds[0]
    ]);
    
    const deliveryItem2 = await client.query(`SELECT id FROM mon WHERE ma = 'CF-SUA-DA' LIMIT 1`);
    const deliveryVariant2 = await client.query(`
      SELECT id FROM mon_bien_the WHERE mon_id = $1 AND ten_bien_the = 'Size M' LIMIT 1
    `, [deliveryItem2.rows[0].id]);
    
    if (deliveryItem2.rows[0] && deliveryVariant2.rows[0]) {
      await client.query(`
        INSERT INTO don_hang_chi_tiet (don_hang_id, mon_id, bien_the_id, so_luong, don_gia, trang_thai_che_bien)
        VALUES ($1, $2, $3, 2, 30000, 'DONE')
      `, [deliveryOrder2Id, deliveryItem2.rows[0].id, deliveryVariant2.rows[0].id]);
    }
    
    // Tạo đơn DELIVERY - Đang giao hàng (OUT_FOR_DELIVERY)
    const deliveryOrder3Result = await client.query(`
      INSERT INTO don_hang (nhan_vien_id, ca_lam_id, trang_thai, order_type, customer_account_id, opened_at)
      VALUES ($1, $2, 'PAID', 'DELIVERY', $3, NOW() - INTERVAL '45 minutes')
      RETURNING id
    `, [staffId, shiftId, customerIds[2]]);
    const deliveryOrder3Id = deliveryOrder3Result.rows[0].id;
    
    await client.query(`
      INSERT INTO don_hang_delivery_info (
        order_id, delivery_address, delivery_phone, delivery_fee, 
        latitude, longitude, distance_km, delivery_status, shipper_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'OUT_FOR_DELIVERY', $8)
      ON CONFLICT (order_id) DO UPDATE SET 
        delivery_status = 'OUT_FOR_DELIVERY',
        shipper_id = EXCLUDED.shipper_id
    `, [
      deliveryOrder3Id, 
      '789 Đường Mậu Thân, Phường An Hòa, Quận Ninh Kiều, TP. Cần Thơ', 
      '0901234567', 
      8000,
      10.0320,
      105.7720,
      0.8,
      waiterIds[1]
    ]);
    
    const deliveryItem3 = await client.query(`SELECT id FROM mon WHERE ma = 'TRA-SUA-THAI' LIMIT 1`);
    const deliveryVariant3 = await client.query(`
      SELECT id FROM mon_bien_the WHERE mon_id = $1 AND ten_bien_the = 'Size M' LIMIT 1
    `, [deliveryItem3.rows[0].id]);
    
    if (deliveryItem3.rows[0] && deliveryVariant3.rows[0]) {
      await client.query(`
        INSERT INTO don_hang_chi_tiet (don_hang_id, mon_id, bien_the_id, so_luong, don_gia, trang_thai_che_bien)
        VALUES ($1, $2, $3, 1, 40000, 'DONE')
      `, [deliveryOrder3Id, deliveryItem3.rows[0].id, deliveryVariant3.rows[0].id]);
    }
    
    console.log(`   ✅ Đơn TAKEAWAY #${takeawayOrderId} (PAID)`);
    console.log(`   ✅ Đơn DELIVERY #${deliveryOrder1Id} (OPEN, PENDING - Chờ phân công)`);
    console.log(`   ✅ Đơn DELIVERY #${deliveryOrder2Id} (PAID, ASSIGNED - Đã phân công cho ${waiterIds[0]})`);
    console.log(`   ✅ Đơn DELIVERY #${deliveryOrder3Id} (PAID, OUT_FOR_DELIVERY - Đang giao bởi ${waiterIds[1]})`);

    // ==================== 10. RESERVATIONS ====================
    console.log('\n📝 10. Tạo đặt bàn mẫu...');
    
    // Lấy khu vực đầu tiên
    const areaResult = await client.query(`SELECT id FROM khu_vuc LIMIT 1`);
    const areaId = areaResult.rows[0]?.id;
    
    if (areaId) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0);
      
      await client.query(`
        INSERT INTO dat_ban (
          ten_khach, so_dien_thoai, so_nguoi, khu_vuc_id,
          start_at, end_at, trang_thai, nguon
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', 'CUSTOMER_PORTAL')
        ON CONFLICT DO NOTHING
      `, [
        'Nguyễn Văn A',
        '0987654321',
        4,
        areaId,
        tomorrow,
        new Date(tomorrow.getTime() + 90 * 60 * 1000) // +90 phút
      ]);
      console.log(`   ✅ Đặt bàn: Ngày mai 18:00, 4 người`);
    }

    await client.query('COMMIT');
    
    console.log('\n✅ Hoàn tất tạo dữ liệu mẫu!');
    console.log('\n📋 Thông tin đăng nhập KHÁCH HÀNG:');
    console.log('   SĐT: 0987654321 | Email: customer1@test.com | Mật khẩu: customer123');
    console.log('   SĐT: 0912345678 | Email: customer2@test.com | Mật khẩu: customer123');
    console.log('   SĐT: 0901234567 | Email: customer3@test.com | Mật khẩu: customer123');
    console.log('\n📋 Thông tin đăng nhập NHÂN VIÊN PHỤC VỤ:');
    console.log('   Username: waiter01 | Mật khẩu: waiter123');
    console.log('   Username: waiter02 | Mật khẩu: waiter123');
    console.log('\n🎯 Các tính năng có thể test:');
    console.log('\n📱 Customer Portal:');
    console.log('   ✅ Xem menu và danh mục');
    console.log('   ✅ Xem chi tiết món (variants, options, toppings)');
    console.log('   ✅ Thêm vào giỏ hàng');
    console.log('   ✅ Đặt hàng (TAKEAWAY và DELIVERY)');
    console.log('   ✅ Áp dụng mã khuyến mãi');
    console.log('   ✅ Xem lịch sử đơn hàng');
    console.log('   ✅ Đặt bàn');
    console.log('   ✅ Đăng nhập/Đăng ký');
    console.log('\n👨‍💼 POS/Manager:');
    console.log('   ✅ Xem đơn DELIVERY trong tab "Giao hàng"');
    console.log('   ✅ Phân công đơn cho nhân viên phục vụ');
    console.log('   ✅ Xem trạng thái giao hàng');
    console.log('\n🚚 Nhân viên phục vụ:');
    console.log('   ✅ Xem đơn được phân công');
    console.log('   ✅ Cập nhật trạng thái: Bắt đầu giao → Đã giao');
    console.log('   ✅ Filter đơn theo trạng thái');
    console.log('\n📊 Dữ liệu mẫu đã tạo:');
    console.log(`   ✅ ${customers.length} tài khoản khách hàng`);
    console.log(`   ✅ ${categories.length} danh mục món`);
    console.log(`   ✅ ${menuItems.length} món ăn`);
    console.log(`   ✅ ${variants.length} biến thể (Size)`);
    console.log(`   ✅ ${promotions.length} mã khuyến mãi`);
    console.log(`   ✅ ${waiterIds.length} nhân viên phục vụ`);
    console.log('   ✅ 1 đơn TAKEAWAY (PAID)');
    console.log('   ✅ 3 đơn DELIVERY với các trạng thái khác nhau:');
    console.log('      - PENDING (Chờ phân công)');
    console.log('      - ASSIGNED (Đã phân công)');
    console.log('      - OUT_FOR_DELIVERY (Đang giao hàng)');
    console.log('   ✅ 1 đặt bàn mẫu');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Lỗi:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);

