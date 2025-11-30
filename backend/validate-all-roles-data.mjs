// Kiểm tra toàn diện dữ liệu liên quan giữa 3 vai trò: Kitchen, Waiter, Cashier
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  host: 'localhost',
  database: 'coffee_shop',
  user: 'postgres',
  password: '123456',
  port: 5432
});

const errors = [];
const warnings = [];

async function check(desc, query, validator, isWarning = false) {
  try {
    const r = await pool.query(query);
    const issue = validator(r.rows);
    if (issue) {
      if (isWarning) {
        warnings.push(desc);
        console.log(`⚠️  ${desc}: ${issue}`);
      } else {
        errors.push(desc);
        console.log(`❌ ${desc}: ${issue}`);
      }
    } else {
      console.log(`✅ ${desc}`);
    }
  } catch (err) {
    errors.push(desc);
    console.log(`❌ ${desc}: ${err.message}`);
  }
}

console.log('\n' + '='.repeat(70));
console.log('📊 KIỂM TRA TOÀN DIỆN DỮ LIỆU 3 VAI TRÒ: KITCHEN, WAITER, CASHIER');
console.log('='.repeat(70) + '\n');

// ========== 1. KIỂM TRA CA LÀM VIỆC (SHIFTS) ==========
console.log('📋 1. CA LÀM VIỆC (SHIFTS)\n');

await check(
  'Constraint shift_type có WAITER, CASHIER, KITCHEN',
  `SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'ca_lam_shift_type_check'`,
  rows => {
    if (!rows[0]) return 'Không tìm thấy constraint';
    const def = rows[0].def;
    if (!def.includes('WAITER')) return 'Thiếu WAITER';
    if (!def.includes('CASHIER')) return 'Thiếu CASHIER';
    if (!def.includes('KITCHEN')) return 'Thiếu KITCHEN';
    return null;
  }
);

await check(
  'Waiter users có shift_type = WAITER',
  `SELECT cl.id, cl.shift_type, u.username 
   FROM ca_lam cl 
   JOIN users u ON cl.nhan_vien_id = u.user_id 
   JOIN user_roles ur ON u.user_id = ur.user_id
   JOIN roles ro ON ur.role_id = ro.role_id
   WHERE cl.status = 'OPEN' AND ro.role_name = 'waiter' 
   AND NOT EXISTS (SELECT 1 FROM user_roles ur2 JOIN roles r2 ON ur2.role_id = r2.role_id WHERE ur2.user_id = u.user_id AND r2.role_name IN ('cashier', 'manager', 'admin'))
   AND cl.shift_type != 'WAITER'`,
  rows => rows.length > 0 ? `${rows.length} ca sai: ${rows.map(r => r.username).join(', ')}` : null
);

await check(
  'Cashier users có shift_type = CASHIER',
  `SELECT cl.id, cl.shift_type, u.username 
   FROM ca_lam cl 
   JOIN users u ON cl.nhan_vien_id = u.user_id 
   JOIN user_roles ur ON u.user_id = ur.user_id
   JOIN roles ro ON ur.role_id = ro.role_id
   WHERE cl.status = 'OPEN' AND ro.role_name = 'cashier' AND cl.shift_type != 'CASHIER'`,
  rows => rows.length > 0 ? `${rows.length} ca sai` : null
);

await check(
  'Kitchen users có shift_type = KITCHEN',
  `SELECT cl.id, cl.shift_type, u.username 
   FROM ca_lam cl 
   JOIN users u ON cl.nhan_vien_id = u.user_id 
   JOIN user_roles ur ON u.user_id = ur.user_id
   JOIN roles ro ON ur.role_id = ro.role_id
   WHERE cl.status = 'OPEN' AND ro.role_name = 'kitchen' AND cl.shift_type != 'KITCHEN'`,
  rows => rows.length > 0 ? `${rows.length} ca sai` : null
);

await check(
  'Mỗi nhân viên chỉ có 1 ca OPEN',
  `SELECT nhan_vien_id, COUNT(*) as cnt FROM ca_lam WHERE status = 'OPEN' GROUP BY nhan_vien_id HAVING COUNT(*) > 1`,
  rows => rows.length > 0 ? `${rows.length} nhân viên có nhiều ca OPEN` : null
);

