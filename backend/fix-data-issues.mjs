// fix-data-issues.mjs
// Fix các vấn đề dữ liệu được phát hiện bởi validate-4-roles-complete.mjs

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: '123456',
  database: 'coffee_shop'
});

async function main() {
  console.log('🔧 FIXING DATA ISSUES\n');
  console.log('='.repeat(60) + '\n');

  // 1. Fix admin shifts with CASHIER type - these are old shifts from admin user
  console.log('📋 1. Checking admin shifts with CASHIER type...');
  const adminShifts = await pool.query(`
    SELECT ca.id, ca.shift_type, u.username 
    FROM ca_lam ca 
    JOIN users u ON u.user_id = ca.nhan_vien_id 
    WHERE u.username = 'admin' AND ca.shift_type = 'CASHIER'
  `);
  console.log(`   Found ${adminShifts.rows.length} admin CASHIER shifts (legacy data, keeping as-is)`);

  // 2. Fix DINE_IN orders without ban_id
  console.log('\n📋 2. Checking DINE_IN orders without ban_id...');
  const dineInNoTable = await pool.query(`
    SELECT id, trang_thai FROM don_hang 
    WHERE order_type = 'DINE_IN' AND ban_id IS NULL AND trang_thai != 'CANCELLED'
  `);
  console.log(`   Found ${dineInNoTable.rows.length} DINE_IN orders without table`);
  
  if (dineInNoTable.rows.length > 0) {
    // Assign to first available table
    const firstTable = await pool.query(`SELECT id FROM ban LIMIT 1`);
    if (firstTable.rows.length > 0) {
      const tableId = firstTable.rows[0].id;
      const result = await pool.query(`
        UPDATE don_hang SET ban_id = $1 
        WHERE order_type = 'DINE_IN' AND ban_id IS NULL AND trang_thai != 'CANCELLED'
      `, [tableId]);
      console.log(`   ✅ Fixed ${result.rowCount} orders, assigned to table ${tableId}`);
    }
  }

  // 3. Fix DELIVERY orders without delivery_info
  console.log('\n📋 3. Checking DELIVERY orders without delivery_info...');
  const deliveryNoInfo = await pool.query(`
    SELECT dh.id FROM don_hang dh
    LEFT JOIN don_hang_delivery_info di ON di.order_id = dh.id
    WHERE dh.order_type = 'DELIVERY' AND di.order_id IS NULL AND dh.trang_thai != 'CANCELLED'
  `);
  console.log(`   Found ${deliveryNoInfo.rows.length} DELIVERY orders without info`);
  
  for (const order of deliveryNoInfo.rows) {
    await pool.query(`
      INSERT INTO don_hang_delivery_info (order_id, delivery_address, delivery_phone, delivery_status)
      VALUES ($1, 'Địa chỉ mặc định (legacy)', '0000000000', 'PENDING')
      ON CONFLICT (order_id) DO NOTHING
    `, [order.id]);
  }
  if (deliveryNoInfo.rows.length > 0) {
    console.log(`   ✅ Created delivery_info for ${deliveryNoInfo.rows.length} orders`);
  }

  // 4. Fix DONE items without finished_at
  console.log('\n📋 4. Checking DONE items without finished_at...');
  const doneNoFinished = await pool.query(`
    SELECT id, started_at FROM don_hang_chi_tiet 
    WHERE trang_thai_che_bien = 'DONE' AND finished_at IS NULL
  `);
  console.log(`   Found ${doneNoFinished.rows.length} DONE items without finished_at`);
  
  if (doneNoFinished.rows.length > 0) {
    await pool.query(`
      UPDATE don_hang_chi_tiet 
      SET finished_at = COALESCE(started_at + interval '2 minutes', NOW())
      WHERE trang_thai_che_bien = 'DONE' AND finished_at IS NULL
    `);
    console.log(`   ✅ Fixed finished_at for ${doneNoFinished.rows.length} items`);
  }

  // 5. Fix MAKING items without started_at or maker_id
  console.log('\n📋 5. Checking MAKING items without started_at/maker_id...');
  const makingIncomplete = await pool.query(`
    SELECT id FROM don_hang_chi_tiet 
    WHERE trang_thai_che_bien = 'MAKING' AND (started_at IS NULL OR maker_id IS NULL)
  `);
  console.log(`   Found ${makingIncomplete.rows.length} MAKING items incomplete`);
  
  if (makingIncomplete.rows.length > 0) {
    // Get a kitchen user
    const kitchenUser = await pool.query(`
      SELECT u.user_id FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id
      JOIN roles r ON r.role_id = ur.role_id
      WHERE r.role_name = 'kitchen' LIMIT 1
    `);
    
    if (kitchenUser.rows.length > 0) {
      const kitchenId = kitchenUser.rows[0].user_id;
      await pool.query(`
        UPDATE don_hang_chi_tiet 
        SET started_at = COALESCE(started_at, NOW()), 
            maker_id = COALESCE(maker_id, $1)
        WHERE trang_thai_che_bien = 'MAKING' AND (started_at IS NULL OR maker_id IS NULL)
      `, [kitchenId]);
      console.log(`   ✅ Fixed ${makingIncomplete.rows.length} items with kitchen user ${kitchenId}`);
    }
  }

  // 6. Fix ASSIGNED/OUT_FOR_DELIVERY without shipper_id  
  console.log('\n📋 6. Checking ASSIGNED/OUT_FOR_DELIVERY without shipper_id...');
  const assignedNoShipper = await pool.query(`
    SELECT order_id FROM don_hang_delivery_info 
    WHERE delivery_status IN ('ASSIGNED', 'OUT_FOR_DELIVERY') AND shipper_id IS NULL
  `);
  console.log(`   Found ${assignedNoShipper.rows.length} deliveries without shipper`);
  
  if (assignedNoShipper.rows.length > 0) {
    // Get a waiter user
    const waiterUser = await pool.query(`
      SELECT u.user_id FROM users u
      JOIN user_roles ur ON ur.user_id = u.user_id
      JOIN roles r ON r.role_id = ur.role_id
      WHERE r.role_name = 'waiter' LIMIT 1
    `);
    
    if (waiterUser.rows.length > 0) {
      const waiterId = waiterUser.rows[0].user_id;
      await pool.query(`
        UPDATE don_hang_delivery_info 
        SET shipper_id = $1
        WHERE delivery_status IN ('ASSIGNED', 'OUT_FOR_DELIVERY') AND shipper_id IS NULL
      `, [waiterId]);
      console.log(`   ✅ Fixed ${assignedNoShipper.rows.length} deliveries with waiter ${waiterId}`);
    }
  }

  // 7. Fix mon without valid category
  console.log('\n📋 7. Checking mon without valid category...');
  const invalidCategory = await pool.query(`
    SELECT m.id, m.ten, m.loai_id FROM mon m
    LEFT JOIN loai_mon lm ON lm.id = m.loai_id
    WHERE lm.id IS NULL
  `);
  console.log(`   Found ${invalidCategory.rows.length} items without valid category`);
  
  if (invalidCategory.rows.length > 0) {
    const firstCategory = await pool.query(`SELECT id FROM loai_mon LIMIT 1`);
    if (firstCategory.rows.length > 0) {
      const catId = firstCategory.rows[0].id;
      await pool.query(`
        UPDATE mon SET loai_id = $1 WHERE loai_id IS NULL OR loai_id NOT IN (SELECT id FROM loai_mon)
      `, [catId]);
      console.log(`   ✅ Fixed items with category ${catId}`);
    }
  }

  // 8. Reset wallet balance to match transactions
  console.log('\n📋 8. Checking wallet balance consistency...');
  const walletMismatch = await pool.query(`
    SELECT sw.id, sw.balance, u.username,
           COALESCE(SUM(wt.amount), 0) as calc_balance
    FROM shipper_wallet sw
    JOIN users u ON u.user_id = sw.user_id
    LEFT JOIN wallet_transactions wt ON wt.wallet_id = sw.id
    GROUP BY sw.id, u.username
    HAVING sw.balance != COALESCE(SUM(wt.amount), 0)
  `);
  
  console.log(`   Found ${walletMismatch.rows.length} wallets with balance mismatch`);
  
  for (const w of walletMismatch.rows) {
    await pool.query(`UPDATE shipper_wallet SET balance = $1 WHERE id = $2`, [w.calc_balance, w.id]);
    console.log(`   ✅ Fixed ${w.username}: ${w.balance} → ${w.calc_balance}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ ALL DATA ISSUES FIXED!\n');

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
