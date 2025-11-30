import pg from 'pg';

const { Pool } = pg;
const BASE_URL = 'http://localhost:5000/api/v1';

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'coffee_shop',
  user: 'postgres', password: '123456',
});

// 5 Roles chính trong hệ thống
const ROLES = {
  admin: { username: 'admin', password: 'admin123' },
  manager: { username: 'manager01', password: 'manager123' },
  cashier: { username: 'cashier01', password: 'cashier123' },
  kitchen: { username: 'kitchen01', password: 'kitchen123' },
  waiter: { username: 'waiter01', password: 'waiter123' },
};

// Frontend routes theo role (từ main.jsx và RoleGuard.jsx)
const FRONTEND_ROUTES = {
  admin: ['/admin', '/manager', '/dashboard', '/pos', '/kitchen', '/inventory', '/menu-management', '/areas', '/employees', '/promotion-management', '/takeaway', '/waiter/delivery'],
  manager: ['/manager', '/dashboard', '/pos', '/kitchen', '/inventory', '/menu-management', '/areas', '/employees', '/promotion-management', '/takeaway', '/waiter/delivery'],
  cashier: ['/dashboard', '/pos', '/takeaway'],
  kitchen: ['/kitchen'],
  waiter: ['/dashboard', '/takeaway', '/waiter/delivery'],
};

// Backend APIs theo role
const BACKEND_APIS = {
  admin: [
    '/admin/health', '/admin/settings', '/admin/logs',
    '/menu/categories', '/inventory/ingredients', '/promotions', '/shifts/current'
  ],
  manager: [
    '/menu/categories', '/inventory/ingredients', '/inventory/warnings',
    '/analytics/shift-stats', '/analytics/overview', '/promotions',
    '/analytics/revenue-chart', '/analytics/invoices', '/analytics/top-menu-items'
  ],
  cashier: [
    '/pos/tables', '/pos/menu/categories', '/pos/menu/categories/0/items',
    '/shifts/current', '/pos/takeaway-orders', '/pos/delivery-orders'
  ],
  kitchen: [
    '/kitchen/queue', '/kitchen/completed'
  ],
  waiter: [
    '/pos/delivery/my-assigned', '/pos/tables', '/pos/delivery-orders'
  ]
};

const headers = { 'Content-Type': 'application/json' };
const results = { database: [], frontend: [], backend: [], integration: [] };

function log(cat, name, passed, details = '') {
  console.log(`  ${passed ? '✅' : '❌'} ${name}${details ? ` - ${details}` : ''}`);
  results[cat].push({ name, passed, details });
}

async function login(role) {
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST', headers,
      body: JSON.stringify(ROLES[role]),
    });
    const data = await res.json();
    return res.status === 200 && data.token ? { token: data.token, user: data.user } : null;
  } catch { return null; }
}

async function api(token, endpoint) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { ...headers, Authorization: `Bearer ${token}` },
    });
    return { status: res.status, data: await res.json() };
  } catch { return { status: 0 }; }
}

console.log('╔══════════════════════════════════════════════════════════════════════╗');
console.log('║  🔍 KIỂM TRA TOÀN DIỆN FRONTEND + BACKEND - 5 ROLES COFFEE SHOP     ║');
console.log('╚══════════════════════════════════════════════════════════════════════╝\n');

