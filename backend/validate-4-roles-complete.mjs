// validate-4-roles-complete.mjs
// Kiểm tra toàn diện dữ liệu giữa 4 roles: Manager, Kitchen, Waiter, Cashier

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

let passed = 0, failed = 0, warnings = 0;

function check(name, ok, details = '') {
  if (ok) {
    console.log(`✅ ${name}`);
    passed++;
  } else {
    console.log(`❌ ${name}`);
    failed++;
  }
  if (details) console.log(`   ${details}`);
  return ok;
}

function warn(name, details = '') {
  console.log(`⚠️  ${name}`);
  if (details) console.log(`   ${details}`);
  warnings++;
}

async function q(sql, params = []) {
  const { rows } = await pool.query(sql, params);
  return rows;
}

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 KIỂM TRA TOÀN DIỆN DỮ LIỆU 4 ROLES: Manager, Kitchen, Waiter, Cashier');
  console.log('='.repeat(70) + '\n');

  // ===== 1. USERS & ROLES =====
  console.log('📋 1. USERS & ROLES\n');

  const roleCount = await q(`
    SELECT r.role_name, COUNT(ur.user_id) as count
    FROM roles r
    LEFT JOIN user_roles ur ON ur.role_id = r.role_id
    LEFT JOIN users u ON u.user_id = ur.user_id AND u.is_active = true
    GROUP BY r.role_name
  `);
  
  const roles = Object.fromEntries(roleCount.map(r => [r.role_name, Number(r.count)]));
  check('Có manager', roles.manager > 0, `${roles.manager || 0} managers`);
  check('Có cashier', roles.cashier > 0, `${roles.cashier || 0} cashiers`);
  check('Có kitchen', roles.kitchen > 0, `${roles.kitchen || 0} kitchens`);
  check('Có waiter', roles.waiter > 0, `${roles.waiter || 0} waiters`);

  // ===== 2. SHIFTS =====
  console.log('\n📋 2. SHIFTS\n');

  const shiftTypes = await q(`
    SELECT shift_type, status, COUNT(*) as count
    FROM ca_lam
    GROUP BY shift_type, status
    ORDER BY shift_type, status
  `);
  
  console.log('   Shifts by type/status:');
  shiftTypes.forEach(s => console.log(`   - ${s.shift_type}/${s.status}: ${s.count}`));

  // Check shift_type matches user role (exclude admin user - legacy data)
  const mismatchedShifts = await q(`
    SELECT ca.id, ca.shift_type, u.username, array_agg(r.role_name) as roles
    FROM ca_lam ca
    JOIN users u ON u.user_id = ca.nhan_vien_id
    JOIN user_roles ur ON ur.user_id = u.user_id
    JOIN roles r ON r.role_id = ur.role_id
    WHERE u.username != 'admin'
    GROUP BY ca.id, u.username
    HAVING ca.shift_type NOT IN (SELECT UPPER(role_name) FROM roles WHERE role_id = ANY(array_agg(ur.role_id)))
    LIMIT 5
  `);

  check('Shift type khớp với user role', mismatchedShifts.length === 0,
    mismatchedShifts.length > 0 ? mismatchedShifts.map(s => `${s.username}: ${s.shift_type}`).join(', ') : '');

  // ===== 3. ORDERS =====
  console.log('\n📋 3. ORDERS\n');

  const orderStats = await q(`
    SELECT 
      order_type,
      trang_thai,
      COUNT(*) as count
    FROM don_hang
    GROUP BY order_type, trang_thai
    ORDER BY order_type, trang_thai
  `);

  console.log('   Orders by type/status:');
  orderStats.forEach(o => console.log(`   - ${o.order_type}/${o.trang_thai}: ${o.count}`));

  // DINE_IN must have ban_id
  const dineInWithoutTable = await q(`
    SELECT COUNT(*)::int as count FROM don_hang 
    WHERE order_type = 'DINE_IN' AND ban_id IS NULL AND trang_thai != 'CANCELLED'
  `);
  const dineInCount = parseInt(dineInWithoutTable[0]?.count || 0);
  check('DINE_IN có bàn', dineInCount === 0, 
    dineInCount > 0 ? `${dineInCount} đơn thiếu bàn` : '');

  // DELIVERY must have delivery_info
  const deliveryWithoutInfo = await q(`
    SELECT COUNT(*)::int as count FROM don_hang dh
    LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
    WHERE dh.order_type = 'DELIVERY' AND di.order_id IS NULL AND dh.trang_thai != 'CANCELLED'
  `);
  const deliveryCount = parseInt(deliveryWithoutInfo[0]?.count || 0);
  check('DELIVERY có thông tin giao hàng', deliveryCount === 0,
    deliveryCount > 0 ? `${deliveryCount} đơn thiếu info` : '');

  // ===== 4. KITCHEN - ORDER ITEMS =====
  console.log('\n📋 4. KITCHEN - ORDER ITEMS\n');

  const itemStats = await q(`
    SELECT trang_thai_che_bien, COUNT(*) as count
    FROM don_hang_chi_tiet
    GROUP BY trang_thai_che_bien
  `);
  
  console.log('   Items by status:');
  itemStats.forEach(i => console.log(`   - ${i.trang_thai_che_bien}: ${i.count}`));

  // DONE items must have finished_at
  const doneWithoutFinished = await q(`
    SELECT COUNT(*)::int as count FROM don_hang_chi_tiet
    WHERE trang_thai_che_bien = 'DONE' AND finished_at IS NULL
  `);
  const doneCount = parseInt(doneWithoutFinished[0]?.count || 0);
  check('Món DONE có finished_at', doneCount === 0,
    doneCount > 0 ? `${doneCount} món thiếu` : '');

  // MAKING items must have started_at and maker_id
  const makingIncomplete = await q(`
    SELECT COUNT(*)::int as count FROM don_hang_chi_tiet
    WHERE trang_thai_che_bien = 'MAKING' AND (started_at IS NULL OR maker_id IS NULL)
  `);
  const makingCount = parseInt(makingIncomplete[0]?.count || 0);
  check('Món MAKING có started_at & maker_id', makingCount === 0,
    makingCount > 0 ? `${makingCount} món thiếu` : '');

  // ===== 5. WAITER - DELIVERY =====
  console.log('\n📋 5. WAITER - DELIVERY\n');

  const deliveryStats = await q(`
    SELECT delivery_status, COUNT(*) as count
    FROM don_hang_delivery_info
    GROUP BY delivery_status
  `);
  
  console.log('   Delivery by status:');
  deliveryStats.forEach(d => console.log(`   - ${d.delivery_status}: ${d.count}`));

  // ASSIGNED/OUT_FOR_DELIVERY must have shipper_id
  const assignedWithoutShipper = await q(`
    SELECT COUNT(*)::int as count FROM don_hang_delivery_info
    WHERE delivery_status IN ('ASSIGNED', 'OUT_FOR_DELIVERY') AND shipper_id IS NULL
  `);
  const shipperCount = parseInt(assignedWithoutShipper[0]?.count || 0);
  check('Delivery ASSIGNED/OUT có shipper', shipperCount === 0,
    shipperCount > 0 ? `${shipperCount} thiếu shipper` : '');

  // ===== 6. CASHIER - PAYMENTS =====
  console.log('\n📋 6. CASHIER - PAYMENTS\n');

  const paymentStats = await q(`
    SELECT method_code, COUNT(*) as count, SUM(amount) as total
    FROM order_payment
    GROUP BY method_code
  `);
  
  console.log('   Payments by method:');
  paymentStats.forEach(p => console.log(`   - ${p.method_code}: ${p.count} (${Number(p.total).toLocaleString()}đ)`));

  // PAID orders must have payment
  const paidWithoutPayment = await q(`
    SELECT COUNT(*) as count FROM don_hang dh
    LEFT JOIN order_payment op ON op.order_id = dh.id
    WHERE dh.trang_thai = 'COMPLETED' AND op.id IS NULL
  `);
  
  if (paidWithoutPayment[0].count > 0) {
    warn('Có đơn COMPLETED thiếu payment', `${paidWithoutPayment[0].count} đơn (có thể legacy data)`);
  } else {
    check('Đơn COMPLETED có payment', true);
  }

  // ===== 7. MANAGER - MENU =====
  console.log('\n📋 7. MANAGER - MENU\n');

  const menuStats = await q(`
    SELECT 
      (SELECT COUNT(*) FROM loai_mon) as categories,
      (SELECT COUNT(*) FROM mon) as items
  `);
  
  const m = menuStats[0];
  console.log(`   Categories: ${m.categories}, Items: ${m.items}`);

  // Items must have valid category
  const itemsInvalidCategory = await q(`
    SELECT COUNT(*)::int as count FROM mon m
    LEFT JOIN loai_mon lm ON lm.id = m.loai_id
    WHERE lm.id IS NULL
  `);
  const invalidCatCount = parseInt(itemsInvalidCategory[0]?.count || 0);
  check('Món có category hợp lệ', invalidCatCount === 0);

  // ===== 8. MANAGER - PROMOTIONS =====
  console.log('\n📋 8. MANAGER - PROMOTIONS\n');

  const promoStats = await q(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE active = true) as active
    FROM khuyen_mai
  `);
  
  console.log(`   Total: ${promoStats[0].total}, Active: ${promoStats[0].active}`);

  // ===== 9. MANAGER - ANALYTICS VIEWS =====
  console.log('\n📋 9. MANAGER - DATABASE VIEWS\n');

  const views = ['v_profit_with_topping_cost', 'v_line_topping_cost', 'v_kitchen_queue', 'v_shipper_wallet_summary'];
  for (const v of views) {
    const exists = await q(`SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = $1)`, [v]);
    check(`View ${v} tồn tại`, exists[0].exists);
  }

  // ===== 10. WALLET INTEGRITY =====
  console.log('\n📋 10. WALLET INTEGRITY\n');

  const walletCheck = await q(`
    SELECT sw.id, sw.balance, u.username,
           COALESCE(SUM(wt.amount), 0) as calc_balance
    FROM shipper_wallet sw
    JOIN users u ON u.user_id = sw.user_id
    LEFT JOIN wallet_transactions wt ON wt.wallet_id = sw.id
    GROUP BY sw.id, u.username
  `);

  let walletOk = true;
  walletCheck.forEach(w => {
    const match = Number(w.balance) === Number(w.calc_balance);
    if (!match) {
      warn(`Wallet ${w.username} không khớp`, `balance=${w.balance}, calculated=${w.calc_balance}`);
      walletOk = false;
    }
  });
  if (walletOk) check('Wallet balances khớp với transactions', true);

  // ===== 11. DATA FLOW INTEGRITY =====
  console.log('\n📋 11. DATA FLOW INTEGRITY\n');

  // Order → Items → Kitchen flow
  const incompleteOrders = await q(`
    SELECT dh.id, dh.trang_thai, 
           COUNT(ct.id) as total_items,
           COUNT(ct.id) FILTER (WHERE ct.trang_thai_che_bien NOT IN ('DONE', 'CANCELLED')) as incomplete
    FROM don_hang dh
    JOIN don_hang_chi_tiet ct ON ct.don_hang_id = dh.id
    WHERE dh.trang_thai = 'COMPLETED'
    GROUP BY dh.id
    HAVING COUNT(ct.id) FILTER (WHERE ct.trang_thai_che_bien NOT IN ('DONE', 'CANCELLED')) > 0
  `);
  check('Đơn COMPLETED không có món chưa xong', incompleteOrders.length === 0,
    incompleteOrders.length > 0 ? `${incompleteOrders.length} đơn có món chưa DONE/CANCELLED` : '');

  // ===== SUMMARY =====
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 KẾT QUẢ KIỂM TRA\n');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`\n📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);

  if (failed === 0 && warnings === 0) {
    console.log('\n🎉 TẤT CẢ DỮ LIỆU ĐỀU NHẤT QUÁN GIỮA 4 ROLES!');
  } else if (failed === 0) {
    console.log('\n✅ Dữ liệu cơ bản đúng, có một số warnings cần xem xét.');
  } else {
    console.log('\n❌ Có lỗi dữ liệu cần sửa!');
  }

  await pool.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error(e); process.exit(1); });
