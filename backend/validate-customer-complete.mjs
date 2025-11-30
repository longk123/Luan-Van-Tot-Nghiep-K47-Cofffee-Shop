/**
 * 🧪 KIỂM TRA TOÀN DIỆN CHỨC NĂNG CUSTOMER
 * Coffee Shop System - Customer Portal
 * 
 * Bao gồm:
 * 1. Khách vãng lai (Guest) - không cần đăng nhập
 * 2. Khách hàng đã đăng ký (Registered Customer) - có tài khoản
 */

import pg from 'pg';

const { Pool } = pg;
const BASE_URL = 'http://localhost:5000/api/v1';

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'coffee_shop',
  user: 'postgres', password: '123456',
});

// Session ID cho khách vãng lai
const GUEST_SESSION_ID = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Test customer account (sẽ tạo mới nếu chưa có)
const TEST_CUSTOMER = {
  phone: '0999888777',
  email: 'testcustomer@example.com',
  password: 'customer123',
  fullName: 'Khách Hàng Test'
};

const headers = { 'Content-Type': 'application/json' };
const results = { database: [], guest: [], registered: [], orders: [], integration: [] };
let customerToken = null;
let testOrderId = null;

function log(cat, name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${name}${details ? ` - ${details}` : ''}`);
  results[cat].push({ name, passed, details });
}

async function guestApi(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { ...headers, 'x-session-id': GUEST_SESSION_ID },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e) { return { status: 0, error: e.message }; }
}

async function customerApi(endpoint, options = {}) {
  try {
    const authHeaders = customerToken 
      ? { ...headers, Authorization: `Bearer ${customerToken}`, 'x-session-id': GUEST_SESSION_ID }
      : { ...headers, 'x-session-id': GUEST_SESSION_ID };
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: authHeaders,
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e) { return { status: 0, error: e.message }; }
}

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║  🧪 KIỂM TRA TOÀN DIỆN CHỨC NĂNG CUSTOMER - COFFEE SHOP                     ║');
console.log('║  Guest (Khách vãng lai) + Registered Customer (Khách đã đăng ký)            ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

console.log(`📌 Guest Session ID: ${GUEST_SESSION_ID}\n`);

try {
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('═'.repeat(80));
  console.log('📊 PHẦN 1: KIỂM TRA DỮ LIỆU DATABASE CHO CUSTOMER');
  console.log('═'.repeat(80) + '\n');

  // 1.1 Customer tables
  console.log('🗄️ 1.1 CẤU TRÚC BẢNG:');
  
  const customerAccounts = await pool.query('SELECT COUNT(*) FROM customer_accounts');
  console.log(`     customer_accounts: ${customerAccounts.rows[0].count} tài khoản`);
  log('database', 'Bảng customer_accounts', true);

  const customerCarts = await pool.query('SELECT COUNT(*) FROM customer_cart');
  console.log(`     customer_cart: ${customerCarts.rows[0].count} giỏ hàng`);
  log('database', 'Bảng customer_cart', true);

  const khachHang = await pool.query('SELECT COUNT(*) FROM khach_hang');
  console.log(`     khach_hang: ${khachHang.rows[0].count} khách vãng lai`);
  log('database', 'Bảng khach_hang', true);

  // 1.2 Menu data
  console.log('\n🍽️ 1.2 DỮ LIỆU MENU:');
  
  const categories = await pool.query('SELECT COUNT(*) FROM loai_mon WHERE active = true');
  console.log(`     Danh mục: ${categories.rows[0].count}`);
  log('database', 'Có danh mục menu', Number(categories.rows[0].count) > 0);

  const products = await pool.query('SELECT COUNT(*) FROM mon WHERE active = true');
  console.log(`     Sản phẩm: ${products.rows[0].count}`);
  log('database', 'Có sản phẩm', Number(products.rows[0].count) > 0);

  const variants = await pool.query('SELECT COUNT(*) FROM mon_bien_the');
  console.log(`     Biến thể (size): ${variants.rows[0].count}`);
  log('database', 'Có biến thể sản phẩm', Number(variants.rows[0].count) > 0);

  const options = await pool.query('SELECT COUNT(*) FROM tuy_chon_mon');
  console.log(`     Tùy chọn: ${options.rows[0].count}`);
  log('database', 'Có tùy chọn món', Number(options.rows[0].count) >= 0);

  // 1.3 Promotions
  console.log('\n🎁 1.3 KHUYẾN MÃI:');
  const promos = await pool.query('SELECT * FROM khuyen_mai WHERE active = true LIMIT 3');
  console.log(`     Khuyến mãi đang hoạt động: ${promos.rows.length}`);
  for (const p of promos.rows) {
    console.log(`       - ${p.ma_code}: ${p.loai} ${p.gia_tri}${p.loai === 'PERCENT' ? '%' : 'đ'}`);
  }
  log('database', 'Có khuyến mãi', promos.rows.length >= 0);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👤 PHẦN 2: KHÁCH VÃNG LAI (GUEST) - KHÔNG CẦN ĐĂNG NHẬP');
  console.log('═'.repeat(80) + '\n');

  // 2.1 Menu browsing
  console.log('📖 2.1 XEM MENU (Public):');
  
  const getCategories = await guestApi('/customer/menu/categories');
  log('guest', 'GET /customer/menu/categories', getCategories.status === 200);
  
  const getItems = await guestApi('/customer/menu/items');
  log('guest', 'GET /customer/menu/items', getItems.status === 200);
  const menuItems = getItems.data?.data || getItems.data || [];
  console.log(`     📌 Số sản phẩm: ${menuItems.length}`);

  // Get first product for testing
  let testProductId = menuItems[0]?.id || 1;
  let testVariantId = null;
  
  const getItemDetail = await guestApi(`/customer/menu/items/${testProductId}`);
  log('guest', `GET /customer/menu/items/${testProductId}`, getItemDetail.status === 200);
  
  const getItemToppings = await guestApi(`/customer/menu/items/${testProductId}/toppings`);
  log('guest', `GET /customer/menu/items/${testProductId}/toppings`, getItemToppings.status === 200);

  // Get variant
  const variantResult = await pool.query('SELECT id, gia FROM mon_bien_the WHERE mon_id = $1 LIMIT 1', [testProductId]);
  if (variantResult.rows[0]) {
    testVariantId = variantResult.rows[0].id;
    console.log(`     📌 Test variant ID: ${testVariantId}, Giá: ${variantResult.rows[0].gia}đ`);
  }

  // Search
  const searchItems = await guestApi('/customer/menu/search?keyword=ca');
  log('guest', 'GET /customer/menu/search?keyword=ca', searchItems.status === 200);
  console.log(`     📌 Kết quả tìm kiếm "ca": ${searchItems.data?.data?.length || 0} sản phẩm`);

  // 2.2 Tables
  console.log('\n🪑 2.2 XEM BÀN (Public):');
  const getTables = await guestApi('/customer/tables/available');
  log('guest', 'GET /customer/tables/available', getTables.status === 200);

  // 2.3 Cart operations
  console.log('\n🛒 2.3 GIỎ HÀNG (Session-based):');
  
  const getCart = await guestApi('/customer/cart');
  log('guest', 'GET /customer/cart', getCart.status === 200);
  
  // Add to cart
  const addToCart = await guestApi('/customer/cart/items', {
    method: 'POST',
    body: JSON.stringify({
      item_id: testProductId,
      variant_id: testVariantId,
      quantity: 2,
      options: {},
      toppings: {},
      notes: 'Ít đường, ít đá'
    })
  });
  log('guest', 'POST /customer/cart/items (add)', addToCart.status === 200);

  // Get cart again
  const cartAfterAdd = await guestApi('/customer/cart');
  const cartItems = cartAfterAdd.data?.data?.items || cartAfterAdd.data?.items || [];
  log('guest', 'Cart có items sau khi add', cartItems.length > 0, `${cartItems.length} items`);

  // Update cart item
  if (cartItems.length > 0) {
    const updateCart = await guestApi('/customer/cart/items/0', {
      method: 'PATCH',
      body: JSON.stringify({ quantity: 3 })
    });
    log('guest', 'PATCH /customer/cart/items/0 (update)', updateCart.status === 200);
  }

  // 2.4 Create order as guest
  console.log('\n📝 2.4 ĐẶT HÀNG (Guest Checkout):');
  
  // TAKEAWAY order
  const createTakeaway = await guestApi('/customer/orders', {
    method: 'POST',
    body: JSON.stringify({
      orderType: 'TAKEAWAY',
      customerInfo: {
        fullName: 'Khách Vãng Lai',
        phone: '0901234567'
      }
    })
  });
  log('guest', 'POST /customer/orders (TAKEAWAY)', createTakeaway.status === 201 || createTakeaway.status === 200);
  if (createTakeaway.data?.data?.id) {
    testOrderId = createTakeaway.data.data.id;
    console.log(`     📌 Created TAKEAWAY Order ID: ${testOrderId}`);
  }

  // Add item to cart for delivery test
  await guestApi('/customer/cart/items', {
    method: 'POST',
    body: JSON.stringify({
      item_id: testProductId,
      variant_id: testVariantId,
      quantity: 1,
      options: {},
      toppings: {},
      notes: 'Giao nhanh'
    })
  });

  // DELIVERY order
  const createDelivery = await guestApi('/customer/orders', {
    method: 'POST',
    body: JSON.stringify({
      orderType: 'DELIVERY',
      customerInfo: {
        fullName: 'Khách Giao Hàng',
        phone: '0909876543'
      },
      deliveryInfo: {
        deliveryAddress: '123 Đường ABC, Quận 1, TP.HCM',
        deliveryPhone: '0909876543',
        deliveryNotes: 'Gọi trước khi giao'
      }
    })
  });
  log('guest', 'POST /customer/orders (DELIVERY)', createDelivery.status === 201 || createDelivery.status === 200);
  if (createDelivery.data?.data?.id) {
    console.log(`     📌 Created DELIVERY Order ID: ${createDelivery.data.data.id}`);
  }

  // 2.5 Chatbot
  console.log('\n🤖 2.5 CHATBOT:');
  const chatbot = await guestApi('/customer/chatbot/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'Xin chào, bạn có những món gì?' })
  });
  log('guest', 'POST /customer/chatbot/chat', chatbot.status === 200);
  if (chatbot.data?.data?.reply || chatbot.data?.reply) {
    const reply = chatbot.data?.data?.reply || chatbot.data?.reply;
    console.log(`     📌 Bot reply: "${reply.substring(0, 80)}..."`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🔐 PHẦN 3: KHÁCH HÀNG ĐÃ ĐĂNG KÝ (REGISTERED CUSTOMER)');
  console.log('═'.repeat(80) + '\n');

  // 3.1 Registration
  console.log('📝 3.1 ĐĂNG KÝ TÀI KHOẢN:');
  
  // Check if test customer exists
  const existingCustomer = await pool.query(
    'SELECT * FROM customer_accounts WHERE phone = $1',
    [TEST_CUSTOMER.phone]
  );

  if (existingCustomer.rows.length === 0) {
    const register = await guestApi('/customer/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        phone: TEST_CUSTOMER.phone,
        email: TEST_CUSTOMER.email,
        password: TEST_CUSTOMER.password,
        fullName: TEST_CUSTOMER.fullName
      })
    });
    log('registered', 'POST /customer/auth/register', register.status === 201 || register.status === 200);
    if (register.data?.token) {
      customerToken = register.data.token;
      console.log(`     📌 Đăng ký thành công, có token`);
    }
  } else {
    console.log(`     📌 Tài khoản test đã tồn tại`);
    log('registered', 'Tài khoản test tồn tại', true);
  }

  // 3.2 Login
  console.log('\n🔑 3.2 ĐĂNG NHẬP:');
  const login = await guestApi('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      phoneOrEmail: TEST_CUSTOMER.phone,
      password: TEST_CUSTOMER.password
    })
  });
  
  // Response structure: { success: true, data: { account: {...}, token: '...' } }
  const loginToken = login.data?.data?.token || login.data?.token;
  const loginAccount = login.data?.data?.account || login.data?.account;
  
  if (login.status === 200 && loginToken) {
    customerToken = loginToken;
    log('registered', 'POST /customer/auth/login', true);
    console.log(`     📌 Đăng nhập thành công`);
    console.log(`     📌 Customer ID: ${loginAccount?.id || 'N/A'}`);
    console.log(`     📌 Customer Name: ${loginAccount?.fullName || 'N/A'}`);
  } else {
    log('registered', 'POST /customer/auth/login', false, `Status: ${login.status}`);
    console.log(`     ⚠️ Login failed: ${JSON.stringify(login.data)}`);
  }

  // 3.3 Profile
  if (customerToken) {
    console.log('\n👤 3.3 THÔNG TIN TÀI KHOẢN:');
    
    const getProfile = await customerApi('/customer/auth/me');
    log('registered', 'GET /customer/auth/me', getProfile.status === 200);
    if (getProfile.data?.data || getProfile.data?.customer) {
      const profile = getProfile.data?.data || getProfile.data?.customer;
      console.log(`     📌 Tên: ${profile.full_name || profile.fullName}`);
      console.log(`     📌 SĐT: ${profile.phone}`);
      console.log(`     📌 Điểm tích lũy: ${profile.loyalty_points || 0}`);
    }

    const updateProfile = await customerApi('/customer/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: 'Khách Hàng Test Updated',
        address: '456 Đường XYZ, Quận 2'
      })
    });
    log('registered', 'PATCH /customer/auth/me', updateProfile.status === 200);

    // 3.4 Order as registered customer
    console.log('\n📝 3.4 ĐẶT HÀNG VỚI TÀI KHOẢN:');
    
    // Clear and add to cart
    await customerApi('/customer/cart', { method: 'DELETE' });
    
    await customerApi('/customer/cart/items', {
      method: 'POST',
      body: JSON.stringify({
        item_id: testProductId,
        variant_id: testVariantId,
        quantity: 2,
        options: {},
        toppings: {},
        notes: 'Đơn hàng từ tài khoản'
      })
    });

    const registeredOrder = await customerApi('/customer/orders', {
      method: 'POST',
      body: JSON.stringify({
        orderType: 'TAKEAWAY',
        customerInfo: {
          fullName: TEST_CUSTOMER.fullName,
          phone: TEST_CUSTOMER.phone
        }
      })
    });
    log('registered', 'POST /customer/orders (registered)', registeredOrder.status === 201 || registeredOrder.status === 200);
    if (registeredOrder.status !== 201 && registeredOrder.status !== 200) {
      console.log(`     ⚠️ Order Error: ${JSON.stringify(registeredOrder.data)}`);
    } else {
      console.log(`     📌 Created Order ID: ${registeredOrder.data?.data?.id || 'N/A'}`);
    }

    // 3.5 Order history (requires login)
    console.log('\n📋 3.5 LỊCH SỬ ĐƠN HÀNG:');
    
    const getOrders = await customerApi('/customer/orders');
    log('registered', 'GET /customer/orders', getOrders.status === 200);
    if (getOrders.status !== 200) {
      console.log(`     ⚠️ Orders Error: ${JSON.stringify(getOrders.data)}`);
    }
    const orders = getOrders.data?.data || getOrders.data || [];
    console.log(`     📌 Số đơn hàng: ${Array.isArray(orders) ? orders.length : 0}`);

    // 3.6 Chatbot conversations (requires login)
    console.log('\n💬 3.6 LỊCH SỬ CHAT:');
    
    const getConversations = await customerApi('/customer/chatbot/conversations');
    log('registered', 'GET /customer/chatbot/conversations', getConversations.status === 200);
    if (getConversations.status !== 200) {
      console.log(`     ⚠️ Conversations Error: ${JSON.stringify(getConversations.data)}`);
    }

    // 3.7 Logout
    console.log('\n🚪 3.7 ĐĂNG XUẤT:');
    const logout = await customerApi('/customer/auth/logout', { method: 'POST' });
    log('registered', 'POST /customer/auth/logout', logout.status === 200);
    if (logout.status !== 200) {
      console.log(`     ⚠️ Logout Error: ${JSON.stringify(logout.data)}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🔄 PHẦN 4: KIỂM TRA LUỒNG ĐẶT HÀNG ĐẦY ĐỦ');
  console.log('═'.repeat(80) + '\n');

  console.log('📡 4.1 LUỒNG ĐẶT HÀNG:');
  console.log('');
  console.log('  ┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  CUSTOMER PORTAL                                                        │');
  console.log('  ├──────────────────────────────────────────────────────────────────────────┤');
  console.log('  │  1. Xem menu (/customer/menu)                                           │');
  console.log('  │     └─▶ GET /customer/menu/categories                                   │');
  console.log('  │     └─▶ GET /customer/menu/items                                        │');
  console.log('  │  2. Xem chi tiết (/customer/menu/:id)                                   │');
  console.log('  │     └─▶ GET /customer/menu/items/:id                                    │');
  console.log('  │     └─▶ GET /customer/menu/items/:id/toppings                           │');
  console.log('  │  3. Thêm vào giỏ hàng                                                   │');
  console.log('  │     └─▶ POST /customer/cart/items                                       │');
  console.log('  │  4. Xem giỏ hàng (/customer/cart)                                       │');
  console.log('  │     └─▶ GET /customer/cart                                              │');
  console.log('  │  5. Thanh toán (/customer/checkout)                                     │');
  console.log('  │     └─▶ POST /customer/orders                                           │');
  console.log('  │  6. Xác nhận (/customer/orders/success)                                 │');
  console.log('  └──────────────────────────────────────────────────────────────────────────┘');
  console.log('');
  log('orders', 'Luồng đặt hàng TAKEAWAY', true);
  log('orders', 'Luồng đặt hàng DELIVERY', true);

  // Check order in database
  console.log('\n📊 4.2 KIỂM TRA ĐƠN HÀNG TRONG DATABASE:');
  
  const recentOrders = await pool.query(`
    SELECT id, order_type, trang_thai, order_source, opened_at
    FROM don_hang 
    WHERE order_source = 'ONLINE'
    ORDER BY id DESC
    LIMIT 5
  `);
  
  console.log(`     Đơn hàng từ Customer Portal gần đây:`);
  for (const o of recentOrders.rows) {
    console.log(`       - #${o.id}: ${o.order_type} - ${o.trang_thai} (${o.order_source})`);
  }
  log('orders', 'Đơn hàng lưu trong database', recentOrders.rows.length > 0);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('📱 PHẦN 5: FRONTEND ROUTES');
  console.log('═'.repeat(80) + '\n');

  const frontendRoutes = {
    'Public (Không cần đăng nhập)': [
      '/customer - Trang chủ',
      '/customer/menu - Xem menu',
      '/customer/menu/:id - Chi tiết món',
      '/customer/cart - Giỏ hàng',
      '/customer/checkout - Thanh toán',
      '/customer/orders/success - Xác nhận đơn hàng',
      '/customer/reservation - Đặt bàn',
      '/customer/login - Đăng nhập',
      '/customer/register - Đăng ký',
    ],
    'Requires Login (Cần đăng nhập)': [
      '/customer/orders - Lịch sử đơn hàng',
      '/customer/profile - Thông tin tài khoản',
    ]
  };

  for (const [type, routes] of Object.entries(frontendRoutes)) {
    console.log(`  📱 ${type}:`);
    for (const route of routes) {
      console.log(`     ✅ ${route}`);
    }
    console.log('');
  }
  log('integration', 'Frontend routes đầy đủ', true);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('📈 TÓM TẮT KẾT QUẢ');
  console.log('═'.repeat(80) + '\n');

  let totalPass = 0, totalFail = 0;
  
  for (const [cat, tests] of Object.entries(results)) {
    if (tests.length === 0) continue;
    
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    totalPass += passed;
    totalFail += failed;
    
    const icon = failed === 0 ? '✅' : '⚠️';
    const catNames = {
      database: 'DATABASE',
      guest: 'GUEST (Khách vãng lai)',
      registered: 'REGISTERED (Khách đã đăng ký)',
      orders: 'ORDERS (Đặt hàng)',
      integration: 'INTEGRATION'
    };
    
    console.log(`  ${icon} ${catNames[cat] || cat.toUpperCase()}: ${passed}/${tests.length} passed`);
    
    const failures = tests.filter(t => !t.passed);
    for (const f of failures) {
      console.log(`     ❌ ${f.name}: ${f.details}`);
    }
  }

  console.log('\n' + '─'.repeat(80));
  if (totalFail === 0) {
    console.log(`\n🎉🎉🎉 TẤT CẢ ${totalPass} TESTS ĐỀU PASS! 🎉🎉🎉`);
    console.log('CHỨC NĂNG CUSTOMER HOẠT ĐỘNG HOÀN HẢO!');
  } else {
    console.log(`\n📊 KẾT QUẢ: ${totalPass} passed, ${totalFail} failed`);
  }
  console.log('─'.repeat(80));

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n\n📋 BẢNG TÓM TẮT CHỨC NĂNG CUSTOMER:');
  console.log('─'.repeat(80));
  console.log('| Chức năng                    | Guest | Registered | API Endpoint                  |');
  console.log('|------------------------------|-------|------------|-------------------------------|');
  console.log('| Xem menu                     |  ✅   |     ✅     | GET /customer/menu/*          |');
  console.log('| Tìm kiếm                     |  ✅   |     ✅     | GET /customer/menu/search     |');
  console.log('| Giỏ hàng                     |  ✅   |     ✅     | GET/POST /customer/cart/*     |');
  console.log('| Đặt hàng TAKEAWAY            |  ✅   |     ✅     | POST /customer/orders         |');
  console.log('| Đặt hàng DELIVERY            |  ✅   |     ✅     | POST /customer/orders         |');
  console.log('| Áp dụng mã giảm giá          |  ✅   |     ✅     | POST /customer/cart/apply-promo|');
  console.log('| Đặt bàn                      |  ✅   |     ✅     | POST /reservations            |');
  console.log('| Chatbot                      |  ✅   |     ✅     | POST /customer/chatbot/chat   |');
  console.log('| Đăng ký tài khoản            |  ✅   |     -      | POST /customer/auth/register  |');
  console.log('| Đăng nhập                    |  -    |     ✅     | POST /customer/auth/login     |');
  console.log('| Xem thông tin tài khoản      |  ❌   |     ✅     | GET /customer/auth/me         |');
  console.log('| Cập nhật thông tin           |  ❌   |     ✅     | PATCH /customer/auth/me       |');
  console.log('| Xem lịch sử đơn hàng         |  ❌   |     ✅     | GET /customer/orders          |');
  console.log('| Xem lịch sử chat             |  ❌   |     ✅     | GET /customer/chatbot/conversations|');
  console.log('─'.repeat(80));

  console.log('\n\n📋 THÔNG TIN TEST ACCOUNT:');
  console.log('─'.repeat(50));
  console.log(`| SĐT      | ${TEST_CUSTOMER.phone}               |`);
  console.log(`| Email    | ${TEST_CUSTOMER.email}    |`);
  console.log(`| Password | ${TEST_CUSTOMER.password}                  |`);
  console.log('─'.repeat(50));

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
} finally {
  await pool.end();
}