// ========== 2. KIỂM TRA ĐƠN HÀNG ==========
console.log('\n📋 2. ĐƠN HÀNG\n');

await check(
  'Đơn DINE_IN phải có bàn',
  `SELECT id FROM don_hang WHERE order_type = 'DINE_IN' AND ban_id IS NULL AND trang_thai NOT IN ('HUY', 'CANCELLED')`,
  rows => rows.length > 0 ? `${rows.length} đơn thiếu bàn` : null
);

await check(
  'Đơn DELIVERY có thông tin giao hàng',
  `SELECT dh.id FROM don_hang dh 
   LEFT JOIN don_hang_delivery_info di ON dh.id = di.order_id 
   WHERE dh.order_type = 'DELIVERY' AND dh.trang_thai IN ('COMPLETED', 'DELIVERED', 'PAID') AND di.order_id IS NULL`,
  rows => rows.length > 0 ? `${rows.length} đơn DELIVERY thiếu info` : null,
  true
);

await check(
  'Đơn hàng có ít nhất 1 món',
  `SELECT dh.id FROM don_hang dh 
   LEFT JOIN don_hang_chi_tiet ct ON dh.id = ct.don_hang_id 
   WHERE ct.id IS NULL AND dh.trang_thai NOT IN ('HUY', 'CANCELLED', 'OPEN')`,
  rows => rows.length > 0 ? `${rows.length} đơn không có món` : null,
  true
);

// ========== 3. KIỂM TRA LIÊN KẾT CASHIER - ORDERS ==========
console.log('\n📋 3. LIÊN KẾT CASHIER - ORDERS\n');

await check(
  'Đơn hoàn thành có ca_lam_id',
  `SELECT id FROM don_hang WHERE trang_thai IN ('COMPLETED', 'PAID') AND ca_lam_id IS NULL`,
  rows => rows.length > 0 ? `${rows.length} đơn thiếu ca_lam_id` : null,
  true
);

await check(
  'Đơn có nhan_vien_id hợp lệ',
  `SELECT dh.id FROM don_hang dh 
   LEFT JOIN users u ON dh.nhan_vien_id = u.user_id 
   WHERE dh.nhan_vien_id IS NOT NULL AND u.user_id IS NULL`,
  rows => rows.length > 0 ? `${rows.length} đơn có nhan_vien_id không tồn tại` : null
);

// ========== 4. KIỂM TRA LIÊN KẾT WAITER - DELIVERY ==========
console.log('\n📋 4. LIÊN KẾT WAITER - DELIVERY\n');

await check(
  'Đơn DELIVERY có shipper_id hợp lệ',
  `SELECT di.order_id FROM don_hang_delivery_info di 
   LEFT JOIN users u ON di.shipper_id = u.user_id 
   WHERE di.shipper_id IS NOT NULL AND u.user_id IS NULL`,
  rows => rows.length > 0 ? `${rows.length} đơn có shipper_id không hợp lệ` : null
);

await check(
  'Shipper wallet view tồn tại và hoạt động',
  `SELECT COUNT(*) as cnt FROM v_shipper_wallet_summary`,
  rows => rows[0].cnt === undefined ? 'View không tồn tại' : null
);

await check(
  'Balance trong ví >= hạn mức cho phép',
  `SELECT user_id, balance FROM v_shipper_wallet_summary WHERE balance < -500000`,
  rows => rows.length > 0 ? `${rows.length} ví vượt hạn mức` : null
);

// ========== 5. KIỂM TRA LIÊN KẾT KITCHEN - ORDER ITEMS ==========
console.log('\n📋 5. LIÊN KẾT KITCHEN - ORDER ITEMS\n');

await check(
  'Món DONE có finished_at',
  `SELECT id FROM don_hang_chi_tiet WHERE trang_thai_che_bien = 'DONE' AND finished_at IS NULL`,
  rows => rows.length > 0 ? `${rows.length} món DONE thiếu finished_at` : null,
  true
);

await check(
  'Món MAKING có started_at',
  `SELECT id FROM don_hang_chi_tiet WHERE trang_thai_che_bien = 'MAKING' AND started_at IS NULL`,
  rows => rows.length > 0 ? `${rows.length} món MAKING thiếu started_at` : null
);

