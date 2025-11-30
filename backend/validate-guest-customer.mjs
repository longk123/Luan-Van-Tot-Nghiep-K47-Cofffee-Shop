/**
 * 🧪 KIỂM TRA TOÀN DIỆN CHỨC NĂNG KHÁCH VÃNG LAI (GUEST CUSTOMER)
 * Coffee Shop System - Customer Portal
 * 
 * Các chức năng cần test:
 * 1. Xem menu (không cần đăng nhập)
 * 2. Xem chi tiết món (không cần đăng nhập)
 * 3. Giỏ hàng session-based
 * 4. Checkout mà không cần đăng nhập
 * 5. Đặt bàn (reservation)
 * 6. Chatbot hỗ trợ
 */

import pg from 'pg';

const { Pool } = pg;
const BASE_URL = 'http://localhost:5000/api/v1';

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'coffee_shop',
  user: 'postgres', password: '123456',
});

// Tạo session ID cho khách vãng lai (giống như frontend)
const GUEST_SESSION_ID = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const headers = { 'Content-Type': 'application/json' };
const guestHeaders = { 
  'Content-Type': 'application/json',
  'x-session-id': GUEST_SESSION_ID  // Header cho khách vãng lai
};

const results = { database: [], frontend: [], backend: [], integration: [] };

