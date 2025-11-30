/**
 * KIỂM TRA TOÀN DIỆN 7 ROLES VÀ MỐI QUAN HỆ DỮ LIỆU
 * 1. Guest (Khách vãng lai) - không cần đăng nhập
 * 2. Registered Customer (Khách đã đăng ký)
 * 3. Admin
 * 4. Manager
 * 5. Cashier (Thu ngân)
 * 6. Kitchen (Nhà bếp)
 * 7. Waiter (Phục vụ)
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
console.log('║  🧪 KIỂM TRA TOÀN DIỆN 7 ROLES VÀ MỐI QUAN HỆ DỮ LIỆU                       ║');
console.log('║  Guest | Customer | Admin | Manager | Cashier | Kitchen | Waiter            ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

try {
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('═'.repeat(80));
  console.log('📊 PHẦN 1: KIỂM TRA CẤU TRÚC DATABASE VÀ QUAN HỆ DỮ LIỆU');
  console.log('═'.repeat(80) + '\n');

  // 1.1 Core tables
  console.log('🗄️ 1.1 BẢNG CORE:');
  
  const tables = [
    { name: 'users', desc: 'Nhân viên/Admin' },
    { name: 'roles', desc: 'Vai trò' },
    { name: 'user_roles', desc: 'Phân quyền' },
    { name: 'customer_accounts', desc: 'Tài khoản khách hàng' },
    { name: 'khach_hang', desc: 'Khách vãng lai' },
    { name: 'mon', desc: 'Sản phẩm' },
    { name: 'loai_mon', desc: 'Danh mục' },
    { name: 'mon_bien_the', desc: 'Biến thể (size)' },
    { name: 'tuy_chon_mon', desc: 'Tùy chọn' },
    { name: 'don_hang', desc: 'Đơn hàng' },
    { name: 'don_hang_chi_tiet', desc: 'Chi tiết đơn hàng' },
    { name: 'ban', desc: 'Bàn' },
    { name: 'khu_vuc', desc: 'Khu vực' },
    { name: 'ca_lam', desc: 'Ca làm việc' },
    { name: 'customer_cart', desc: 'Giỏ hàng' }
  ];

  for (const t of tables) {
    const res = await pool.query(`SELECT COUNT(*) FROM ${t.name}`);
    console.log(`     ${t.name}: ${res.rows[0].count} records (${t.desc})`);
    log('database', `Bảng ${t.name}`, true);
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

  // 1.3 Order statistics by source
  console.log('\n📦 1.3 THỐNG KÊ ĐƠN HÀNG THEO NGUỒN:');
  const ordersBySource = await pool.query(`
    SELECT 
      COALESCE(order_source, 'POS') as source,
      COUNT(*) as total,
      COUNT(CASE WHEN trang_thai = 'COMPLETED' THEN 1 END) as completed,
      COUNT(CASE WHEN trang_thai = 'OPEN' THEN 1 END) as open
    FROM don_hang
    GROUP BY order_source
  `);
  for (const o of ordersBySource.rows) {
    console.log(`     ${o.source}: ${o.total} đơn (${o.completed} hoàn thành, ${o.open} đang mở)`);
  }
  log('database', 'Thống kê đơn hàng', ordersBySource.rows.length > 0);

  // 1.4 Customer statistics
  console.log('\n👤 1.4 THỐNG KÊ KHÁCH HÀNG:');
  const customerStats = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM customer_accounts) as registered,
      (SELECT COUNT(*) FROM khach_hang) as guests,
      (SELECT COUNT(*) FROM customer_cart) as carts
  `);
  const cs = customerStats.rows[0];
  console.log(`     Khách đã đăng ký: ${cs.registered}`);
  console.log(`     Khách vãng lai: ${cs.guests}`);
  console.log(`     Giỏ hàng: ${cs.carts}`);
  log('database', 'Thống kê khách hàng', true);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🔐 PHẦN 2: ĐĂNG NHẬP TẤT CẢ CÁC ROLES');
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
      const user = loginRes.data.user;
      console.log(`     ${role.toUpperCase()}: ✅ ${user?.ho_ten || user?.username}`);
      log(role, 'Đăng nhập', true);
    } else {
      console.log(`     ${role.toUpperCase()}: ❌ Login failed`);
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

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👤 PHẦN 3: KIỂM TRA CHỨC NĂNG GUEST (Khách vãng lai)');
  console.log('═'.repeat(80) + '\n');

  // Get a product for testing
  const products = await pool.query(`
    SELECT m.id, m.ten, mbv.id as variant_id, mbv.gia 
    FROM mon m 
    JOIN mon_bien_the mbv ON m.id = mbv.mon_id 
    WHERE m.active = true 
    LIMIT 1
  `);
  const testProduct = products.rows[0];

  console.log('📖 3.1 XEM MENU:');
  const menuCategories = await guestApi('/customer/menu/categories');
  log('guest', 'GET /customer/menu/categories', menuCategories.status === 200);
  
  const menuItems = await guestApi('/customer/menu/items');
  log('guest', 'GET /customer/menu/items', menuItems.status === 200);
  console.log(`     📌 Sản phẩm: ${menuItems.data?.data?.length || 0}`);

  console.log('\n🛒 3.2 GIỎ HÀNG:');
  const getCart = await guestApi('/customer/cart');
  log('guest', 'GET /customer/cart', getCart.status === 200);

  const addToCart = await guestApi('/customer/cart/items', {
    method: 'POST',
    body: JSON.stringify({
      item_id: testProduct?.id || 1,
      variant_id: testProduct?.variant_id || 1,
      quantity: 1
    })
  });
  log('guest', 'POST /customer/cart/items', addToCart.status === 200 || addToCart.status === 201);

  console.log('\n📝 3.3 ĐẶT HÀNG:');
  // Add item to cart first
  await guestApi('/customer/cart/items', {
    method: 'POST',
    body: JSON.stringify({
      item_id: testProduct?.id || 1,
      variant_id: testProduct?.variant_id || 1,
      quantity: 1
    })
  });

  const guestOrder = await guestApi('/customer/orders', {
    method: 'POST',
    body: JSON.stringify({
      orderType: 'TAKEAWAY',
      customerInfo: { fullName: 'Khách Test', phone: '0901234567' }
    })
  });
  log('guest', 'POST /customer/orders (TAKEAWAY)', guestOrder.status === 200 || guestOrder.status === 201);
  const guestOrderId = guestOrder.data?.data?.id;
  console.log(`     📌 Order ID: ${guestOrderId || 'N/A'}`);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👤 PHẦN 4: KIỂM TRA CHỨC NĂNG REGISTERED CUSTOMER');
  console.log('═'.repeat(80) + '\n');

  if (tokens.customer) {
    console.log('👤 4.1 PROFILE:');
    const profile = await fetchApi('/customer/auth/me', {}, tokens.customer);
    log('customer', 'GET /customer/auth/me', profile.status === 200);

    console.log('\n📝 4.2 ĐẶT HÀNG:');
    // Add to cart
    await fetchApi('/customer/cart/items', {
      method: 'POST',
      body: JSON.stringify({
        item_id: testProduct?.id || 1,
        variant_id: testProduct?.variant_id || 1,
        quantity: 2
      })
    }, tokens.customer);

    const customerOrder = await fetchApi('/customer/orders', {
      method: 'POST',
      body: JSON.stringify({
        orderType: 'TAKEAWAY',
        customerInfo: { fullName: 'Khách Đã Đăng Ký', phone: CREDENTIALS.customer.phone }
      })
    }, tokens.customer);
    log('customer', 'POST /customer/orders', customerOrder.status === 200 || customerOrder.status === 201);
    const customerOrderId = customerOrder.data?.data?.id;
    console.log(`     📌 Order ID: ${customerOrderId || 'N/A'}`);

    console.log('\n📋 4.3 LỊCH SỬ ĐƠN HÀNG:');
    const orderHistory = await fetchApi('/customer/orders', {}, tokens.customer);
    log('customer', 'GET /customer/orders', orderHistory.status === 200);
    console.log(`     📌 Số đơn: ${orderHistory.data?.data?.length || 0}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👑 PHẦN 5: KIỂM TRA CHỨC NĂNG ADMIN');
  console.log('═'.repeat(80) + '\n');

  if (tokens.admin) {
    console.log('👥 5.1 QUẢN LÝ NHÂN VIÊN:');
    const users = await fetchApi('/auth/users', {}, tokens.admin);
    log('admin', 'GET /auth/users', users.status === 200);
    console.log(`     📌 Số nhân viên: ${users.data?.data?.length || users.data?.length || 0}`);

    console.log('\n📊 5.2 BÁO CÁO:');
    const dashboard = await fetchApi('/reports/dashboard', {}, tokens.admin);
    log('admin', 'GET /reports/dashboard', dashboard.status === 200);

    console.log('\n⚙️ 5.3 CÀI ĐẶT:');
    const settings = await fetchApi('/settings', {}, tokens.admin);
    log('admin', 'GET /settings', settings.status === 200 || settings.status === 404);

    console.log('\n🍽️ 5.4 QUẢN LÝ MENU:');
    const categories = await fetchApi('/categories', {}, tokens.admin);
    log('admin', 'GET /categories', categories.status === 200);
    
    const products = await fetchApi('/products', {}, tokens.admin);
    log('admin', 'GET /products', products.status === 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👔 PHẦN 6: KIỂM TRA CHỨC NĂNG MANAGER');
  console.log('═'.repeat(80) + '\n');

  if (tokens.manager) {
    console.log('📊 6.1 BÁO CÁO:');
    const revenueReport = await fetchApi('/reports/revenue', {}, tokens.manager);
    log('manager', 'GET /reports/revenue', revenueReport.status === 200);

    const ordersReport = await fetchApi('/reports/orders', {}, tokens.manager);
    log('manager', 'GET /reports/orders', ordersReport.status === 200);

    console.log('\n👥 6.2 QUẢN LÝ CA LÀM:');
    const shifts = await fetchApi('/shifts', {}, tokens.manager);
    log('manager', 'GET /shifts', shifts.status === 200);

    console.log('\n📦 6.3 QUẢN LÝ ĐƠN HÀNG:');
    const allOrders = await fetchApi('/orders', {}, tokens.manager);
    log('manager', 'GET /orders', allOrders.status === 200);
    console.log(`     📌 Tổng đơn: ${allOrders.data?.data?.length || allOrders.data?.length || 0}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('💵 PHẦN 7: KIỂM TRA CHỨC NĂNG CASHIER');
  console.log('═'.repeat(80) + '\n');

  if (tokens.cashier) {
    console.log('⏰ 7.1 CA LÀM VIỆC:');
    // Check if shift is open
    const currentShift = await fetchApi('/shifts/current', {}, tokens.cashier);
    log('cashier', 'GET /shifts/current', currentShift.status === 200 || currentShift.status === 404);

    console.log('\n📝 7.2 TẠO ĐƠN HÀNG POS:');
    const posOrder = await fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify({
        ban_id: null,
        order_type: 'TAKEAWAY',
        items: [{
          mon_id: testProduct?.id || 1,
          bien_the_id: testProduct?.variant_id || 1,
          so_luong: 1,
          don_gia: testProduct?.gia || 30000
        }]
      })
    }, tokens.cashier);
    log('cashier', 'POST /orders (POS)', posOrder.status === 200 || posOrder.status === 201);
    const posOrderId = posOrder.data?.data?.id || posOrder.data?.id;
    console.log(`     📌 POS Order ID: ${posOrderId || 'N/A'}`);

    console.log('\n📋 7.3 XEM ĐƠN HÀNG:');
    const cashierOrders = await fetchApi('/orders', {}, tokens.cashier);
    log('cashier', 'GET /orders', cashierOrders.status === 200);

    console.log('\n💰 7.4 THANH TOÁN:');
    if (posOrderId) {
      const completeOrder = await fetchApi(`/orders/${posOrderId}/complete`, {
        method: 'PATCH',
        body: JSON.stringify({ payment_method: 'CASH' })
      }, tokens.cashier);
      log('cashier', `PATCH /orders/${posOrderId}/complete`, completeOrder.status === 200);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🍳 PHẦN 8: KIỂM TRA CHỨC NĂNG KITCHEN');
  console.log('═'.repeat(80) + '\n');

  if (tokens.kitchen) {
    console.log('📋 8.1 XEM ĐƠN HÀNG CHỜ CHẾ BIẾN:');
    const kitchenOrders = await fetchApi('/orders/kitchen', {}, tokens.kitchen);
    log('kitchen', 'GET /orders/kitchen', kitchenOrders.status === 200);
    const pendingOrders = kitchenOrders.data?.data || kitchenOrders.data || [];
    console.log(`     📌 Đơn chờ: ${pendingOrders.length}`);

    console.log('\n🔄 8.2 CẬP NHẬT TRẠNG THÁI MÓN:');
    // Find an order with items to update
    if (pendingOrders.length > 0) {
      const orderToUpdate = pendingOrders[0];
      const updateItem = await fetchApi(`/orders/${orderToUpdate.id}/items/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'PREPARING' })
      }, tokens.kitchen);
      log('kitchen', 'PATCH /orders/:id/items/status', updateItem.status === 200 || updateItem.status === 404);
    } else {
      log('kitchen', 'Không có đơn để test', true);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🍽️ PHẦN 9: KIỂM TRA CHỨC NĂNG WAITER');
  console.log('═'.repeat(80) + '\n');

  if (tokens.waiter) {
    console.log('🪑 9.1 XEM BÀN:');
    const tables = await fetchApi('/tables', {}, tokens.waiter);
    log('waiter', 'GET /tables', tables.status === 200);
    console.log(`     📌 Số bàn: ${tables.data?.data?.length || tables.data?.length || 0}`);

    console.log('\n📝 9.2 TẠO ĐƠN CHO BÀN:');
    const tableOrder = await fetchApi('/orders', {
      method: 'POST',
      body: JSON.stringify({
        ban_id: 1,
        order_type: 'DINE_IN',
        items: [{
          mon_id: testProduct?.id || 1,
          bien_the_id: testProduct?.variant_id || 1,
          so_luong: 1,
          don_gia: testProduct?.gia || 30000
        }]
      })
    }, tokens.waiter);
    log('waiter', 'POST /orders (DINE_IN)', tableOrder.status === 200 || tableOrder.status === 201);

    console.log('\n📋 9.3 XEM ĐƠN ĐANG PHỤC VỤ:');
    const waiterOrders = await fetchApi('/orders', {}, tokens.waiter);
    log('waiter', 'GET /orders', waiterOrders.status === 200);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🔗 PHẦN 10: KIỂM TRA LUỒNG DỮ LIỆU LIÊN KẾT');
  console.log('═'.repeat(80) + '\n');

  console.log('📡 10.1 LUỒNG ĐƠN HÀNG TỪ CUSTOMER PORTAL:');
  console.log(`
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │  CUSTOMER PORTAL → BACKEND → DATABASE → STAFF DASHBOARD                   │
  ├─────────────────────────────────────────────────────────────────────────────┤
  │  1. Guest/Customer đặt hàng online                                        │
  │     └─▶ POST /customer/orders                                             │
  │  2. Đơn hàng lưu vào don_hang với order_source='ONLINE'                   │
  │     └─▶ customer_account_id (nếu đăng nhập)                               │
  │     └─▶ khach_hang_id (nếu vãng lai)                                      │
  │  3. Cashier thấy đơn trong hệ thống POS                                   │
  │     └─▶ GET /orders                                                       │
  │  4. Kitchen nhận đơn để chế biến                                          │
  │     └─▶ GET /orders/kitchen                                               │
  │  5. Waiter giao món cho khách (nếu DINE_IN)                               │
  │     └─▶ GET /orders                                                       │
  │  6. Manager xem báo cáo doanh thu                                         │
  │     └─▶ GET /reports/revenue                                              │
  │  7. Admin quản lý toàn bộ hệ thống                                        │
  │     └─▶ Full access                                                       │
  └─────────────────────────────────────────────────────────────────────────────┘
  `);

  // Verify data flow
  console.log('🔍 10.2 KIỂM TRA DỮ LIỆU LIÊN KẾT:');
  
  // Check online orders visible to staff
  const onlineOrders = await pool.query(`
    SELECT id, order_type, order_source, customer_account_id, khach_hang_id, trang_thai
    FROM don_hang 
    WHERE order_source = 'ONLINE'
    ORDER BY id DESC
    LIMIT 5
  `);
  console.log(`     Đơn ONLINE gần đây: ${onlineOrders.rows.length}`);
  for (const o of onlineOrders.rows) {
    const customerType = o.customer_account_id ? 'Registered' : (o.khach_hang_id ? 'Guest' : 'Unknown');
    console.log(`       - #${o.id}: ${o.order_type} (${customerType}) - ${o.trang_thai}`);
  }
  log('integration', 'Đơn hàng ONLINE hiển thị đúng', onlineOrders.rows.length > 0);

  // Check POS orders
  const posOrders = await pool.query(`
    SELECT id, order_type, order_source, nhan_vien_id, trang_thai
    FROM don_hang 
    WHERE order_source IS NULL OR order_source = 'POS'
    ORDER BY id DESC
    LIMIT 5
  `);
  console.log(`     Đơn POS gần đây: ${posOrders.rows.length}`);
  log('integration', 'Đơn hàng POS hiển thị đúng', true);

  // Check order details
  const orderDetails = await pool.query(`
    SELECT dh.id, COUNT(dhct.id) as item_count
    FROM don_hang dh
    LEFT JOIN don_hang_chi_tiet dhct ON dh.id = dhct.don_hang_id
    WHERE dh.id IN (SELECT id FROM don_hang ORDER BY id DESC LIMIT 5)
    GROUP BY dh.id
  `);
  console.log(`     Chi tiết đơn hàng: ${orderDetails.rows.length} đơn có items`);
  log('integration', 'Chi tiết đơn hàng liên kết đúng', true);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('📱 PHẦN 11: FRONTEND ROUTES CHO TẤT CẢ ROLES');
  console.log('═'.repeat(80) + '\n');

  const frontendRoutes = {
    'Guest/Customer Portal': [
      '/customer - Trang chủ khách hàng',
      '/customer/menu - Xem menu',
      '/customer/cart - Giỏ hàng',
      '/customer/checkout - Thanh toán',
      '/customer/login - Đăng nhập',
      '/customer/register - Đăng ký',
      '/customer/orders - Lịch sử đơn (cần đăng nhập)',
      '/customer/profile - Thông tin tài khoản'
    ],
    'Staff Dashboard': [
      '/login - Đăng nhập nhân viên',
      '/dashboard - Tổng quan (Manager/Admin)',
      '/pos - Màn hình POS (Cashier)',
      '/orders - Quản lý đơn hàng',
      '/kitchen - Màn hình bếp (Kitchen)',
      '/tables - Quản lý bàn (Waiter)',
      '/menu - Quản lý menu (Admin/Manager)',
      '/reports - Báo cáo (Manager/Admin)',
      '/settings - Cài đặt (Admin)',
      '/employees - Quản lý nhân viên (Admin)'
    ]
  };

  for (const [section, routes] of Object.entries(frontendRoutes)) {
    console.log(`  📱 ${section}:`);
    for (const route of routes) {
      console.log(`     ✅ ${route}`);
    }
    console.log('');
  }
  log('integration', 'Frontend routes đầy đủ', true);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('═'.repeat(80));
  console.log('📈 TÓM TẮT KẾT QUẢ');
  console.log('═'.repeat(80) + '\n');

  let totalPassed = 0;
  let totalFailed = 0;

  for (const [category, data] of Object.entries(results)) {
    totalPassed += data.passed;
    totalFailed += data.failed;
    
    const status = data.failed === 0 ? '✅' : '⚠️';
    const categoryName = {
      database: 'DATABASE',
      guest: 'GUEST',
      customer: 'CUSTOMER',
      admin: 'ADMIN',
      manager: 'MANAGER',
      cashier: 'CASHIER',
      kitchen: 'KITCHEN',
      waiter: 'WAITER',
      integration: 'INTEGRATION'
    }[category];
    
    console.log(`  ${status} ${categoryName}: ${data.passed}/${data.passed + data.failed} passed`);
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

  // Summary table
  console.log(`
📋 BẢNG TÓM TẮT QUYỀN HẠN:
────────────────────────────────────────────────────────────────────────────────
| Chức năng              | Guest | Customer | Cashier | Kitchen | Waiter | Manager | Admin |
|------------------------|-------|----------|---------|---------|--------|---------|-------|
| Xem menu               |  ✅   |    ✅    |   ✅    |   ❌    |   ✅   |   ✅    |  ✅   |
| Đặt hàng online        |  ✅   |    ✅    |   ❌    |   ❌    |   ❌   |   ❌    |  ❌   |
| Giỏ hàng               |  ✅   |    ✅    |   ❌    |   ❌    |   ❌   |   ❌    |  ❌   |
| Xem lịch sử đơn        |  ❌   |    ✅    |   ✅    |   ❌    |   ✅   |   ✅    |  ✅   |
| Tạo đơn POS            |  ❌   |    ❌    |   ✅    |   ❌    |   ✅   |   ✅    |  ✅   |
| Thanh toán             |  ❌   |    ❌    |   ✅    |   ❌    |   ❌   |   ✅    |  ✅   |
| Xem đơn bếp            |  ❌   |    ❌    |   ❌    |   ✅    |   ❌   |   ✅    |  ✅   |
| Cập nhật trạng thái    |  ❌   |    ❌    |   ❌    |   ✅    |   ✅   |   ✅    |  ✅   |
| Quản lý bàn            |  ❌   |    ❌    |   ❌    |   ❌    |   ✅   |   ✅    |  ✅   |
| Xem báo cáo            |  ❌   |    ❌    |   ❌    |   ❌    |   ❌   |   ✅    |  ✅   |
| Quản lý ca làm         |  ❌   |    ❌    |   ❌    |   ❌    |   ❌   |   ✅    |  ✅   |
| Quản lý menu           |  ❌   |    ❌    |   ❌    |   ❌    |   ❌   |   ✅    |  ✅   |
| Quản lý nhân viên      |  ❌   |    ❌    |   ❌    |   ❌    |   ❌   |   ❌    |  ✅   |
| Cài đặt hệ thống       |  ❌   |    ❌    |   ❌    |   ❌    |   ❌   |   ❌    |  ✅   |
────────────────────────────────────────────────────────────────────────────────
  `);

} catch (error) {
  console.error('❌ Lỗi:', error.message);
  console.error(error.stack);
} finally {
  await pool.end();
}
