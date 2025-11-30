import pg from 'pg';

const { Pool } = pg;
const BASE_URL = 'http://localhost:5000/api/v1';

const pool = new Pool({
  host: 'localhost', port: 5432, database: 'coffee_shop',
  user: 'postgres', password: '123456',
});

// Roles: admin, manager, cashier, kitchen (bartender), waiter (shipper/delivery)
const ROLES = {
  admin: { username: 'admin', password: 'admin123' },
  manager: { username: 'manager01', password: 'manager123' },
  cashier: { username: 'cashier01', password: 'cashier123' },
  kitchen: { username: 'kitchen01', password: 'kitchen123' },
  waiter: { username: 'waiter01', password: 'waiter123' },
};

const headers = { 'Content-Type': 'application/json' };
const results = { database: [], admin: [], manager: [], cashier: [], kitchen: [], waiter: [] };

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
    if (res.status === 200 && data.token) {
      return { token: data.token, user: data.user };
    }
    return null;
  } catch (e) { 
    console.log(`    [Debug] Login ${role} error:`, e.message);
    return null; 
  }
}

async function api(token, endpoint) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: { ...headers, Authorization: `Bearer ${token}` },
    });
    return { status: res.status, data: await res.json() };
  } catch { return { status: 0 }; }
}

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║      🔍 KIỂM TRA TOÀN DIỆN DỮ LIỆU 5 ROLES - COFFEE SHOP          ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