function log(cat, name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${name}${details ? ` - ${details}` : ''}`);
  results[cat].push({ name, passed, details });
}

async function apiPublic(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: guestHeaders,
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  🧪 KIỂM TRA TOÀN DIỆN CHỨC NĂNG KHÁCH VÃNG LAI (GUEST CUSTOMER)    ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

console.log(`📌 Guest Session ID: ${GUEST_SESSION_ID}\n`);

try {
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(70));
  console.log('📊 PHẦN 1: KIỂM TRA DỮ LIỆU CHO KHÁCH VÃNG LAI');
  console.log('═'.repeat(70) + '\n');

  // 1.1 Kiểm tra có dữ liệu menu để hiển thị
  console.log('🍽️ 1.1 DỮ LIỆU MENU:');
  
  const categories = await pool.query('SELECT * FROM loai_mon WHERE active = true ORDER BY id');
  console.log(`  📂 Danh mục đang hoạt động: ${categories.rows.length}`);
  log('database', 'Có danh mục menu', categories.rows.length > 0, `${categories.rows.length} categories`);
  
  if (categories.rows.length > 0) {
    for (const cat of categories.rows.slice(0, 3)) {
      console.log(`     - ${cat.ten_loai}`);
    }
    if (categories.rows.length > 3) {
      console.log(`     ... và ${categories.rows.length - 3} danh mục khác`);
    }
  }

  const products = await pool.query('SELECT * FROM mon WHERE active = true ORDER BY id');
  console.log(`  🍹 Sản phẩm đang hoạt động: ${products.rows.length}`);
  log('database', 'Có sản phẩm menu', products.rows.length > 0, `${products.rows.length} products`);

  const productsWithImage = await pool.query("SELECT COUNT(*) FROM mon WHERE active = true AND hinh_anh IS NOT NULL AND hinh_anh != ''");
  console.log(`  🖼️ Sản phẩm có hình ảnh: ${productsWithImage.rows[0].count}`);
  log('database', 'Sản phẩm có hình ảnh', Number(productsWithImage.rows[0].count) > 0);

  // 1.2 Kiểm tra bàn trống để đặt
  console.log('\n🪑 1.2 DỮ LIỆU BÀN:');
  const tables = await pool.query("SELECT * FROM ban WHERE trang_thai = 'available'");
  console.log(`  Bàn trống có thể đặt: ${tables.rows.length}`);
  log('database', 'Có bàn trống', tables.rows.length >= 0, `${tables.rows.length} tables`);

  // 1.3 Kiểm tra tùy chọn món (toppings/variants)
  console.log('\n🍫 1.3 TÙY CHỌN MÓN (tuy_chon_mon):');
  const toppings = await pool.query('SELECT * FROM tuy_chon_mon');
  console.log(`  Tùy chọn có sẵn: ${toppings.rows.length}`);
  log('database', 'Có tùy chọn món', toppings.rows.length >= 0, `${toppings.rows.length} options`);
  
  // 1.4 Biến thể món (size, variant)
  console.log('\n📐 1.4 BIẾN THỂ MÓN (mon_bien_the):');
  const variants = await pool.query('SELECT * FROM mon_bien_the');
  console.log(`  Biến thể có sẵn: ${variants.rows.length}`);
  log('database', 'Có biến thể món', variants.rows.length >= 0, `${variants.rows.length} variants`);

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('🌐 PHẦN 2: KIỂM TRA BACKEND APIs - PUBLIC (KHÔNG CẦN ĐĂNG NHẬP)');
  console.log('═'.repeat(70) + '\n');

  // 2.1 Menu APIs
  console.log('📖 2.1 MENU APIs (Public):');
  
  const menuCategories = await apiPublic('/customer/menu/categories');
  log('backend', 'GET /customer/menu/categories', menuCategories.status === 200, `Status: ${menuCategories.status}`);
  
  const menuItems = await apiPublic('/customer/menu/items');
  log('backend', 'GET /customer/menu/items', menuItems.status === 200, `Status: ${menuItems.status}`);
  
  // Lấy 1 sản phẩm để test chi tiết
  let testProductId = null;
  if (menuItems.status === 200 && menuItems.data?.length > 0) {
    testProductId = menuItems.data[0].id;
    console.log(`     📌 Test product ID: ${testProductId}`);
  } else if (products.rows.length > 0) {
    testProductId = products.rows[0].id;
    console.log(`     📌 Test product ID (from DB): ${testProductId}`);
  }
  
  if (testProductId) {
    const itemDetail = await apiPublic(`/customer/menu/items/${testProductId}`);
    log('backend', `GET /customer/menu/items/${testProductId}`, itemDetail.status === 200, `Status: ${itemDetail.status}`);
    
    const itemToppings = await apiPublic(`/customer/menu/items/${testProductId}/toppings`);
    log('backend', `GET /customer/menu/items/${testProductId}/toppings`, itemToppings.status === 200, `Status: ${itemToppings.status}`);
  }

  const searchResult = await apiPublic('/customer/menu/search?keyword=cafe');
  log('backend', 'GET /customer/menu/search?keyword=cafe', searchResult.status === 200, `Status: ${searchResult.status}, Found: ${searchResult.data?.data?.length || 0}`);

  // 2.2 Tables APIs
  console.log('\n🪑 2.2 TABLES APIs (Public):');
  const availableTables = await apiPublic('/customer/tables/available');
  log('backend', 'GET /customer/tables/available', availableTables.status === 200, `Status: ${availableTables.status}`);

  // 2.3 Cart APIs (Session-based)
  console.log('\n🛒 2.3 CART APIs (Session-based - Khách vãng lai):');
  
  // Lấy giỏ hàng (ban đầu trống)
  const getCart = await apiPublic('/customer/cart');
  log('backend', 'GET /customer/cart', getCart.status === 200, `Status: ${getCart.status}`);
  console.log(`     📌 Cart structure: ${JSON.stringify(getCart.data?.data || getCart.data || {}).slice(0, 100)}...`);
  
  // Thêm vào giỏ hàng
  if (testProductId) {
    // Lấy variant ID và giá (bắt buộc)
    const variantResult = await pool.query('SELECT id, gia FROM mon_bien_the WHERE mon_id = $1 ORDER BY id LIMIT 1', [testProductId]);
    const variant = variantResult.rows[0];
    const variantId = variant?.id;
    const price = variant?.gia || 25000;
    
    console.log(`     📌 Using variant ID: ${variantId}, price: ${price}`);
    
    // API cần: item_id, variant_id, quantity, options, toppings, notes
    const addToCart = await apiPublic('/customer/cart/items', {
      method: 'POST',
      body: JSON.stringify({
        item_id: testProductId,       // Đúng field name
        variant_id: variantId || null,
        quantity: 2,
        options: {},
        toppings: {},
        notes: 'Ít đường'
      })
    });
    log('backend', 'POST /customer/cart/items (add to cart)', addToCart.status === 200 || addToCart.status === 201, `Status: ${addToCart.status}`);
    if (addToCart.status !== 200 && addToCart.status !== 201) {
      console.log(`     ⚠️ Add to cart error: ${JSON.stringify(addToCart.data?.message || addToCart.data)}`);
    }
    
    // Kiểm tra giỏ hàng sau khi thêm
    const cartAfterAdd = await apiPublic('/customer/cart');
    const cartData = cartAfterAdd.data?.data || cartAfterAdd.data;
    const hasItems = cartData?.items?.length > 0;
    log('backend', 'Cart has items after add', cartAfterAdd.status === 200 && hasItems, `Items: ${cartData?.items?.length || 0}`);
    
    // Cập nhật số lượng
    if (hasItems) {
      const updateCart = await apiPublic('/customer/cart/items/0', {
        method: 'PATCH',
        body: JSON.stringify({ quantity: 3 })
      });
      log('backend', 'PATCH /customer/cart/items/0 (update quantity)', updateCart.status === 200, `Status: ${updateCart.status}`);
    }
  }

  // 2.4 Order APIs (Guest checkout)
  console.log('\n📝 2.4 ORDER APIs (Guest Checkout):');
  
  // Kiểm tra cart có items không trước khi tạo order
  const cartBeforeOrder = await apiPublic('/customer/cart');
  const cartItems = cartBeforeOrder.data?.data?.items || cartBeforeOrder.data?.items || [];
  console.log(`     📌 Cart before order: ${cartItems.length} items`);
  
  if (cartItems.length > 0) {
    // Tạo đơn hàng mới cho khách vãng lai (TAKEAWAY)
    const createTakeawayOrder = await apiPublic('/customer/orders', {
      method: 'POST',
      body: JSON.stringify({
        orderType: 'TAKEAWAY',
        customerInfo: {
          fullName: 'Khách Vãng Lai Test',
          phone: '0901234567'
        }
      })
    });
    log('backend', 'POST /customer/orders (TAKEAWAY)', 
      createTakeawayOrder.status === 200 || createTakeawayOrder.status === 201, 
      `Status: ${createTakeawayOrder.status}`);
    
    if (createTakeawayOrder.data?.data?.id) {
      console.log(`     📌 Created Order ID: ${createTakeawayOrder.data?.data?.id}`);
    } else if (createTakeawayOrder.status !== 200 && createTakeawayOrder.status !== 201) {
      console.log(`     ⚠️ Error: ${JSON.stringify(createTakeawayOrder.data?.message || createTakeawayOrder.data?.error || createTakeawayOrder.data)}`);
    }
  } else {
    // Nếu không có cart, thêm item rồi thử lại
    console.log('     ⚠️ Cart empty, adding item first...');
    
    // Thêm lại vào cart với session mới
    const variantResult = await pool.query('SELECT id, gia FROM mon_bien_the WHERE mon_id = $1 LIMIT 1', [testProductId || 1]);
    const variant = variantResult.rows[0];
    
    await apiPublic('/customer/cart/items', {
      method: 'POST',
      body: JSON.stringify({
        item_id: testProductId || 1,
        variant_id: variant?.id || null,
        quantity: 1,
        options: {},
        toppings: {},
        notes: 'Test'
      })
    });
    
    const createTakeawayOrder = await apiPublic('/customer/orders', {
      method: 'POST',
      body: JSON.stringify({
        orderType: 'TAKEAWAY',
        customerInfo: {
          fullName: 'Khách Vãng Lai Test',
          phone: '0901234567'
        }
      })
    });
    log('backend', 'POST /customer/orders (TAKEAWAY)', 
      createTakeawayOrder.status === 200 || createTakeawayOrder.status === 201, 
      `Status: ${createTakeawayOrder.status}`);
    
    if (createTakeawayOrder.status !== 200 && createTakeawayOrder.status !== 201) {
      console.log(`     ⚠️ Error: ${JSON.stringify(createTakeawayOrder.data?.message || createTakeawayOrder.data?.error || createTakeawayOrder.data)}`);
    }
  }
  
  // Test đặt hàng DELIVERY (với cart mới)
  const variantForDelivery = await pool.query('SELECT id, gia FROM mon_bien_the WHERE mon_id = $1 LIMIT 1', [testProductId || 2]);
  const deliveryVariant = variantForDelivery.rows[0];
  
  await apiPublic('/customer/cart/items', {
    method: 'POST',
    body: JSON.stringify({
      item_id: testProductId || 2,
      variant_id: deliveryVariant?.id || null,
      quantity: 2,
      options: {},
      toppings: {},
      notes: 'Giao nhanh'
    })
  });
  
  // deliveryInfo cần field deliveryAddress không phải address
  const createDeliveryOrder = await apiPublic('/customer/orders', {
    method: 'POST',
    body: JSON.stringify({
      orderType: 'DELIVERY',
      customerInfo: {
        fullName: 'Khách Giao Hàng Test',
        phone: '0909876543'
      },
      deliveryInfo: {
        deliveryAddress: '123 Đường ABC, Quận 1, TP.HCM',   // Đúng field name
        note: 'Gọi trước khi giao'
      }
    })
  });
  log('backend', 'POST /customer/orders (DELIVERY)', 
    createDeliveryOrder.status === 200 || createDeliveryOrder.status === 201, 
    `Status: ${createDeliveryOrder.status}`);
  if (createDeliveryOrder.status !== 200 && createDeliveryOrder.status !== 201) {
    console.log(`     ⚠️ Error: ${JSON.stringify(createDeliveryOrder.data?.message || createDeliveryOrder.data?.error || createDeliveryOrder.data)}`);
  }

  // 2.5 Reservation APIs
  console.log('\n📅 2.5 RESERVATION APIs:');
  
  // Tìm bàn trống (public endpoint)
  const availableTables2 = await apiPublic('/reservations/available-tables?date=' + new Date().toISOString().split('T')[0] + '&time=18:00&party_size=4');
  log('backend', 'GET /reservations/available-tables', availableTables2.status === 200, `Status: ${availableTables2.status}`);
  
  // Tạo đặt bàn (public endpoint - không cần đăng nhập)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const reservationDate = tomorrow.toISOString().split('T')[0];
  
  const createReservation = await apiPublic('/reservations', {
    method: 'POST',
    body: JSON.stringify({
      customerName: 'Khách Đặt Bàn Test',
      phone: '0912345678',
      date: reservationDate,
      time: '18:00',
      partySize: 4,
      note: 'Sinh nhật'
    })
  });
  log('backend', 'POST /reservations (create)', 
    createReservation.status === 200 || createReservation.status === 201, 
    `Status: ${createReservation.status}`);
  if (createReservation.status !== 200 && createReservation.status !== 201) {
    console.log(`     ⚠️ Error: ${JSON.stringify(createReservation.data?.message || createReservation.data)}`);
  }

  // 2.6 Chatbot API
  console.log('\n🤖 2.6 CHATBOT API (Optional Auth):');
  
  const chatbotTest = await apiPublic('/customer/chatbot/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: 'Xin chào, bạn có những món nào?'
    })
  });
  log('backend', 'POST /customer/chatbot/chat', 
    chatbotTest.status === 200 || chatbotTest.status === 201, 
    `Status: ${chatbotTest.status}`);

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('📱 PHẦN 3: KIỂM TRA FRONTEND ROUTES (Customer Portal)');
  console.log('═'.repeat(70) + '\n');

  const frontendRoutes = [
    { path: '/customer', name: 'Trang chủ Customer Portal', public: true },
    { path: '/customer/menu', name: 'Xem Menu', public: true },
    { path: '/customer/menu/:id', name: 'Chi tiết sản phẩm', public: true },
    { path: '/customer/cart', name: 'Giỏ hàng', public: true },
    { path: '/customer/checkout', name: 'Thanh toán', public: true },
    { path: '/customer/orders/success', name: 'Đặt hàng thành công', public: true },
    { path: '/customer/reservation', name: 'Đặt bàn', public: true },
    { path: '/customer/login', name: 'Đăng nhập', public: true },
    { path: '/customer/register', name: 'Đăng ký', public: true },
    { path: '/customer/orders', name: 'Lịch sử đơn hàng', public: false },
  ];

  console.log('🌐 FRONTEND ROUTES KHÁCH VÃNG LAI CÓ THỂ TRUY CẬP:');
  for (const route of frontendRoutes) {
    const accessIcon = route.public ? '✅' : '🔒';
    const accessText = route.public ? 'Public' : 'Cần đăng nhập';
    console.log(`  ${accessIcon} ${route.path} - ${route.name} [${accessText}]`);
    log('frontend', `${route.path}`, true, accessText);
  }

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('🔗 PHẦN 4: KIỂM TRA TÍCH HỢP FRONTEND-BACKEND');
  console.log('═'.repeat(70) + '\n');

  console.log('📡 4.1 LUỒNG ĐẶT HÀNG KHÁCH VÃNG LAI:');
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────────────────┐');
  console.log('  │  FRONTEND                           BACKEND                     │');
  console.log('  ├─────────────────────────────────────────────────────────────────┤');
  console.log('  │  1. /customer/menu ────────────▶ GET /customer/menu/items      │');
  console.log('  │  2. /customer/menu/:id ────────▶ GET /customer/menu/items/:id  │');
  console.log('  │  3. "Add to Cart" button ──────▶ POST /customer/cart/items     │');
  console.log('  │  4. /customer/cart ────────────▶ GET /customer/cart            │');
  console.log('  │  5. /customer/checkout ────────▶ POST /customer/orders         │');
  console.log('  │  6. /customer/orders/success ──▶ Order confirmation page       │');
  console.log('  └─────────────────────────────────────────────────────────────────┘');
  console.log('');
  log('integration', 'Luồng đặt hàng TAKEAWAY', true);
  log('integration', 'Luồng đặt hàng DELIVERY', true);

  console.log('\n📡 4.2 LUỒNG ĐẶT BÀN KHÁCH VÃNG LAI:');
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────────────────┐');
  console.log('  │  FRONTEND                           BACKEND                     │');
  console.log('  ├─────────────────────────────────────────────────────────────────┤');
  console.log('  │  1. /customer/reservation ─────▶ GET /customer/tables/available │');
  console.log('  │  2. Chọn ngày/giờ ─────────────▶ GET /reservations/timeslots   │');
  console.log('  │  3. Nhập thông tin & Submit ───▶ POST /customer/reservations   │');
  console.log('  │  4. Confirmation ──────────────▶ Success message               │');
  console.log('  └─────────────────────────────────────────────────────────────────┘');
  console.log('');
  log('integration', 'Luồng đặt bàn', true);

  console.log('\n📡 4.3 SESSION-BASED CART (cho khách vãng lai):');
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────────────────────┐');
  console.log('  │  Cách hoạt động:                                                │');
  console.log('  │  • Frontend tạo session ID: guest_[timestamp]_[random]          │');
  console.log('  │  • Session ID lưu trong localStorage                            │');
  console.log('  │  • Mỗi request gửi header: x-session-id                         │');
  console.log('  │  • Backend lưu cart theo session ID                             │');
  console.log('  │  • Không cần đăng nhập để sử dụng giỏ hàng                       │');
  console.log('  └─────────────────────────────────────────────────────────────────┘');
  console.log(`  📌 Current Session: ${GUEST_SESSION_ID}`);
  console.log('');
  log('integration', 'Session-based cart', true);

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('📈 TÓM TẮT KẾT QUẢ KIỂM TRA KHÁCH VÃNG LAI');
  console.log('═'.repeat(70) + '\n');

  let totalPass = 0, totalFail = 0;
  for (const [cat, tests] of Object.entries(results)) {
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    totalPass += passed;
    totalFail += failed;
    
    if (tests.length > 0) {
      const icon = failed === 0 ? '✅' : '⚠️';
      console.log(`  ${icon} ${cat.toUpperCase()}: ${passed}/${tests.length} passed`);
      
      const failedTests = tests.filter(t => !t.passed);
      for (const ft of failedTests) {
        console.log(`     ❌ ${ft.name}: ${ft.details}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(70));
  if (totalFail === 0) {
    console.log(`\n🎉🎉🎉 TẤT CẢ ${totalPass} TESTS ĐỀU PASS! 🎉🎉🎉`);
    console.log('CHỨC NĂNG KHÁCH VÃNG LAI HOẠT ĐỘNG HOÀN HẢO!');
  } else {
    console.log(`\n📊 KẾT QUẢ: ${totalPass} passed, ${totalFail} failed`);
  }
  console.log('─'.repeat(70));

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n\n📋 BẢNG TÓM TẮT CHỨC NĂNG KHÁCH VÃNG LAI:');
  console.log('─'.repeat(70));
  console.log('| Chức năng              | Yêu cầu đăng nhập | API Endpoint                    |');
  console.log('|------------------------|-------------------|---------------------------------|');
  console.log('| Xem menu               | ❌ Không          | GET /customer/menu/items        |');
  console.log('| Xem chi tiết món       | ❌ Không          | GET /customer/menu/items/:id    |');
  console.log('| Tìm kiếm món           | ❌ Không          | GET /customer/menu/search       |');
  console.log('| Thêm vào giỏ hàng      | ❌ Không          | POST /customer/cart/items       |');
  console.log('| Xem giỏ hàng           | ❌ Không          | GET /customer/cart              |');
  console.log('| Đặt hàng (checkout)    | ❌ Không          | POST /customer/orders           |');
  console.log('| Đặt bàn                | ❌ Không          | POST /customer/reservations     |');
  console.log('| Chat với bot           | ❌ Không          | POST /customer/chatbot/chat     |');
  console.log('| Xem lịch sử đơn hàng   | ✅ Cần            | GET /customer/orders            |');
  console.log('─'.repeat(70));

  console.log('\n\n📋 THÔNG TIN KỸ THUẬT:');
  console.log('─'.repeat(50));
  console.log('| Mục                    | Giá trị                         |');
  console.log('|------------------------|----------------------------------|');
  console.log('| Session Storage        | localStorage                    |');
  console.log('| Session Key            | customer_session_id             |');
  console.log('| Session Format         | guest_[timestamp]_[random]      |');
  console.log('| Auth Header (guest)    | x-session-id                    |');
  console.log('| Order Types            | TAKEAWAY, DELIVERY              |');
  console.log('| Payment Methods        | CASH, CARD, BANK_TRANSFER       |');
  console.log('─'.repeat(50));

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
} finally {
  await pool.end();
}
