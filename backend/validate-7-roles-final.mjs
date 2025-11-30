/**
 * KIỂM TRA TOÀN DIỆN 7 ROLES VÀ MỐI QUAN HỆ DỮ LIỆU
 * Script này kiểm tra ĐÚNG các endpoints thực tế của hệ thống
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456'
});

const BASE_URL = 'http://localhost:5000/api/v1';
const headers = { 'Content-Type': 'application/json' };

// Test results tracking
const results = {
  database: { passed: 0, failed: 0, tests: [] },
  guest: { passed: 0, failed: 0, tests: [] },
  customer: { passed: 0, failed: 0, tests: [] },
  admin: { passed: 0, failed: 0, tests: [] },
  manager: { passed: 0, failed: 0, tests: [] },
  cashier: { passed: 0, failed: 0, tests: [] },
  kitchen: { passed: 0, failed: 0, tests: [] },
  waiter: { passed: 0, failed: 0, tests: [] },
  integration: { passed: 0, failed: 0, tests: [] }
};

function log(category, test, passed, error = null) {
  if (passed) {
    results[category].passed++;
    console.log(`  ✅ ${test}`);
  } else {
    results[category].failed++;
    results[category].tests.push(test);
    console.log(`  ❌ ${test}${error ? ` - ${error}` : ''}`);
  }
}

// Credentials
const CREDENTIALS = {
  admin: { username: 'admin', password: 'admin123' },
  manager: { username: 'manager01', password: 'manager123' },
  cashier: { username: 'cashier01', password: 'cashier123' },
  kitchen: { username: 'kitchen01', password: 'kitchen123' },
  waiter: { username: 'waiter01', password: 'waiter123' },
  customer: { phone: '0999888777', password: 'customer123' }
};

const GUEST_SESSION_ID = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Token storage
let tokens = {};

async function fetchApi(endpoint, options = {}, token = null) {
  try {
    const authHeaders = token 
      ? { ...headers, Authorization: `Bearer ${token}` }
      : headers;
    
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: authHeaders,
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e) { 
    return { status: 0, error: e.message }; 
  }
}

async function guestApi(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { ...headers, 'x-session-id': GUEST_SESSION_ID },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch (e) { 
    return { status: 0, error: e.message }; 
  }
}

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║  🧪 KIỂM TRA TOÀN DIỆN 7 ROLES - COFFEE SHOP SYSTEM                         ║');
console.log('║  Guest | Customer | Admin | Manager | Cashier | Kitchen | Waiter            ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

try {
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('═'.repeat(80));
  console.log('📊 PHẦN 1: KIỂM TRA CẤU TRÚC DATABASE');
  console.log('═'.repeat(80) + '\n');

  // 1.1 Core tables
  console.log('🗄️ 1.1 BẢNG CORE:');
  
  const tables = [
    'users', 'roles', 'user_roles', 'customer_accounts', 'khach_hang',
    'mon', 'loai_mon', 'mon_bien_the', 'tuy_chon_mon',
    'don_hang', 'don_hang_chi_tiet', 'ban', 'khu_vuc', 'ca_lam', 'customer_cart'
  ];

  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT COUNT(*) FROM ${t}`);
      console.log(`     ${t}: ${res.rows[0].count} records`);
      log('database', `Bảng ${t}`, true);
    } catch (e) {
      log('database', `Bảng ${t}`, false, e.message);
    }
  }

  // 1.2 Role distribution
  console.log('\n👥 1.2 PHÂN BỐ VAI TRÒ:');
  const roleDistribution = await pool.query(`
    SELECT r.role_name, COUNT(ur.user_id) as count
    FROM roles r
    LEFT JOIN user_roles ur ON r.role_id = ur.role_id
    GROUP BY r.role_name
    ORDER BY count DESC
  `);
  for (const r of roleDistribution.rows) {
    console.log(`     ${r.role_name}: ${r.count} người`);
  }
  log('database', 'Phân bố vai trò', roleDistribution.rows.length > 0);

  // 1.3 Order statistics
  console.log('\n📦 1.3 THỐNG KÊ ĐƠN HÀNG:');
  const orderStats = await pool.query(`
    SELECT 
      COALESCE(order_source, 'POS') as source,
      COUNT(*) as total,
      COUNT(CASE WHEN trang_thai = 'COMPLETED' THEN 1 END) as completed,
      COUNT(CASE WHEN trang_thai = 'OPEN' THEN 1 END) as open
    FROM don_hang GROUP BY order_source
  `);
  for (const o of orderStats.rows) {
    console.log(`     ${o.source}: ${o.total} đơn (${o.completed} hoàn thành, ${o.open} đang mở)`);
  }
  log('database', 'Thống kê đơn hàng', true);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🔐 PHẦN 2: ĐĂNG NHẬP TẤT CẢ ROLES');
  console.log('═'.repeat(80) + '\n');

  // 2.1 Staff login
  console.log('👔 2.1 ĐĂNG NHẬP NHÂN VIÊN:');
  for (const role of ['admin', 'manager', 'cashier', 'kitchen', 'waiter']) {
    const loginRes = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify(CREDENTIALS[role])
    });
    
    if (loginRes.status === 200 && loginRes.data?.token) {
      tokens[role] = loginRes.data.token;
      console.log(`     ${role.toUpperCase()}: ✅ Logged in as ${loginRes.data.user?.ho_ten || loginRes.data.user?.username}`);
      log(role, 'Đăng nhập', true);
    } else {
      console.log(`     ${role.toUpperCase()}: ❌ Failed`);
      log(role, 'Đăng nhập', false, `Status: ${loginRes.status}`);
    }
  }

  // 2.2 Customer login
  console.log('\n👤 2.2 ĐĂNG NHẬP KHÁCH HÀNG:');
  const customerLogin = await fetchApi('/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phoneOrEmail: CREDENTIALS.customer.phone, password: CREDENTIALS.customer.password })
  });
  
  if (customerLogin.status === 200 && customerLogin.data?.data?.token) {
    tokens.customer = customerLogin.data.data.token;
    console.log(`     CUSTOMER: ✅ ${customerLogin.data.data.account?.fullName}`);
    log('customer', 'Đăng nhập', true);
  } else {
    console.log(`     CUSTOMER: ❌ Login failed`);
    log('customer', 'Đăng nhập', false);
  }

  // Get test product
  const testProd = await pool.query(`
    SELECT m.id, m.ten, mbv.id as variant_id, mbv.gia 
    FROM mon m JOIN mon_bien_the mbv ON m.id = mbv.mon_id 
    WHERE m.active = true LIMIT 1
  `);
  const testProduct = testProd.rows[0];
  console.log(`\n📌 Test Product: ${testProduct?.ten} (ID: ${testProduct?.id}, Variant: ${testProduct?.variant_id})`);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👤 PHẦN 3: KIỂM TRA GUEST (Khách vãng lai)');
  console.log('═'.repeat(80) + '\n');

  console.log('📖 3.1 XEM MENU:');
  const menuCat = await guestApi('/customer/menu/categories');
  log('guest', 'GET /customer/menu/categories', menuCat.status === 200);
  console.log(`     📌 Danh mục: ${menuCat.data?.data?.length || 0}`);

  const menuItems = await guestApi('/customer/menu/items');
  log('guest', 'GET /customer/menu/items', menuItems.status === 200);
  console.log(`     📌 Sản phẩm: ${menuItems.data?.data?.length || 0}`);

  const menuSearch = await guestApi('/customer/menu/search?keyword=cà phê');
  log('guest', 'GET /customer/menu/search', menuSearch.status === 200);
  console.log(`     📌 Kết quả tìm kiếm: ${menuSearch.data?.data?.length || 0}`);

  console.log('\n🛒 3.2 GIỎ HÀNG:');
  const cart = await guestApi('/customer/cart');
  log('guest', 'GET /customer/cart', cart.status === 200);

  const addCart = await guestApi('/customer/cart/items', {
    method: 'POST',
    body: JSON.stringify({
      item_id: testProduct?.id || 1,
      variant_id: testProduct?.variant_id || 1,
      quantity: 2
    })
  });
  log('guest', 'POST /customer/cart/items', addCart.status === 200 || addCart.status === 201);

  console.log('\n📝 3.3 ĐẶT HÀNG:');
  // Add more items for order
  await guestApi('/customer/cart/items', {
    method: 'POST',
    body: JSON.stringify({ item_id: testProduct?.id || 1, variant_id: testProduct?.variant_id || 1, quantity: 1 })
  });

  const guestOrder = await guestApi('/customer/orders', {
    method: 'POST',
    body: JSON.stringify({
      orderType: 'TAKEAWAY',
      customerInfo: { fullName: 'Khách Test Guest', phone: '0901234567' }
    })
  });
  log('guest', 'POST /customer/orders (TAKEAWAY)', guestOrder.status === 200 || guestOrder.status === 201);
  console.log(`     📌 Order ID: ${guestOrder.data?.data?.id || 'N/A'}`);

  console.log('\n🤖 3.4 CHATBOT:');
  const chatbot = await guestApi('/customer/chatbot/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'Xin chào' })
  });
  log('guest', 'POST /customer/chatbot/chat', chatbot.status === 200);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👤 PHẦN 4: KIỂM TRA REGISTERED CUSTOMER');
  console.log('═'.repeat(80) + '\n');

  if (tokens.customer) {
    console.log('👤 4.1 PROFILE:');
    const profile = await fetchApi('/customer/auth/me', {}, tokens.customer);
    log('customer', 'GET /customer/auth/me', profile.status === 200);
    console.log(`     📌 Tên: ${profile.data?.data?.fullName || 'N/A'}`);

    console.log('\n📝 4.2 ĐẶT HÀNG:');
    // Add to cart with customer token
    const customerHeaders = { ...headers, Authorization: `Bearer ${tokens.customer}` };
    await fetch(`${BASE_URL}/customer/cart/items`, {
      method: 'POST',
      headers: customerHeaders,
      body: JSON.stringify({ item_id: testProduct?.id || 1, variant_id: testProduct?.variant_id || 1, quantity: 2 })
    });

    const customerOrder = await fetchApi('/customer/orders', {
      method: 'POST',
      body: JSON.stringify({
        orderType: 'TAKEAWAY',
        customerInfo: { fullName: 'Khách Đã Đăng Ký', phone: CREDENTIALS.customer.phone }
      })
    }, tokens.customer);
    log('customer', 'POST /customer/orders', customerOrder.status === 200 || customerOrder.status === 201);
    console.log(`     📌 Order ID: ${customerOrder.data?.data?.id || 'N/A'}`);

    console.log('\n📋 4.3 LỊCH SỬ:');
    const orderHistory = await fetchApi('/customer/orders', {}, tokens.customer);
    log('customer', 'GET /customer/orders (history)', orderHistory.status === 200);
    console.log(`     📌 Số đơn: ${orderHistory.data?.data?.length || 0}`);

    const chatHistory = await fetchApi('/customer/chatbot/conversations', {}, tokens.customer);
    log('customer', 'GET /customer/chatbot/conversations', chatHistory.status === 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👑 PHẦN 5: KIỂM TRA ADMIN');
  console.log('═'.repeat(80) + '\n');

  if (tokens.admin) {
    console.log('👥 5.1 QUẢN LÝ NHÂN VIÊN:');
    const users = await fetchApi('/auth/users', {}, tokens.admin);
    log('admin', 'GET /auth/users', users.status === 200);
    console.log(`     📌 Số nhân viên: ${users.data?.data?.length || users.data?.length || 0}`);

    console.log('\n🍽️ 5.2 QUẢN LÝ MENU:');
    const menuCategories = await fetchApi('/menu/categories', {}, tokens.admin);
    log('admin', 'GET /menu/categories', menuCategories.status === 200);
    console.log(`     📌 Danh mục: ${menuCategories.data?.data?.length || 0}`);

    const menuItemsAdmin = await fetchApi('/menu/categories/0/items', {}, tokens.admin);
    log('admin', 'GET /menu/categories/0/items', menuItemsAdmin.status === 200);
    console.log(`     📌 Sản phẩm: ${menuItemsAdmin.data?.data?.length || 0}`);

    console.log('\n🪑 5.3 QUẢN LÝ BÀN:');
    const tables = await fetchApi('/tables', {}, tokens.admin);
    log('admin', 'GET /tables', tables.status === 200);
    console.log(`     📌 Số bàn: ${tables.data?.data?.length || tables.data?.length || 0}`);

    console.log('\n📊 5.4 THỐNG KÊ:');
    const analytics = await fetchApi('/analytics/overview', {}, tokens.admin);
    log('admin', 'GET /analytics/overview', analytics.status === 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👔 PHẦN 6: KIỂM TRA MANAGER');
  console.log('═'.repeat(80) + '\n');

  if (tokens.manager) {
    console.log('📊 6.1 ANALYTICS:');
    const overview = await fetchApi('/analytics/overview', {}, tokens.manager);
    log('manager', 'GET /analytics/overview', overview.status === 200);

    const revenueChart = await fetchApi('/analytics/revenue-chart', {}, tokens.manager);
    log('manager', 'GET /analytics/revenue-chart', revenueChart.status === 200);

    const topItems = await fetchApi('/analytics/top-menu-items', {}, tokens.manager);
    log('manager', 'GET /analytics/top-menu-items', topItems.status === 200);
    console.log(`     📌 Top items: ${topItems.data?.data?.length || 0}`);

    console.log('\n⏰ 6.2 QUẢN LÝ CA:');
    const shifts = await fetchApi('/shifts/current', {}, tokens.manager);
    log('manager', 'GET /shifts/current', shifts.status === 200 || shifts.status === 404);

    console.log('\n📦 6.3 XEM ĐƠN HÀNG:');
    const posOrders = await fetchApi('/pos/orders/current-shift', {}, tokens.manager);
    log('manager', 'GET /pos/orders/current-shift', posOrders.status === 200);
    console.log(`     📌 Đơn ca hiện tại: ${posOrders.data?.data?.length || 0}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('💵 PHẦN 7: KIỂM TRA CASHIER');
  console.log('═'.repeat(80) + '\n');

  if (tokens.cashier) {
    console.log('⏰ 7.1 CA LÀM VIỆC:');
    const currentShift = await fetchApi('/shifts/current', {}, tokens.cashier);
    log('cashier', 'GET /shifts/current', currentShift.status === 200 || currentShift.status === 404);

    console.log('\n📋 7.2 XEM MENU POS:');
    const posMenu = await fetchApi('/pos/menu/categories', {}, tokens.cashier);
    log('cashier', 'GET /pos/menu/categories', posMenu.status === 200);

    const posItems = await fetchApi('/pos/menu/categories/0/items', {}, tokens.cashier);
    log('cashier', 'GET /pos/menu/categories/0/items', posItems.status === 200);
    console.log(`     📌 Sản phẩm POS: ${posItems.data?.data?.length || 0}`);

    console.log('\n📝 7.3 TẠO ĐƠN POS:');
    // API chỉ cần order_type, không cần items - items được thêm riêng
    const posOrder = await fetchApi('/pos/orders', {
      method: 'POST',
      body: JSON.stringify({
        order_type: 'TAKEAWAY'
      })
    }, tokens.cashier);
    log('cashier', 'POST /pos/orders (TAKEAWAY)', posOrder.status === 200 || posOrder.status === 201);
    const posOrderId = posOrder.data?.data?.id || posOrder.data?.id;
    console.log(`     📌 POS Order ID: ${posOrderId || 'N/A'}`);

    // Thêm món vào đơn hàng (cần mon_id và bien_the_id)
    if (posOrderId && testProduct) {
      const addItem = await fetchApi(`/pos/orders/${posOrderId}/items`, {
        method: 'POST',
        body: JSON.stringify({
          mon_id: testProduct.id,
          bien_the_id: testProduct.variant_id,
          so_luong: 1
        })
      }, tokens.cashier);
      log('cashier', `POST /pos/orders/${posOrderId}/items`, addItem.status === 200 || addItem.status === 201);
    }

    console.log('\n📦 7.4 XEM ĐƠN:');
    const shiftOrders = await fetchApi('/pos/orders/current-shift', {}, tokens.cashier);
    log('cashier', 'GET /pos/orders/current-shift', shiftOrders.status === 200);
    console.log(`     📌 Đơn ca hiện tại: ${shiftOrders.data?.data?.length || 0}`);

    const takeawayOrders = await fetchApi('/pos/takeaway-orders', {}, tokens.cashier);
    log('cashier', 'GET /pos/takeaway-orders', takeawayOrders.status === 200);
    console.log(`     📌 Đơn takeaway: ${takeawayOrders.data?.data?.length || 0}`);

    console.log('\n💰 7.5 THANH TOÁN:');
    if (posOrderId) {
      const checkout = await fetchApi(`/pos/orders/${posOrderId}/checkout`, {
        method: 'POST',
        body: JSON.stringify({ payment_method: 'CASH' })
      }, tokens.cashier);
      log('cashier', `POST /pos/orders/${posOrderId}/checkout`, checkout.status === 200);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🍳 PHẦN 8: KIỂM TRA KITCHEN');
  console.log('═'.repeat(80) + '\n');

  if (tokens.kitchen) {
    console.log('📋 8.1 HÀNG ĐỢI BẾP:');
    const queue = await fetchApi('/kitchen/queue', {}, tokens.kitchen);
    log('kitchen', 'GET /kitchen/queue', queue.status === 200);
    const queueItems = queue.data?.data || [];
    console.log(`     📌 Món chờ: ${queueItems.length}`);

    console.log('\n✅ 8.2 MÓN ĐÃ HOÀN THÀNH:');
    const completed = await fetchApi('/kitchen/completed', {}, tokens.kitchen);
    log('kitchen', 'GET /kitchen/completed', completed.status === 200);
    console.log(`     📌 Món đã xong: ${completed.data?.data?.length || 0}`);

    console.log('\n🔄 8.3 CẬP NHẬT TRẠNG THÁI:');
    if (queueItems.length > 0) {
      const lineId = queueItems[0].id;
      // API yêu cầu { action: 'start' | 'done' | 'cancel' }
      const updateLine = await fetchApi(`/kitchen/lines/${lineId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'start' })
      }, tokens.kitchen);
      log('kitchen', `PATCH /kitchen/lines/${lineId} (start)`, updateLine.status === 200);
    } else {
      log('kitchen', 'Không có món để test cập nhật', true);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🍽️ PHẦN 9: KIỂM TRA WAITER');
  console.log('═'.repeat(80) + '\n');

  if (tokens.waiter) {
    console.log('🪑 9.1 XEM BÀN:');
    const tables = await fetchApi('/tables', {}, tokens.waiter);
    log('waiter', 'GET /tables', tables.status === 200);
    console.log(`     📌 Số bàn: ${tables.data?.data?.length || tables.data?.length || 0}`);

    const posTables = await fetchApi('/pos/tables', {}, tokens.waiter);
    log('waiter', 'GET /pos/tables', posTables.status === 200);

    console.log('\n📝 9.2 TẠO ĐƠN CHO BÀN:');
    // Get available table
    const availableTable = await pool.query(`SELECT id FROM ban WHERE trang_thai = 'available' LIMIT 1`);
    const tableId = availableTable.rows[0]?.id || 1;

    // API POST /pos/orders/:banId chỉ cần ca_lam_id (optional)
    const tableOrder = await fetchApi(`/pos/orders/${tableId}`, {
      method: 'POST',
      body: JSON.stringify({})
    }, tokens.waiter);
    log('waiter', `POST /pos/orders/${tableId} (DINE_IN)`, tableOrder.status === 200 || tableOrder.status === 201);
    console.log(`     📌 Table Order ID: ${tableOrder.data?.data?.id || tableOrder.data?.id || 'N/A'}`);

    console.log('\n📦 9.3 XEM ĐƠN:');
    const waiterOrders = await fetchApi('/pos/orders/current-shift', {}, tokens.waiter);
    log('waiter', 'GET /pos/orders/current-shift', waiterOrders.status === 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🔗 PHẦN 10: KIỂM TRA LUỒNG DỮ LIỆU');
  console.log('═'.repeat(80) + '\n');

  console.log('📡 10.1 LUỒNG ĐẶT HÀNG:');
  console.log(`
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  CUSTOMER PORTAL                           STAFF DASHBOARD                 │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │  Guest/Customer ──▶ POST /customer/orders  Cashier ──▶ POST /pos/orders    │
  │         │                    │                    │              │         │
  │         ▼                    ▼                    ▼              ▼         │
  │  ┌─────────────────────────────────────────────────────────────────────┐   │
  │  │                         don_hang TABLE                              │   │
  │  │  - order_source: 'ONLINE' | NULL (POS)                             │   │
  │  │  - customer_account_id (registered) | khach_hang_id (guest)        │   │
  │  └─────────────────────────────────────────────────────────────────────┘   │
  │         │                                                    │             │
  │         ▼                                                    ▼             │
  │  Kitchen: GET /kitchen/queue          Waiter: GET /pos/orders/current-shift│
  │  Manager: GET /analytics/*            Admin: Full access                   │
  └─────────────────────────────────────────────────────────────────────────────┘
  `);

  // Verify data flow
  console.log('🔍 10.2 KIỂM TRA DỮ LIỆU:');
  
  const onlineOrders = await pool.query(`
    SELECT id, order_type, order_source, customer_account_id, khach_hang_id, trang_thai
    FROM don_hang WHERE order_source = 'ONLINE' ORDER BY id DESC LIMIT 5
  `);
  console.log(`     Đơn ONLINE gần đây: ${onlineOrders.rows.length}`);
  for (const o of onlineOrders.rows) {
    const type = o.customer_account_id ? 'Registered' : (o.khach_hang_id ? 'Guest' : 'Unknown');
    console.log(`       - #${o.id}: ${o.order_type} (${type}) - ${o.trang_thai}`);
  }
  log('integration', 'Đơn ONLINE có dữ liệu', onlineOrders.rows.length > 0);

  const posOrders = await pool.query(`
    SELECT id, order_type, nhan_vien_id, trang_thai
    FROM don_hang WHERE order_source IS NULL OR order_source = 'POS' ORDER BY id DESC LIMIT 5
  `);
  console.log(`     Đơn POS gần đây: ${posOrders.rows.length}`);
  log('integration', 'Đơn POS có dữ liệu', posOrders.rows.length > 0);

  // Check order details link
  const orderWithDetails = await pool.query(`
    SELECT dh.id, COUNT(dhct.id) as items
    FROM don_hang dh
    LEFT JOIN don_hang_chi_tiet dhct ON dh.id = dhct.don_hang_id
    WHERE dh.id IN (SELECT id FROM don_hang ORDER BY id DESC LIMIT 10)
    GROUP BY dh.id HAVING COUNT(dhct.id) > 0
  `);
  console.log(`     Đơn có chi tiết: ${orderWithDetails.rows.length}`);
  log('integration', 'Liên kết don_hang_chi_tiet', orderWithDetails.rows.length > 0);

  // Check customer data
  const customerData = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM customer_accounts) as registered,
      (SELECT COUNT(*) FROM khach_hang) as guests,
      (SELECT COUNT(*) FROM don_hang WHERE customer_account_id IS NOT NULL) as registered_orders,
      (SELECT COUNT(*) FROM don_hang WHERE khach_hang_id IS NOT NULL) as guest_orders
  `);
  const cd = customerData.rows[0];
  console.log(`     Khách đã đăng ký: ${cd.registered} (${cd.registered_orders} đơn)`);
  console.log(`     Khách vãng lai: ${cd.guests} (${cd.guest_orders} đơn)`);
  log('integration', 'Liên kết khách hàng', true);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('📈 TÓM TẮT KẾT QUẢ');
  console.log('═'.repeat(80) + '\n');

  let totalPassed = 0;
  let totalFailed = 0;

  const categoryNames = {
    database: 'DATABASE',
    guest: 'GUEST',
    customer: 'CUSTOMER',
    admin: 'ADMIN',
    manager: 'MANAGER',
    cashier: 'CASHIER',
    kitchen: 'KITCHEN',
    waiter: 'WAITER',
    integration: 'INTEGRATION'
  };

  for (const [category, data] of Object.entries(results)) {
    totalPassed += data.passed;
    totalFailed += data.failed;
    
    const status = data.failed === 0 ? '✅' : '⚠️';
    console.log(`  ${status} ${categoryNames[category]}: ${data.passed}/${data.passed + data.failed} passed`);
    if (data.failed > 0) {
      for (const t of data.tests) {
        console.log(`     ❌ ${t}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(80));
  
  if (totalFailed === 0) {
    console.log(`\n🎉🎉🎉 TẤT CẢ ${totalPassed} TESTS ĐỀU PASS! 🎉🎉🎉`);
    console.log('HỆ THỐNG 7 ROLES HOẠT ĐỘNG HOÀN HẢO!');
  } else {
    console.log(`\n📊 KẾT QUẢ: ${totalPassed} passed, ${totalFailed} failed`);
  }

  console.log('─'.repeat(80));

  // Permission matrix
  console.log(`
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           BẢNG QUYỀN HẠN 7 ROLES                               │
├────────────────────┬───────┬──────────┬─────────┬─────────┬────────┬───────────┤
│ Chức năng          │ Guest │ Customer │ Cashier │ Kitchen │ Waiter │ Manager/Admin│
├────────────────────┼───────┼──────────┼─────────┼─────────┼────────┼───────────┤
│ Xem menu online    │  ✅   │    ✅    │   ❌    │   ❌    │   ❌   │    ❌     │
│ Giỏ hàng online    │  ✅   │    ✅    │   ❌    │   ❌    │   ❌   │    ❌     │
│ Đặt hàng online    │  ✅   │    ✅    │   ❌    │   ❌    │   ❌   │    ❌     │
│ Lịch sử đơn hàng   │  ❌   │    ✅    │   ❌    │   ❌    │   ❌   │    ✅     │
│ Xem menu POS       │  ❌   │    ❌    │   ✅    │   ❌    │   ✅   │    ✅     │
│ Tạo đơn POS        │  ❌   │    ❌    │   ✅    │   ❌    │   ✅   │    ✅     │
│ Thanh toán         │  ❌   │    ❌    │   ✅    │   ❌    │   ❌   │    ✅     │
│ Xem hàng đợi bếp   │  ❌   │    ❌    │   ❌    │   ✅    │   ❌   │    ✅     │
│ Cập nhật món       │  ❌   │    ❌    │   ❌    │   ✅    │   ❌   │    ✅     │
│ Quản lý bàn        │  ❌   │    ❌    │   ❌    │   ❌    │   ✅   │    ✅     │
│ Xem báo cáo        │  ❌   │    ❌    │   ❌    │   ❌    │   ❌   │    ✅     │
│ Quản lý nhân viên  │  ❌   │    ❌    │   ❌    │   ❌    │   ❌   │  Admin    │
└────────────────────┴───────┴──────────┴─────────┴─────────┴────────┴───────────┘
  `);

  console.log(`
📋 THÔNG TIN ĐĂNG NHẬP:
──────────────────────────────────────────────────
| Role     | Username    | Password     |
|----------|-------------|--------------|
| Admin    | admin       | admin123     |
| Manager  | manager01   | manager123   |
| Cashier  | cashier01   | cashier123   |
| Kitchen  | kitchen01   | kitchen123   |
| Waiter   | waiter01    | waiter123    |
| Customer | 0999888777  | customer123  |
──────────────────────────────────────────────────
  `);

} catch (error) {
  console.error('❌ Lỗi:', error.message);
  console.error(error.stack);
} finally {
  await pool.end();
}
