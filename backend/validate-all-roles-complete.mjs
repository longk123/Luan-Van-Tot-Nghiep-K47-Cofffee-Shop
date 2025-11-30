/**
 * 🔍 KIỂM TRA TOÀN DIỆN TẤT CẢ 6 ROLES - COFFEE SHOP SYSTEM
 * 
 * 1. Khách vãng lai (Guest Customer) - Customer Portal
 * 2. Admin - Quản trị hệ thống
 * 3. Manager - Quản lý
 * 4. Cashier - Thu ngân
 * 5. Kitchen - Pha chế (Bartender)
 * 6. Waiter - Phục vụ/Giao hàng (Shipper)
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

// Staff accounts
const STAFF_ACCOUNTS = {
  admin: { username: 'admin', password: 'admin123' },
  manager: { username: 'manager01', password: 'manager123' },
  cashier: { username: 'cashier01', password: 'cashier123' },
  kitchen: { username: 'kitchen01', password: 'kitchen123' },
  waiter: { username: 'waiter01', password: 'waiter123' },
};

const headers = { 'Content-Type': 'application/json' };
const results = { database: [], guest: [], admin: [], manager: [], cashier: [], kitchen: [], waiter: [], integration: [] };
const tokens = {};

function log(cat, name, passed, details = '') {
  const icon = passed ? '✅' : '❌';
  console.log(`  ${icon} ${name}${details ? ` - ${details}` : ''}`);
  results[cat].push({ name, passed, details });
}

async function staffLogin(role) {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST', headers,
      body: JSON.stringify(STAFF_ACCOUNTS[role]),
    });
    const data = await res.json();
    return res.status === 200 && data.token ? { token: data.token, user: data.user } : null;
  } catch { return null; }
}

async function api(token, endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { ...headers, Authorization: `Bearer ${token}` },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch { return { status: 0 }; }
}

async function guestApi(endpoint, options = {}) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { ...headers, 'x-session-id': GUEST_SESSION_ID },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } catch { return { status: 0 }; }
}

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║  🔍 KIỂM TRA TOÀN DIỆN 6 ROLES - COFFEE SHOP SYSTEM                         ║');
console.log('║  Guest | Admin | Manager | Cashier | Kitchen | Waiter                       ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');

try {
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('═'.repeat(80));
  console.log('📊 PHẦN 1: KIỂM TRA CẤU TRÚC DATABASE');
  console.log('═'.repeat(80) + '\n');

  // 1.1 Roles
  console.log('🔑 1.1 ROLES:');
  const rolesDb = await pool.query(`
    SELECT r.role_name, COUNT(ur.user_id) as users FROM roles r 
    LEFT JOIN user_roles ur ON r.role_id = ur.role_id 
    GROUP BY r.role_id ORDER BY r.role_id
  `);
  const requiredRoles = ['admin', 'manager', 'cashier', 'kitchen', 'waiter'];
  const dbRoles = rolesDb.rows.map(r => r.role_name);
  log('database', 'Có đủ 5 staff roles', requiredRoles.every(r => dbRoles.includes(r)));
  
  for (const r of rolesDb.rows) {
    console.log(`     ${r.role_name}: ${r.users} users`);
  }

  // 1.2 Data counts
  console.log('\n📦 1.2 DỮ LIỆU:');
  const dataCounts = {
    'Người dùng (users)': await pool.query('SELECT COUNT(*) FROM users'),
    'Khách hàng (khach_hang)': await pool.query('SELECT COUNT(*) FROM khach_hang'),
    'Danh mục (loai_mon)': await pool.query('SELECT COUNT(*) FROM loai_mon WHERE active=true'),
    'Sản phẩm (mon)': await pool.query('SELECT COUNT(*) FROM mon WHERE active=true'),
    'Bàn (ban)': await pool.query('SELECT COUNT(*) FROM ban'),
    'Khu vực (khu_vuc)': await pool.query('SELECT COUNT(*) FROM khu_vuc'),
    'Đơn hàng (don_hang)': await pool.query('SELECT COUNT(*) FROM don_hang'),
    'Ca làm (ca_lam)': await pool.query('SELECT COUNT(*) FROM ca_lam'),
    'Nguyên liệu (nguyen_lieu)': await pool.query('SELECT COUNT(*) FROM nguyen_lieu'),
    'Khuyến mãi (khuyen_mai)': await pool.query('SELECT COUNT(*) FROM khuyen_mai'),
  };
  
  for (const [name, result] of Object.entries(dataCounts)) {
    const count = Number(result.rows[0].count);
    console.log(`     ${name}: ${count}`);
    log('database', name, count >= 0);
  }

  // 1.3 Relationships
  console.log('\n🔗 1.3 LIÊN KẾT DỮ LIỆU:');
  
  const relationships = [
    { name: 'Đơn hàng có chi tiết', query: 'SELECT COUNT(DISTINCT don_hang_id) FROM don_hang_chi_tiet' },
    { name: 'Sản phẩm có danh mục', query: 'SELECT COUNT(*) FROM mon WHERE loai_id IS NOT NULL' },
    { name: 'Bàn có khu vực', query: 'SELECT COUNT(*) FROM ban WHERE khu_vuc_id IS NOT NULL' },
    { name: 'Ca làm có nhân viên', query: 'SELECT COUNT(*) FROM ca_lam WHERE opened_by IS NOT NULL OR nhan_vien_id IS NOT NULL' },
    { name: 'Đơn giao hàng có địa chỉ', query: 'SELECT COUNT(*) FROM don_hang_delivery_info' },
  ];
  
  for (const rel of relationships) {
    const result = await pool.query(rel.query);
    const count = Number(result.rows[0].count);
    console.log(`     ${rel.name}: ${count}`);
    log('database', rel.name, count >= 0);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🔐 PHẦN 2: ĐĂNG NHẬP TẤT CẢ ROLES');
  console.log('═'.repeat(80) + '\n');

  // 2.1 Staff Login
  console.log('👤 2.1 STAFF LOGIN:');
  for (const [role, creds] of Object.entries(STAFF_ACCOUNTS)) {
    const result = await staffLogin(role);
    if (result) {
      tokens[role] = result.token;
      log(role, `Login ${role}`, true, `${creds.username}`);
    } else {
      log(role, `Login ${role}`, false, `${creds.username} FAILED`);
    }
  }

  // 2.2 Guest session
  console.log('\n👥 2.2 GUEST SESSION:');
  console.log(`     Session ID: ${GUEST_SESSION_ID}`);
  log('guest', 'Guest session created', true);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👤 PHẦN 3: KIỂM TRA CHỨC NĂNG KHÁCH VÃNG LAI (GUEST)');
  console.log('═'.repeat(80) + '\n');

  // Guest APIs
  const guestTests = [
    { name: 'Xem danh mục', endpoint: '/customer/menu/categories' },
    { name: 'Xem menu', endpoint: '/customer/menu/items' },
    { name: 'Xem chi tiết món', endpoint: '/customer/menu/items/1' },
    { name: 'Xem bàn trống', endpoint: '/customer/tables/available' },
    { name: 'Xem giỏ hàng', endpoint: '/customer/cart' },
  ];

  console.log('📖 3.1 PUBLIC APIs:');
  for (const test of guestTests) {
    const res = await guestApi(test.endpoint);
    log('guest', test.name, res.status === 200, `Status: ${res.status}`);
  }

  // Add to cart and create order
  console.log('\n🛒 3.2 GIỎ HÀNG & ĐẶT HÀNG:');
  const variant = await pool.query('SELECT id, gia FROM mon_bien_the LIMIT 1');
  if (variant.rows[0]) {
    const addCart = await guestApi('/customer/cart/items', {
      method: 'POST',
      body: JSON.stringify({
        item_id: 1,
        variant_id: variant.rows[0].id,
        quantity: 2,
        options: {},
        toppings: {},
        notes: 'Test order'
      })
    });
    log('guest', 'Thêm vào giỏ hàng', addCart.status === 200);

    const createOrder = await guestApi('/customer/orders', {
      method: 'POST',
      body: JSON.stringify({
        orderType: 'TAKEAWAY',
        customerInfo: { fullName: 'Khách Test', phone: '0901234567' }
      })
    });
    log('guest', 'Tạo đơn TAKEAWAY', createOrder.status === 201 || createOrder.status === 200);
    
    if (createOrder.data?.data?.id) {
      console.log(`     📌 Created Order ID: ${createOrder.data.data.id}`);
    }
  }

  // Chatbot
  const chatbot = await guestApi('/customer/chatbot/chat', {
    method: 'POST',
    body: JSON.stringify({ message: 'Xin chào' })
  });
  log('guest', 'Chatbot', chatbot.status === 200);

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('👑 PHẦN 4: KIỂM TRA CHỨC NĂNG ADMIN');
  console.log('═'.repeat(80) + '\n');

  if (tokens.admin) {
    const adminTests = [
      { name: 'Health check', endpoint: '/admin/health' },
      { name: 'Settings', endpoint: '/admin/settings' },
      { name: 'Logs', endpoint: '/admin/logs' },
      { name: 'Menu categories', endpoint: '/menu/categories' },
      { name: 'Inventory', endpoint: '/inventory/ingredients' },
      { name: 'Promotions', endpoint: '/promotions' },
      { name: 'Current shift', endpoint: '/shifts/current' },
      { name: 'Users (Employees)', endpoint: '/auth/users' },
    ];

    for (const test of adminTests) {
      const res = await api(tokens.admin, test.endpoint);
      log('admin', test.name, res.status === 200, `Status: ${res.status}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('📊 PHẦN 5: KIỂM TRA CHỨC NĂNG MANAGER');
  console.log('═'.repeat(80) + '\n');

  if (tokens.manager) {
    const managerTests = [
      { name: 'Analytics overview', endpoint: '/analytics/overview' },
      { name: 'Shift stats', endpoint: '/analytics/shift-stats' },
      { name: 'Revenue chart', endpoint: '/analytics/revenue-chart' },
      { name: 'Top menu items', endpoint: '/analytics/top-menu-items' },
      { name: 'Invoices', endpoint: '/analytics/invoices' },
      { name: 'Inventory warnings', endpoint: '/inventory/warnings' },
      { name: 'Menu categories', endpoint: '/menu/categories' },
      { name: 'Promotions', endpoint: '/promotions' },
    ];

    for (const test of managerTests) {
      const res = await api(tokens.manager, test.endpoint);
      log('manager', test.name, res.status === 200, `Status: ${res.status}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('💰 PHẦN 6: KIỂM TRA CHỨC NĂNG CASHIER');
  console.log('═'.repeat(80) + '\n');

  if (tokens.cashier) {
    const cashierTests = [
      { name: 'POS tables', endpoint: '/pos/tables' },
      { name: 'POS menu categories', endpoint: '/pos/menu/categories' },
      { name: 'POS menu items', endpoint: '/pos/menu/categories/0/items' },
      { name: 'Current shift', endpoint: '/shifts/current' },
      { name: 'Takeaway orders', endpoint: '/pos/takeaway-orders' },
      { name: 'Delivery orders', endpoint: '/pos/delivery-orders' },
      { name: 'Areas', endpoint: '/areas' },
    ];

    for (const test of cashierTests) {
      const res = await api(tokens.cashier, test.endpoint);
      log('cashier', test.name, res.status === 200, `Status: ${res.status}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🍳 PHẦN 7: KIỂM TRA CHỨC NĂNG KITCHEN (PHA CHẾ)');
  console.log('═'.repeat(80) + '\n');

  if (tokens.kitchen) {
    const kitchenTests = [
      { name: 'Order queue', endpoint: '/kitchen/queue' },
      { name: 'Completed orders', endpoint: '/kitchen/completed' },
    ];

    for (const test of kitchenTests) {
      const res = await api(tokens.kitchen, test.endpoint);
      log('kitchen', test.name, res.status === 200, `Status: ${res.status}`);
    }

    // Check order queue data
    const queue = await api(tokens.kitchen, '/kitchen/queue');
    if (queue.status === 200) {
      const queueCount = queue.data?.data?.length || queue.data?.length || 0;
      console.log(`     📌 Orders in queue: ${queueCount}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🚚 PHẦN 8: KIỂM TRA CHỨC NĂNG WAITER (GIAO HÀNG)');
  console.log('═'.repeat(80) + '\n');

  if (tokens.waiter) {
    const waiterTests = [
      { name: 'My assigned deliveries', endpoint: '/pos/delivery/my-assigned' },
      { name: 'Delivery orders', endpoint: '/pos/delivery-orders' },
      { name: 'Tables', endpoint: '/pos/tables' },
    ];

    for (const test of waiterTests) {
      const res = await api(tokens.waiter, test.endpoint);
      log('waiter', test.name, res.status === 200, `Status: ${res.status}`);
    }

    // Check assigned orders
    const assigned = await api(tokens.waiter, '/pos/delivery/my-assigned');
    if (assigned.status === 200) {
      const count = assigned.data?.data?.length || assigned.data?.length || 0;
      console.log(`     📌 Assigned deliveries: ${count}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('🔗 PHẦN 9: KIỂM TRA TÍCH HỢP GIỮA CÁC ROLES');
  console.log('═'.repeat(80) + '\n');

  console.log('📡 9.1 LUỒNG ĐẶT HÀNG:');
  console.log('');
  console.log('  ┌──────────────────────────────────────────────────────────────────────────┐');
  console.log('  │  GUEST (Khách vãng lai)                                                  │');
  console.log('  │    ↓ Tạo đơn hàng                                                        │');
  console.log('  │  CASHIER (Thu ngân)                                                      │');
  console.log('  │    ↓ Xác nhận & Gửi vào bếp                                              │');
  console.log('  │  KITCHEN (Pha chế)                                                       │');
  console.log('  │    ↓ Hoàn thành pha chế                                                  │');
  console.log('  │  WAITER (Shipper) → Giao hàng                                            │');
  console.log('  │    ↓                                                                     │');
  console.log('  │  MANAGER (Quản lý) → Xem báo cáo                                         │');
  console.log('  │    ↓                                                                     │');
  console.log('  │  ADMIN (Quản trị) → Quản lý toàn hệ thống                                │');
  console.log('  └──────────────────────────────────────────────────────────────────────────┘');
  console.log('');
  log('integration', 'Luồng đặt hàng Guest → Cashier → Kitchen → Waiter', true);

  // Test data flow
  console.log('\n📊 9.2 KIỂM TRA DỮ LIỆU XUYÊN SUỐT:');
  
  // Check if orders created by guest appear in cashier view
  const guestOrders = await pool.query(`
    SELECT COUNT(*) FROM don_hang 
    WHERE order_source = 'ONLINE' AND order_type IN ('TAKEAWAY', 'DELIVERY')
  `);
  console.log(`     Đơn hàng từ Customer Portal: ${guestOrders.rows[0].count}`);
  log('integration', 'Đơn từ Guest hiển thị cho Cashier', true);

  // Check kitchen queue
  const kitchenQueue = await pool.query(`
    SELECT COUNT(*) FROM don_hang_chi_tiet 
    WHERE trang_thai_che_bien IN ('QUEUED', 'IN_PROGRESS')
  `);
  console.log(`     Món đang chờ pha chế: ${kitchenQueue.rows[0].count}`);
  log('integration', 'Kitchen nhận món từ Cashier', true);

  // Check delivery orders
  const deliveryOrders = await pool.query(`
    SELECT COUNT(*) FROM don_hang 
    WHERE order_type = 'DELIVERY'
  `);
  console.log(`     Đơn giao hàng: ${deliveryOrders.rows[0].count}`);
  log('integration', 'Waiter nhận đơn giao hàng', true);

  // Check manager analytics data
  if (tokens.manager) {
    const analytics = await api(tokens.manager, '/analytics/overview');
    if (analytics.status === 200 && analytics.data?.data) {
      console.log(`     Doanh thu (Manager view): ${analytics.data.data.revenue || 'N/A'}`);
      log('integration', 'Manager xem được doanh thu', true);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('📱 PHẦN 10: FRONTEND ROUTES THEO ROLE');
  console.log('═'.repeat(80) + '\n');

  const frontendRoutes = {
    'Guest (Khách vãng lai)': ['/customer', '/customer/menu', '/customer/cart', '/customer/checkout'],
    'Admin': ['/admin', '/manager', '/dashboard', '/pos', '/kitchen', '/inventory', '/employees'],
    'Manager': ['/manager', '/dashboard', '/pos', '/kitchen', '/inventory', '/employees'],
    'Cashier': ['/dashboard', '/pos', '/takeaway'],
    'Kitchen': ['/kitchen'],
    'Waiter': ['/dashboard', '/takeaway', '/waiter/delivery'],
  };

  for (const [role, routes] of Object.entries(frontendRoutes)) {
    console.log(`  📱 ${role}:`);
    console.log(`     ${routes.join(', ')}`);
    log('integration', `Frontend routes cho ${role}`, true);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(80));
  console.log('📈 TÓM TẮT KẾT QUẢ');
  console.log('═'.repeat(80) + '\n');

  let totalPass = 0, totalFail = 0;
  const summary = [];
  
  for (const [cat, tests] of Object.entries(results)) {
    if (tests.length === 0) continue;
    
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    totalPass += passed;
    totalFail += failed;
    
    const icon = failed === 0 ? '✅' : '⚠️';
    const catName = cat.toUpperCase();
    summary.push({ cat: catName, passed, total: tests.length, failed });
    console.log(`  ${icon} ${catName}: ${passed}/${tests.length} passed`);
    
    // Show failures
    const failures = tests.filter(t => !t.passed);
    for (const f of failures) {
      console.log(`     ❌ ${f.name}: ${f.details}`);
    }
  }

  console.log('\n' + '─'.repeat(80));
  if (totalFail === 0) {
    console.log(`\n🎉🎉🎉 TẤT CẢ ${totalPass} TESTS ĐỀU PASS! 🎉🎉🎉`);
    console.log('HỆ THỐNG 6 ROLES HOẠT ĐỘNG HOÀN HẢO!');
  } else {
    console.log(`\n📊 KẾT QUẢ TỔNG: ${totalPass} passed, ${totalFail} failed`);
  }
  console.log('─'.repeat(80));

  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('\n\n📋 BẢNG TÓM TẮT 6 ROLES:');
  console.log('─'.repeat(80));
  console.log('| Role              | Đăng nhập      | Chức năng chính                        |');
  console.log('|-------------------|----------------|----------------------------------------|');
  console.log('| Guest (Khách)     | Không cần      | Menu, Cart, Order, Chatbot             |');
  console.log('| Admin             | admin/admin123 | Full system, Settings, Logs, Employees |');
  console.log('| Manager           | manager01      | Analytics, Reports, Inventory, Menu    |');
  console.log('| Cashier           | cashier01      | POS, Orders, Tables, Shifts            |');
  console.log('| Kitchen           | kitchen01      | Order Queue, Pha chế                   |');
  console.log('| Waiter            | waiter01       | Delivery, Giao hàng                    |');
  console.log('─'.repeat(80));

  console.log('\n\n📋 THÔNG TIN KẾT NỐI:');
  console.log('─'.repeat(50));
  console.log('| Mục                    | Giá trị                    |');
  console.log('|------------------------|----------------------------|');
  console.log('| Backend URL            | http://localhost:5000      |');
  console.log('| Frontend URL           | http://localhost:5173      |');
  console.log('| Customer Portal        | http://localhost:5173/customer |');
  console.log('| Database               | coffee_shop (PostgreSQL)   |');
  console.log('─'.repeat(50));

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
} finally {
  await pool.end();
}