await check(
  'maker_id tham chiếu user hợp lệ',
  `SELECT ct.id FROM don_hang_chi_tiet ct 
   LEFT JOIN users u ON ct.maker_id = u.user_id 
   WHERE ct.maker_id IS NOT NULL AND u.user_id IS NULL`,
  rows => rows.length > 0 ? `${rows.length} món có maker_id không hợp lệ` : null
);

// ========== 6. KIỂM TRA USERS & ROLES ==========
console.log('\n📋 6. USERS & ROLES\n');

await check(
  'Có user waiter active',
  `SELECT u.user_id FROM users u 
   JOIN user_roles ur ON u.user_id = ur.user_id
   JOIN roles r ON ur.role_id = r.role_id
   WHERE r.role_name = 'waiter' AND u.is_active = true`,
  rows => rows.length === 0 ? 'Không có waiter active' : null
);

await check(
  'Có user cashier active',
  `SELECT u.user_id FROM users u 
   JOIN user_roles ur ON u.user_id = ur.user_id
   JOIN roles r ON ur.role_id = r.role_id
   WHERE r.role_name = 'cashier' AND u.is_active = true`,
  rows => rows.length === 0 ? 'Không có cashier active' : null
);

await check(
  'Có user kitchen active',
  `SELECT u.user_id FROM users u 
   JOIN user_roles ur ON u.user_id = ur.user_id
   JOIN roles r ON ur.role_id = r.role_id
   WHERE r.role_name = 'kitchen' AND u.is_active = true`,
  rows => rows.length === 0 ? 'Không có kitchen active' : null
);

// ========== 7. KIỂM TRA PAYMENT ==========
console.log('\n📋 7. PAYMENT\n');

await check(
  'Đơn PAID có payment record (từ 01/11/2025)',
  `SELECT dh.id FROM don_hang dh 
   LEFT JOIN order_payment op ON dh.id = op.order_id 
   WHERE dh.trang_thai = 'PAID' AND op.id IS NULL AND dh.closed_at >= '2025-11-01'`,
  rows => rows.length > 0 ? `${rows.length} đơn PAID thiếu payment` : null,
  true
);

// ========== 8. THỐNG KÊ TỔNG QUAN ==========
console.log('\n📋 8. THỐNG KÊ TỔNG QUAN\n');

let r = await pool.query(`SELECT status, shift_type, COUNT(*) as cnt FROM ca_lam WHERE status = 'OPEN' GROUP BY status, shift_type`);
console.log('📊 Ca đang mở:');
r.rows.forEach(row => console.log(`   ${row.shift_type}: ${row.cnt}`));

r = await pool.query(`SELECT order_type, trang_thai, COUNT(*) as cnt FROM don_hang GROUP BY order_type, trang_thai ORDER BY order_type, cnt DESC`);
console.log('\n📊 Đơn hàng theo loại:');
let currentType = '';
r.rows.forEach(row => {
  if (row.order_type !== currentType) {
    currentType = row.order_type;
    console.log(`   ${currentType}:`);
  }
  console.log(`      ${row.trang_thai}: ${row.cnt}`);
});

r = await pool.query(`SELECT trang_thai_che_bien, COUNT(*) as cnt FROM don_hang_chi_tiet GROUP BY trang_thai_che_bien ORDER BY cnt DESC`);
console.log('\n📊 Món theo trạng thái:');
r.rows.forEach(row => console.log(`   ${row.trang_thai_che_bien}: ${row.cnt}`));

// ========== SUMMARY ==========
console.log('\n' + '='.repeat(70));
console.log('\n📊 KẾT QUẢ TỔNG HỢP\n');

if (errors.length === 0 && warnings.length === 0) {
  console.log('🎉 HOÀN HẢO! Không có lỗi hay cảnh báo nào.');
} else {
  if (errors.length > 0) {
    console.log(`❌ LỖI: ${errors.length}`);
    errors.forEach((e, i) => console.log(`   ${i+1}. ${e}`));
  }
  if (warnings.length > 0) {
    console.log(`\n⚠️  CẢNH BÁO: ${warnings.length}`);
    warnings.forEach((w, i) => console.log(`   ${i+1}. ${w}`));
  }
}

console.log('\n' + '='.repeat(70) + '\n');

await pool.end();