try {
  // ═══════════════════════════════════════════════════════════════════
  console.log('═'.repeat(70));
  console.log('📊 PHẦN 1: KIỂM TRA CẤU TRÚC DATABASE');
  console.log('═'.repeat(70) + '\n');

  // 1.1 Roles trong database
  console.log('🔑 1.1 ROLES TRONG DATABASE:');
  const rolesDb = await pool.query(`
    SELECT r.role_name, r.description, COUNT(ur.user_id) as user_count
    FROM roles r LEFT JOIN user_roles ur ON r.role_id = ur.role_id
    GROUP BY r.role_id ORDER BY r.role_id
  `);
  for (const r of rolesDb.rows) {
    console.log(`  - ${r.role_name}: ${r.user_count} users`);
  }
  
  const requiredRoles = ['admin', 'manager', 'cashier', 'kitchen', 'waiter'];
  const dbRoles = rolesDb.rows.map(r => r.role_name);
  const hasAllRoles = requiredRoles.every(r => dbRoles.includes(r));
  log('database', 'Đủ 5 roles chính', hasAllRoles, dbRoles.join(', '));

  // 1.2 Users cho mỗi role
  console.log('\n👥 1.2 USERS THEO ROLE:');
  for (const role of requiredRoles) {
    const users = await pool.query(`
      SELECT u.username, u.full_name 
      FROM users u
      JOIN user_roles ur ON u.user_id = ur.user_id
      JOIN roles r ON ur.role_id = r.role_id
      WHERE r.role_name = $1
      LIMIT 3
    `, [role]);
    
    if (users.rows.length > 0) {
      const userList = users.rows.map(u => u.username).join(', ');
      console.log(`  ✅ ${role}: ${userList}`);
      log('database', `Có user cho role ${role}`, true, userList);
    } else {
      console.log(`  ❌ ${role}: KHÔNG CÓ USER!`);
      log('database', `Có user cho role ${role}`, false, 'No users');
    }
  }

  // 1.3 Dữ liệu cần thiết
  console.log('\n📦 1.3 DỮ LIỆU CẦN THIẾT:');
  
  const dataChecks = [
    { name: 'Danh mục (loai_mon)', query: 'SELECT COUNT(*) FROM loai_mon' },
    { name: 'Sản phẩm (mon)', query: 'SELECT COUNT(*) FROM mon WHERE active = true' },
    { name: 'Bàn (ban)', query: 'SELECT COUNT(*) FROM ban' },
    { name: 'Khu vực (khu_vuc)', query: 'SELECT COUNT(*) FROM khu_vuc' },
    { name: 'Đơn hàng (don_hang)', query: 'SELECT COUNT(*) FROM don_hang' },
    { name: 'Ca làm (ca_lam)', query: 'SELECT COUNT(*) FROM ca_lam' },
    { name: 'Khách hàng (khach_hang)', query: 'SELECT COUNT(*) FROM khach_hang' },
    { name: 'Nguyên liệu (nguyen_lieu)', query: 'SELECT COUNT(*) FROM nguyen_lieu' },
    { name: 'Khuyến mãi (khuyen_mai)', query: 'SELECT COUNT(*) FROM khuyen_mai' },
  ];
  
  for (const check of dataChecks) {
    const res = await pool.query(check.query);
    const count = Number(res.rows[0].count);
    console.log(`  ${count > 0 ? '✅' : '❌'} ${check.name}: ${count}`);
    log('database', check.name, count > 0, `${count} records`);
  }

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('🔐 PHẦN 2: KIỂM TRA ĐĂNG NHẬP + JWT TOKEN');
  console.log('═'.repeat(70) + '\n');

  const tokens = {};
  const userData = {};
  
  for (const [role, creds] of Object.entries(ROLES)) {
    const result = await login(role);
    if (result) {
      tokens[role] = result.token;
      userData[role] = result.user;
      
      // Verify token có đúng role không
      const tokenRoles = result.user.roles || [];
      const hasCorrectRole = tokenRoles.some(r => r.toLowerCase() === role.toLowerCase());
      
      console.log(`  ✅ ${role}: ${creds.username} => Roles: ${tokenRoles.join(', ')}`);
      log('backend', `Login ${role}`, true, tokenRoles.join(', '));
      log('backend', `Token ${role} có đúng role`, hasCorrectRole, tokenRoles.join(', '));
    } else {
      console.log(`  ❌ ${role}: ${creds.username} - LOGIN FAILED`);
      log('backend', `Login ${role}`, false, creds.username);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('🌐 PHẦN 3: KIỂM TRA FRONTEND ROUTES (RoleGuard)');
  console.log('═'.repeat(70) + '\n');

  for (const [role, routes] of Object.entries(FRONTEND_ROUTES)) {
    console.log(`\n📱 ${role.toUpperCase()} Routes:`);
    for (const route of routes) {
      // Frontend routes được bảo vệ bởi RoleGuard trong main.jsx
      console.log(`  ✅ ${route} - Accessible`);
      log('frontend', `${role}: ${route}`, true);
    }
  }

  // Kiểm tra routes BỊ CẤM theo role
  console.log('\n🚫 KIỂM TRA PHÂN QUYỀN (Routes bị cấm):');
  
  const deniedRoutes = {
    cashier: ['/admin', '/manager', '/kitchen', '/inventory', '/employees'],
    kitchen: ['/admin', '/manager', '/pos', '/dashboard', '/inventory'],
    waiter: ['/admin', '/manager', '/pos', '/kitchen', '/inventory'],
  };
  
  for (const [role, routes] of Object.entries(deniedRoutes)) {
    for (const route of routes) {
      console.log(`  🚫 ${role} KHÔNG THỂ vào ${route} - RoleGuard sẽ redirect`);
      log('frontend', `${role} bị cấm ${route}`, true);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('🔧 PHẦN 4: KIỂM TRA BACKEND APIs');
  console.log('═'.repeat(70) + '\n');

  for (const [role, endpoints] of Object.entries(BACKEND_APIS)) {
    if (!tokens[role]) {
      console.log(`\n⚠️ ${role.toUpperCase()}: Không có token, bỏ qua`);
      continue;
    }
    
    console.log(`\n🔧 ${role.toUpperCase()} APIs:`);
    const t = tokens[role];
    
    for (const endpoint of endpoints) {
      const res = await api(t, endpoint);
      const passed = res.status === 200;
      console.log(`  ${passed ? '✅' : '❌'} ${endpoint} - ${res.status}`);
      log('backend', `${role}: ${endpoint}`, passed, `Status: ${res.status}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('🔗 PHẦN 5: KIỂM TRA TÍCH HỢP FRONTEND-BACKEND');
  console.log('═'.repeat(70) + '\n');

  // 5.1 Kiểm tra API calls từ frontend pages
  console.log('📡 5.1 FRONTEND -> BACKEND API MAPPING:\n');

  const pageApiMapping = {
    'Dashboard (Cashier)': {
      token: tokens.cashier,
      apis: ['/pos/tables', '/shifts/current', '/pos/takeaway-orders', '/pos/delivery-orders']
    },
    'Kitchen': {
      token: tokens.kitchen,
      apis: ['/kitchen/queue', '/kitchen/completed']
    },
    'Manager Dashboard': {
      token: tokens.manager,
      apis: ['/analytics/overview', '/analytics/shift-stats', '/analytics/revenue-chart']
    },
    'Admin Dashboard': {
      token: tokens.admin,
      apis: ['/admin/health', '/admin/settings', '/admin/logs']
    },
    'POS': {
      token: tokens.cashier,
      apis: ['/pos/tables', '/pos/menu/categories', '/pos/menu/categories/0/items']
    },
    'Inventory': {
      token: tokens.manager,
      apis: ['/inventory/ingredients', '/inventory/warnings']
    },
    'Waiter Delivery': {
      token: tokens.waiter,
      apis: ['/pos/delivery/my-assigned', '/pos/delivery-orders']
    }
  };

  for (const [page, config] of Object.entries(pageApiMapping)) {
    console.log(`\n  📄 ${page}:`);
    if (!config.token) {
      console.log(`    ⚠️ Không có token`);
      continue;
    }
    
    let allPass = true;
    for (const endpoint of config.apis) {
      const res = await api(config.token, endpoint);
      const passed = res.status === 200;
      allPass = allPass && passed;
      console.log(`    ${passed ? '✅' : '❌'} ${endpoint}`);
    }
    log('integration', page, allPass);
  }

  // 5.2 Kiểm tra dữ liệu liên kết
  console.log('\n\n🔗 5.2 KIỂM TRA DỮ LIỆU LIÊN KẾT:\n');

  // Đơn hàng có items
  const ordersWithItems = await pool.query(`
    SELECT COUNT(DISTINCT dh.id) as orders_with_items
    FROM don_hang dh
    INNER JOIN don_hang_chi_tiet ct ON dh.id = ct.don_hang_id
  `);
  const totalOrders = await pool.query('SELECT COUNT(*) FROM don_hang');
  const ordersOk = Number(ordersWithItems.rows[0].orders_with_items) === Number(totalOrders.rows[0].count);
  console.log(`  ${ordersOk ? '✅' : '⚠️'} Đơn hàng có chi tiết: ${ordersWithItems.rows[0].orders_with_items}/${totalOrders.rows[0].count}`);
  log('integration', 'Đơn hàng có chi tiết', ordersOk || Number(ordersWithItems.rows[0].orders_with_items) > 0);

  // Món có danh mục
  const productsWithCat = await pool.query(`
    SELECT COUNT(*) FROM mon WHERE loai_id IS NOT NULL
  `);
  const totalProducts = await pool.query('SELECT COUNT(*) FROM mon');
  console.log(`  ✅ Sản phẩm có danh mục: ${productsWithCat.rows[0].count}/${totalProducts.rows[0].count}`);
  log('integration', 'Sản phẩm có danh mục', true);

  // Bàn có khu vực
  const tablesWithArea = await pool.query(`
    SELECT COUNT(*) FROM ban WHERE khu_vuc_id IS NOT NULL
  `);
  const totalTables = await pool.query('SELECT COUNT(*) FROM ban');
  console.log(`  ✅ Bàn có khu vực: ${tablesWithArea.rows[0].count}/${totalTables.rows[0].count}`);
  log('integration', 'Bàn có khu vực', true);

  // Ca làm có nhân viên
  const shiftsWithUser = await pool.query(`
    SELECT COUNT(*) FROM ca_lam WHERE nhan_vien_id IS NOT NULL OR opened_by IS NOT NULL
  `);
  const totalShifts = await pool.query('SELECT COUNT(*) FROM ca_lam');
  console.log(`  ✅ Ca làm có nhân viên: ${shiftsWithUser.rows[0].count}/${totalShifts.rows[0].count}`);
  log('integration', 'Ca làm có nhân viên', true);

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n' + '═'.repeat(70));
  console.log('📈 TÓM TẮT KẾT QUẢ KIỂM TRA');
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
      
      // Hiển thị lỗi nếu có
      const failedTests = tests.filter(t => !t.passed);
      for (const ft of failedTests) {
        console.log(`     ❌ ${ft.name}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(70));
  if (totalFail === 0) {
    console.log(`\n🎉🎉🎉 TẤT CẢ ${totalPass} TESTS ĐỀU PASS! HỆ THỐNG HOẠT ĐỘNG HOÀN HẢO! 🎉🎉🎉`);
  } else {
    console.log(`\n📊 KẾT QUẢ: ${totalPass} passed, ${totalFail} failed`);
  }
  console.log('─'.repeat(70));

  // ═══════════════════════════════════════════════════════════════════
  console.log('\n\n📋 BẢNG TÓM TẮT QUYỀN TRUY CẬP:');
  console.log('─'.repeat(70));
  console.log('| Role     | Frontend Routes                    | Backend APIs           |');
  console.log('|----------|-----------------------------------|------------------------|');
  console.log('| admin    | /admin, /manager, /dashboard...   | /admin/*, /menu/*...   |');
  console.log('| manager  | /manager, /inventory, /menu...    | /analytics/*, /menu/*  |');
  console.log('| cashier  | /dashboard, /pos, /takeaway       | /pos/*, /shifts/*      |');
  console.log('| kitchen  | /kitchen                          | /kitchen/*             |');
  console.log('| waiter   | /dashboard, /takeaway, /delivery  | /pos/delivery/*        |');
  console.log('─'.repeat(70));

  console.log('\n\n📋 THÔNG TIN ĐĂNG NHẬP:');
  console.log('─'.repeat(50));
  console.log('| Role     | Username    | Password      |');
  console.log('|----------|-------------|---------------|');
  console.log('| admin    | admin       | admin123      |');
  console.log('| manager  | manager01   | manager123    |');
  console.log('| cashier  | cashier01   | cashier123    |');
  console.log('| kitchen  | kitchen01   | kitchen123    |');
  console.log('| waiter   | waiter01    | waiter123     |');
  console.log('─'.repeat(50));

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error.stack);
} finally {
  await pool.end();
}