try {
  // ═══════════════════════════════════════════════════════════════
  console.log('📊 PHẦN 1: KIỂM TRA DỮ LIỆU DATABASE\n');

  // 1.1 Users
  console.log('👥 1.1 NGƯỜI DÙNG:');
  const users = await pool.query(`
    SELECT u.user_id, u.username, u.full_name, STRING_AGG(r.role_name, ', ') as roles
    FROM users u LEFT JOIN user_roles ur ON u.user_id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.role_id GROUP BY u.user_id ORDER BY u.user_id
  `);
  for (const u of users.rows) console.log(`  - ${u.username}: ${u.full_name} [${u.roles || 'N/A'}]`);
  log('database', 'Có users', users.rows.length > 0, `${users.rows.length} users`);

  // 1.2 Roles
  console.log('\n🔑 1.2 VAI TRÒ:');
  const roles = await pool.query(`SELECT role_name, COUNT(ur.user_id) as cnt FROM roles r LEFT JOIN user_roles ur ON r.role_id = ur.role_id GROUP BY r.role_id`);
  for (const r of roles.rows) console.log(`  - ${r.role_name}: ${r.cnt} users`);
  const required = ['admin', 'manager', 'cashier', 'kitchen', 'waiter'];
  const existing = roles.rows.map(r => r.role_name);
  log('database', 'Đủ 5 roles chính', required.every(r => existing.includes(r)), existing.join(', '));

  // 1.3 Categories
  console.log('\n📂 1.3 DANH MỤC:');
  const cats = await pool.query(`SELECT lm.ten, COUNT(m.id) as cnt FROM loai_mon lm LEFT JOIN mon m ON lm.id = m.loai_id GROUP BY lm.id`);
  for (const c of cats.rows) console.log(`  - ${c.ten}: ${c.cnt} món`);
  log('database', 'Có danh mục', cats.rows.length > 0, `${cats.rows.length} danh mục`);

  // 1.4 Products
  console.log('\n☕ 1.4 SẢN PHẨM:');
  const prods = await pool.query(`SELECT ten, gia_mac_dinh, active FROM mon ORDER BY ten LIMIT 10`);
  for (const p of prods.rows) console.log(`  - ${p.active ? '✓' : '✗'} ${p.ten}: ${Number(p.gia_mac_dinh).toLocaleString()}đ`);
  const totalProds = await pool.query('SELECT COUNT(*) FROM mon');
  log('database', 'Có sản phẩm', Number(totalProds.rows[0].count) > 0, `${totalProds.rows[0].count} món`);

  // 1.5 Tables
  console.log('\n🪑 1.5 BÀN:');
  const tables = await pool.query(`SELECT kv.ten, COUNT(b.id) as cnt FROM ban b JOIN khu_vuc kv ON b.khu_vuc_id = kv.id GROUP BY kv.id`);
  for (const t of tables.rows) console.log(`  - ${t.ten}: ${t.cnt} bàn`);
  const totalTables = await pool.query('SELECT COUNT(*) FROM ban');
  log('database', 'Có bàn', Number(totalTables.rows[0].count) > 0, `${totalTables.rows[0].count} bàn`);

  // 1.6 Orders
  console.log('\n📦 1.6 ĐƠN HÀNG:');
  const orders = await pool.query(`SELECT order_type, trang_thai, COUNT(*) as cnt FROM don_hang GROUP BY order_type, trang_thai`);
  for (const o of orders.rows) console.log(`  - ${o.order_type}/${o.trang_thai}: ${o.cnt} đơn`);
  const totalOrders = await pool.query('SELECT COUNT(*) FROM don_hang');
  log('database', 'Có đơn hàng', Number(totalOrders.rows[0].count) > 0, `${totalOrders.rows[0].count} đơn`);

  // 1.7 Shifts
  console.log('\n⏰ 1.7 CA LÀM:');
  const shifts = await pool.query(`SELECT id, status, opening_cash FROM ca_lam ORDER BY started_at DESC LIMIT 3`);
  for (const s of shifts.rows) console.log(`  - Ca #${s.id}: ${s.status} (${Number(s.opening_cash || 0).toLocaleString()}đ)`);
  log('database', 'Có ca làm', shifts.rows.length > 0, `${shifts.rows.length} ca gần nhất`);

  // 1.8 Customers
  console.log('\n👤 1.8 KHÁCH HÀNG:');
  const cust = await pool.query(`SELECT ten, so_dien_thoai as sdt FROM khach_hang LIMIT 5`);
  for (const c of cust.rows) console.log(`  - ${c.ten} (${c.sdt || 'N/A'})`);
  const totalCust = await pool.query('SELECT COUNT(*) FROM khach_hang');
  log('database', 'Có khách hàng', Number(totalCust.rows[0].count) > 0, `${totalCust.rows[0].count} khách`);

  // ═══════════════════════════════════════════════════════════════
  console.log('\n🔐 PHẦN 2: KIỂM TRA ĐĂNG NHẬP 5 ROLES\n');
  const tokens = {};
  for (const [role, creds] of Object.entries(ROLES)) {
    const result = await login(role);
    if (result) {
      tokens[role] = result.token;
      log(role, `Login ${role}`, true, `${creds.username} => ${result.user.roles?.join(', ') || 'OK'}`);
    } else {
      log(role, `Login ${role}`, false, creds.username);
    }
  }

  // ═══════════════════════════════════════════════════════════════
  console.log('\n🔧 PHẦN 3: KIỂM TRA API THEO ROLE\n');

  // ADMIN - routes: /admin/*
  if (tokens.admin) {
    console.log('👑 ADMIN:');
    const t = tokens.admin;
    log('admin', '/admin/health', (await api(t, '/admin/health')).status === 200);
    log('admin', '/admin/settings', (await api(t, '/admin/settings')).status === 200);
    log('admin', '/admin/logs', (await api(t, '/admin/logs')).status === 200);
  }

  // MANAGER - routes: /menu/*, /inventory/*, /analytics/*
  if (tokens.manager) {
    console.log('\n📊 MANAGER:');
    const t = tokens.manager;
    log('manager', '/menu/categories', (await api(t, '/menu/categories')).status === 200);
    log('manager', '/inventory/ingredients', (await api(t, '/inventory/ingredients')).status === 200);
    log('manager', '/inventory/warnings', (await api(t, '/inventory/warnings')).status === 200);
    log('manager', '/analytics/shift-stats', (await api(t, '/analytics/shift-stats')).status === 200);
    log('manager', '/analytics/overview', (await api(t, '/analytics/overview')).status === 200);
    log('manager', '/promotions', (await api(t, '/promotions')).status === 200);
  }

  // CASHIER - routes: /pos/*, /shifts/*
  if (tokens.cashier) {
    console.log('\n💰 CASHIER:');
    const t = tokens.cashier;
    log('cashier', '/pos/tables', (await api(t, '/pos/tables')).status === 200);
    log('cashier', '/pos/menu/categories', (await api(t, '/pos/menu/categories')).status === 200);
    log('cashier', '/pos/menu/categories/0/items', (await api(t, '/pos/menu/categories/0/items')).status === 200);
    log('cashier', '/shifts/current', (await api(t, '/shifts/current')).status === 200);
    log('cashier', '/pos/takeaway-orders', (await api(t, '/pos/takeaway-orders')).status === 200);
    log('cashier', '/pos/delivery-orders', (await api(t, '/pos/delivery-orders')).status === 200);
  }

  // KITCHEN - routes: /kitchen/*
  if (tokens.kitchen) {
    console.log('\n🍹 KITCHEN:');
    const t = tokens.kitchen;
    log('kitchen', '/kitchen/queue', (await api(t, '/kitchen/queue')).status === 200);
    log('kitchen', '/kitchen/completed', (await api(t, '/kitchen/completed')).status === 200);
  }

  // WAITER - routes: /pos/delivery/*
  if (tokens.waiter) {
    console.log('\n🛵 WAITER:');
    const t = tokens.waiter;
    log('waiter', '/pos/delivery/my-assigned', (await api(t, '/pos/delivery/my-assigned')).status === 200);
    log('waiter', '/pos/tables', (await api(t, '/pos/tables')).status === 200);
    log('waiter', '/pos/delivery-orders', (await api(t, '/pos/delivery-orders')).status === 200);
  }

  // ═══════════════════════════════════════════════════════════════
  console.log('\n📈 TÓM TẮT KẾT QUẢ\n');
  let totalPass = 0, totalFail = 0;
  for (const [cat, tests] of Object.entries(results)) {
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    totalPass += passed; totalFail += failed;
    if (tests.length > 0) {
      console.log(`  ${failed === 0 ? '✅' : '⚠️'} ${cat.toUpperCase()}: ${passed}/${tests.length}`);
      tests.filter(t => !t.passed).forEach(t => console.log(`     ❌ ${t.name} ${t.details ? `- ${t.details}` : ''}`));
    }
  }
  console.log(`\n${'─'.repeat(50)}`);
  console.log(totalFail === 0 ? `🎉 TẤT CẢ ${totalPass} TESTS PASS!` : `📊 ${totalPass} passed, ${totalFail} failed`);
  console.log('─'.repeat(50) + '\n');

} catch (error) {
  console.error('❌ Error:', error.message);
} finally {
  await pool.end();
}
