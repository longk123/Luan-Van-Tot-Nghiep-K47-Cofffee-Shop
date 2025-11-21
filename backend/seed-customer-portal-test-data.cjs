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
      { ten: 'Cà Phê Đen', ma: 'CF-DEN', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 15000, mo_ta: 'Cà phê đen đậm đà', thu_tu: 1 },
      { ten: 'Cà Phê Sữa', ma: 'CF-SUA', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 20000, mo_ta: 'Cà phê sữa đá truyền thống', thu_tu: 2 },
      { ten: 'Cà Phê Sữa Đá', ma: 'CF-SUA-DA', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 25000, mo_ta: 'Cà phê sữa đá mát lạnh', thu_tu: 3 },
      { ten: 'Americano', ma: 'AMERICANO', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 35000, mo_ta: 'Espresso pha loãng với nước nóng', thu_tu: 4 },
      { ten: 'Cappuccino', ma: 'CAPPUCCINO', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 45000, mo_ta: 'Espresso với sữa và bọt sữa', thu_tu: 5 },
      { ten: 'Latte', ma: 'LATTE', loai_id: categoryIds['Cà Phê'], gia_mac_dinh: 50000, mo_ta: 'Espresso với nhiều sữa', thu_tu: 6 },
      
      // Trà
      { ten: 'Trà Đen', ma: 'TRA-DEN', loai_id: categoryIds['Trà'], gia_mac_dinh: 15000, mo_ta: 'Trà đen thơm ngon', thu_tu: 1 },
      { ten: 'Trà Sữa', ma: 'TRA-SUA', loai_id: categoryIds['Trà'], gia_mac_dinh: 30000, mo_ta: 'Trà sữa thơm ngon', thu_tu: 2 },
      { ten: 'Trà Sữa Thái Xanh', ma: 'TRA-SUA-THAI', loai_id: categoryIds['Trà'], gia_mac_dinh: 35000, mo_ta: 'Trà sữa Thái xanh đặc biệt', thu_tu: 3 },
      { ten: 'Trà Đào', ma: 'TRA-DAO', loai_id: categoryIds['Trà'], gia_mac_dinh: 32000, mo_ta: 'Trà đào mát lạnh', thu_tu: 4 },
      
      // Nước Ép
      { ten: 'Nước Ép Cam', ma: 'EP-CAM', loai_id: categoryIds['Nước Ép'], gia_mac_dinh: 40000, mo_ta: 'Nước ép cam tươi', thu_tu: 1 },
      { ten: 'Nước Ép Dứa', ma: 'EP-DUA', loai_id: categoryIds['Nước Ép'], gia_mac_dinh: 35000, mo_ta: 'Nước ép dứa tươi', thu_tu: 2 },
      { ten: 'Nước Ép Cà Rốt', ma: 'EP-CAROT', loai_id: categoryIds['Nước Ép'], gia_mac_dinh: 30000, mo_ta: 'Nước ép cà rốt tươi', thu_tu: 3 },
      
      // Sinh Tố
      { ten: 'Sinh Tố Bơ', ma: 'ST-BO', loai_id: categoryIds['Sinh Tố'], gia_mac_dinh: 45000, mo_ta: 'Sinh tố bơ béo ngậy', thu_tu: 1 },
      { ten: 'Sinh Tố Dâu', ma: 'ST-DAU', loai_id: categoryIds['Sinh Tố'], gia_mac_dinh: 40000, mo_ta: 'Sinh tố dâu tươi', thu_tu: 2 },
      { ten: 'Sinh Tố Xoài', ma: 'ST-XOAI', loai_id: categoryIds['Sinh Tố'], gia_mac_dinh: 38000, mo_ta: 'Sinh tố xoài ngọt', thu_tu: 3 },
      
      // Bánh Ngọt
      { ten: 'Bánh Tiramisu', ma: 'BANH-TIRAMISU', loai_id: categoryIds['Bánh Ngọt'], gia_mac_dinh: 65000, mo_ta: 'Bánh tiramisu Ý', thu_tu: 1 },
      { ten: 'Bánh Chocolate', ma: 'BANH-CHOCO', loai_id: categoryIds['Bánh Ngọt'], gia_mac_dinh: 55000, mo_ta: 'Bánh chocolate đậm đà', thu_tu: 2 },
      { ten: 'Bánh Cheesecake', ma: 'BANH-CHEESE', loai_id: categoryIds['Bánh Ngọt'], gia_mac_dinh: 60000, mo_ta: 'Bánh cheesecake mềm mịn', thu_tu: 3 },
      
      // Đồ Ăn Nhẹ
      { ten: 'Sandwich Thịt Nguội', ma: 'SANDWICH', loai_id: categoryIds['Đồ Ăn Nhẹ'], gia_mac_dinh: 45000, mo_ta: 'Sandwich thịt nguội', thu_tu: 1 },
      { ten: 'Bánh Mì Pate', ma: 'BANH-MI', loai_id: categoryIds['Đồ Ăn Nhẹ'], gia_mac_dinh: 25000, mo_ta: 'Bánh mì pate truyền thống', thu_tu: 2 }
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

    // ==================== 8. SAMPLE ORDERS ====================
    console.log('\n📝 8. Tạo đơn hàng mẫu...');
    
    // Lấy một nhân viên và ca làm để tạo đơn
    const staffResult = await client.query(`SELECT user_id FROM users LIMIT 1`);
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
    
    // Tạo đơn DELIVERY
    const deliveryOrderResult = await client.query(`
      INSERT INTO don_hang (nhan_vien_id, ca_lam_id, trang_thai, order_type, customer_account_id, opened_at)
      VALUES ($1, $2, 'OPEN', 'DELIVERY', $3, NOW() - INTERVAL '30 minutes')
      RETURNING id
    `, [staffId, shiftId, customerIds[1]]);
    const deliveryOrderId = deliveryOrderResult.rows[0].id;
    
    // Thêm delivery info
    await client.query(`
      INSERT INTO don_hang_delivery_info (
        order_id, delivery_address, delivery_phone, delivery_fee, 
        latitude, longitude, distance_km
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (order_id) DO NOTHING
    `, [
      deliveryOrderId, 
      '123 Đường 3/2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ', 
      '0912345678', 
      8000,
      10.0300,
      105.7700,
      1.5
    ]);
    
    // Thêm món vào đơn DELIVERY
    const deliveryItem = await client.query(`
      SELECT id FROM mon WHERE ma = 'TRA-SUA' LIMIT 1
    `);
    const deliveryVariant = await client.query(`
      SELECT id FROM mon_bien_the WHERE mon_id = $1 AND ten_bien_the = 'Size L' LIMIT 1
    `, [deliveryItem.rows[0].id]);
    
    if (deliveryItem.rows[0] && deliveryVariant.rows[0]) {
      await client.query(`
        INSERT INTO don_hang_chi_tiet (don_hang_id, mon_id, bien_the_id, so_luong, don_gia, trang_thai_che_bien)
        VALUES ($1, $2, $3, 1, 40000, 'QUEUED')
      `, [deliveryOrderId, deliveryItem.rows[0].id, deliveryVariant.rows[0].id]);
    }
    
    console.log(`   ✅ Đơn TAKEAWAY #${takeawayOrderId} (PAID)`);
    console.log(`   ✅ Đơn DELIVERY #${deliveryOrderId} (OPEN)`);

    // ==================== 9. RESERVATIONS ====================
    console.log('\n📝 9. Tạo đặt bàn mẫu...');
    
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
    console.log('\n📋 Thông tin đăng nhập:');
    console.log('   SĐT: 0987654321 | Email: customer1@test.com | Mật khẩu: customer123');
    console.log('   SĐT: 0912345678 | Email: customer2@test.com | Mật khẩu: customer123');
    console.log('   SĐT: 0901234567 | Email: customer3@test.com | Mật khẩu: customer123');
    console.log('\n🎯 Các tính năng có thể test:');
    console.log('   ✅ Xem menu và danh mục');
    console.log('   ✅ Xem chi tiết món (variants, options, toppings)');
    console.log('   ✅ Thêm vào giỏ hàng');
    console.log('   ✅ Đặt hàng (TAKEAWAY và DELIVERY)');
    console.log('   ✅ Áp dụng mã khuyến mãi');
    console.log('   ✅ Xem lịch sử đơn hàng');
    console.log('   ✅ Đặt bàn');
    console.log('   ✅ Đăng nhập/Đăng ký');
    
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

